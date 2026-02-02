import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  onSnapshot,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type {
  Ticket,
  TicketMessage,
  TicketHistoryEntry,
  TicketAttachment,
  CreateTicketData,
  UpdateTicketData,
  SendMessageData,
  TicketFilters,
  TicketStats,
  MessageSenderType,
} from '../types/ticket';
import {
  generateTicketNumber,
  TicketStatus as TicketStatusEnum,
  TicketHistoryActionType as HistoryActionType,
  MessageSenderType as SenderType,
} from '../types/ticket';

// Collections
const TICKETS_COLLECTION = 'tickets';
const MESSAGES_SUBCOLLECTION = 'messages';
const HISTORY_SUBCOLLECTION = 'history';

// ============================================================================
// NOTIFICATIONS EMAIL
// ============================================================================

/**
 * Types de notifications pour les tickets
 */
type TicketNotificationType =
  | 'new_ticket'
  | 'new_message_to_user'
  | 'new_message_to_admin'
  | 'status_change'
  | 'ticket_created_confirmation';

/**
 * Interface pour les données de notification
 */
interface TicketNotificationData {
  type: TicketNotificationType;
  ticketId: string;
  ticketNumber: string;
  ticketSubject: string;
  ticketType: string;
  ticketPriority: string;
  ticketStatus?: string;
  previousStatus?: string;
  userName: string;
  userEmail: string;
  messageContent?: string;
  senderName?: string;
  adminEmail?: string;
}

/**
 * Envoie une notification email via l'API serverless
 * @param data Données de la notification
 * @returns Résultat de l'envoi (non bloquant)
 */
async function sendTicketNotification(data: TicketNotificationData): Promise<void> {
  try {
    // URL de l'API (relative en dev, absolue en prod)
    const apiUrl = typeof window !== 'undefined'
      ? '/api/tickets/send-notification'
      : (process.env.NEXT_PUBLIC_BASE_URL || 'https://fornap.fr') + '/api/tickets/send-notification';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[Ticket Notification] Erreur HTTP ${response.status}:`, errorData);
    } else {
      const result = await response.json();
      console.log(`[Ticket Notification] ✅ Email ${data.type} envoyé via ${result.provider}`);
    }
  } catch (error) {
    // Log l'erreur mais ne bloque pas l'opération principale
    console.error('[Ticket Notification] Erreur lors de l\'envoi:', error);
  }
}

/**
 * Crée un nouveau ticket de support
 */
export async function createTicket(
  data: CreateTicketData,
  userId: string,
  userEmail: string,
  userName: string
): Promise<Ticket> {
  try {
    const ticketNumber = generateTicketNumber();
    const now = Timestamp.now();

    // Upload des pièces jointes si présentes
    const attachments: TicketAttachment[] = [];
    if (data.attachments && data.attachments.length > 0) {
      for (const file of data.attachments) {
        const attachment = await uploadTicketAttachment(file, 'new-ticket');
        attachments.push(attachment);
      }
    }

    const ticketData: Omit<Ticket, 'id'> = {
      ticketNumber,
      createdBy: userId,
      userEmail,
      userName,
      type: data.type,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      status: TicketStatusEnum.OPEN,
      attachments,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      hasUnreadForUser: false,
      hasUnreadForAdmin: true,
    };

    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    const ticketId = ticketRef.id;

    // Créer l'entrée d'historique pour la création
    await addHistoryEntry(ticketId, {
      actionType: HistoryActionType.CREATED,
      actorId: userId,
      actorName: userName,
      actorType: 'user',
      description: `Ticket créé: ${data.subject}`,
    });

    // Créer un message système pour la création
    await addSystemMessage(ticketId, {
      action: 'ticket_created',
      newValue: data.subject,
    }, userId, userName);

    // Envoyer les notifications email (non bloquant)
    const notificationData = {
      ticketId,
      ticketNumber,
      ticketSubject: data.subject,
      ticketType: data.type,
      ticketPriority: data.priority,
      userName,
      userEmail,
    };

    // Notifier le développeur/admin qu'un nouveau ticket a été créé
    sendTicketNotification({
      ...notificationData,
      type: 'new_ticket' as const,
    });

    // Envoyer une confirmation à l'utilisateur
    sendTicketNotification({
      ...notificationData,
      type: 'ticket_created_confirmation' as const,
    });

    return {
      id: ticketId,
      ...ticketData,
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
}

/**
 * Récupère un ticket par son ID
 */
export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  try {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (ticketDoc.exists()) {
      return {
        id: ticketDoc.id,
        ...ticketDoc.data(),
      } as Ticket;
    }

    return null;
  } catch (error) {
    console.error('Error fetching ticket:', error);
    throw error;
  }
}

/**
 * Récupère les tickets d'un utilisateur
 */
export async function getUserTickets(userId: string): Promise<Ticket[]> {
  try {
    const ticketsRef = collection(db, TICKETS_COLLECTION);
    const q = query(
      ticketsRef,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    throw error;
  }
}

/**
 * Récupère tous les tickets (pour admin)
 */
export async function getAllTickets(filters?: TicketFilters): Promise<Ticket[]> {
  try {
    const ticketsRef = collection(db, TICKETS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    // Appliquer les filtres
    if (filters?.status && filters.status.length > 0) {
      constraints.push(where('status', 'in', filters.status));
    }
    if (filters?.type && filters.type.length > 0) {
      constraints.push(where('type', 'in', filters.type));
    }
    if (filters?.priority && filters.priority.length > 0) {
      constraints.push(where('priority', 'in', filters.priority));
    }
    if (filters?.assignedTo) {
      constraints.push(where('assignedTo', '==', filters.assignedTo));
    }
    if (filters?.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy));
    }
    if (filters?.hasUnread) {
      constraints.push(where('hasUnreadForAdmin', '==', true));
    }

    // Toujours trier par date de création décroissante
    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(ticketsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    let tickets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];

    // Filtre de recherche côté client (Firestore ne supporte pas la recherche full-text)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tickets = tickets.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.description.toLowerCase().includes(searchLower) ||
        ticket.ticketNumber.toLowerCase().includes(searchLower) ||
        ticket.userName.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par date côté client
    if (filters?.dateRange) {
      tickets = tickets.filter(ticket => {
        const ticketDate = ticket.createdAt.toDate();
        return ticketDate >= filters.dateRange!.start && ticketDate <= filters.dateRange!.end;
      });
    }

    return tickets;
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    throw error;
  }
}

/**
 * Met à jour un ticket
 */
export async function updateTicket(
  ticketId: string,
  data: UpdateTicketData,
  actorId: string,
  actorName: string,
  isAdmin: boolean
): Promise<void> {
  try {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      throw new Error('Ticket not found');
    }

    const currentTicket = ticketDoc.data() as Ticket;
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    // Changement de statut
    if (data.status && data.status !== currentTicket.status) {
      updateData.status = data.status;

      // Si résolu ou fermé, ajouter la date de résolution
      if (data.status === TicketStatusEnum.RESOLVED || data.status === TicketStatusEnum.CLOSED) {
        updateData.resolvedAt = Timestamp.now();
        updateData.resolvedBy = actorId;
      }

      // Ajouter à l'historique
      await addHistoryEntry(ticketId, {
        actionType: HistoryActionType.STATUS_CHANGED,
        actorId,
        actorName,
        actorType: isAdmin ? 'admin' : 'user',
        description: `Statut changé de "${currentTicket.status}" à "${data.status}"`,
        previousValue: currentTicket.status,
        newValue: data.status,
      });

      // Message système
      await addSystemMessage(ticketId, {
        action: 'status_change',
        previousValue: currentTicket.status,
        newValue: data.status,
      }, actorId, actorName);

      // Envoyer notification email à l'utilisateur (non bloquant)
      if (isAdmin) {
        sendTicketNotification({
          type: 'status_change',
          ticketId,
          ticketNumber: currentTicket.ticketNumber,
          ticketSubject: currentTicket.subject,
          ticketType: currentTicket.type,
          ticketPriority: currentTicket.priority,
          ticketStatus: data.status,
          previousStatus: currentTicket.status,
          userName: currentTicket.userName,
          userEmail: currentTicket.userEmail,
        });
      }

      // Notifier l'utilisateur si c'est l'admin qui change
      if (isAdmin) {
        updateData.hasUnreadForUser = true;
      }
    }

    // Changement de priorité
    if (data.priority && data.priority !== currentTicket.priority) {
      updateData.priority = data.priority;

      await addHistoryEntry(ticketId, {
        actionType: HistoryActionType.PRIORITY_CHANGED,
        actorId,
        actorName,
        actorType: isAdmin ? 'admin' : 'user',
        description: `Priorité changée de "${currentTicket.priority}" à "${data.priority}"`,
        previousValue: currentTicket.priority,
        newValue: data.priority,
      });

      // Message système
      await addSystemMessage(ticketId, {
        action: 'priority_change',
        previousValue: currentTicket.priority,
        newValue: data.priority,
      }, actorId, actorName);
    }

    // Assignation
    if (data.assignedTo !== undefined) {
      if (data.assignedTo && data.assignedTo !== currentTicket.assignedTo) {
        updateData.assignedTo = data.assignedTo;
        updateData.assignedToName = data.assignedToName;

        await addHistoryEntry(ticketId, {
          actionType: HistoryActionType.ASSIGNED,
          actorId,
          actorName,
          actorType: 'admin',
          description: `Ticket assigné à ${data.assignedToName}`,
          newValue: data.assignedToName,
        });

        // Message système
        await addSystemMessage(ticketId, {
          action: 'assignment',
          newValue: data.assignedToName,
        }, actorId, actorName);
      } else if (!data.assignedTo && currentTicket.assignedTo) {
        updateData.assignedTo = null;
        updateData.assignedToName = null;

        await addHistoryEntry(ticketId, {
          actionType: HistoryActionType.UNASSIGNED,
          actorId,
          actorName,
          actorType: 'admin',
          description: `Ticket désassigné de ${currentTicket.assignedToName}`,
          previousValue: currentTicket.assignedToName,
        });
      }
    }

    // Notes internes
    if (data.internalNotes !== undefined) {
      updateData.internalNotes = data.internalNotes;
    }

    await updateDoc(ticketRef, updateData);
  } catch (error) {
    console.error('Error updating ticket:', error);
    throw error;
  }
}

/**
 * Supprime un ticket
 * - Un utilisateur peut supprimer ses propres tickets
 * - Un développeur peut supprimer n'importe quel ticket
 * @param ticketId ID du ticket à supprimer
 * @param userId ID de l'utilisateur qui demande la suppression
 * @param isDeveloper L'utilisateur est-il un développeur (rôle DEVELOPPEUR)
 */
export async function deleteTicket(
  ticketId: string,
  userId: string,
  isDeveloper: boolean = false
): Promise<void> {
  try {
    // Récupérer le ticket pour vérifier les permissions
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      throw new Error('Ticket introuvable');
    }

    const ticket = ticketDoc.data() as Ticket;

    // Vérifier les permissions
    // Un user ne peut supprimer que ses propres tickets
    // Un développeur peut supprimer n'importe quel ticket
    if (!isDeveloper && ticket.createdBy !== userId) {
      throw new Error('Vous n\'avez pas la permission de supprimer ce ticket');
    }

    const batch = writeBatch(db);

    // Supprimer tous les messages
    const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
    const messagesSnapshot = await getDocs(messagesRef);
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Supprimer tout l'historique
    const historyRef = collection(db, TICKETS_COLLECTION, ticketId, HISTORY_SUBCOLLECTION);
    const historySnapshot = await getDocs(historyRef);
    historySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Supprimer le ticket
    batch.delete(ticketRef);

    await batch.commit();

    console.log(`✅ Ticket ${ticket.ticketNumber} supprimé par ${isDeveloper ? 'développeur' : 'utilisateur'} ${userId}`);
  } catch (error) {
    console.error('Error deleting ticket:', error);
    throw error;
  }
}

// ============================================================================
// GESTION DES MESSAGES
// ============================================================================

/**
 * Envoie un message dans un ticket
 */
export async function sendMessage(
  ticketId: string,
  data: SendMessageData,
  senderId: string,
  senderName: string,
  senderEmail: string,
  senderType: MessageSenderType
): Promise<TicketMessage> {
  try {
    const now = Timestamp.now();

    // Upload des pièces jointes si présentes
    const attachments: TicketAttachment[] = [];
    if (data.attachments && data.attachments.length > 0) {
      for (const file of data.attachments) {
        const attachment = await uploadTicketAttachment(file, ticketId);
        attachments.push(attachment);
      }
    }

    const messageData: Omit<TicketMessage, 'id'> = {
      senderId,
      senderName,
      senderEmail,
      senderType,
      content: data.content,
      attachments,
      createdAt: now,
      readByUser: senderType === SenderType.USER,
      readByAdmin: senderType === SenderType.ADMIN,
      isSystemMessage: false,
    };

    const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
    const messageRef = await addDoc(messagesRef, messageData);

    // Mettre à jour le ticket
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const updateData: Record<string, any> = {
      updatedAt: now,
      lastMessageAt: now,
      messageCount: increment(1),
    };

    // Marquer comme non lu pour l'autre partie
    if (senderType === SenderType.USER) {
      updateData.hasUnreadForAdmin = true;
      updateData.hasUnreadForUser = false;
    } else if (senderType === SenderType.ADMIN) {
      updateData.hasUnreadForUser = true;
      updateData.hasUnreadForAdmin = false;
    }

    await updateDoc(ticketRef, updateData);

    // Ajouter à l'historique
    await addHistoryEntry(ticketId, {
      actionType: HistoryActionType.MESSAGE_SENT,
      actorId: senderId,
      actorName: senderName,
      actorType: senderType === SenderType.ADMIN ? 'admin' : 'user',
      description: `Message envoyé`,
    });

    // Envoyer notification email à l'autre partie (non bloquant)
    const ticket = await getTicketById(ticketId);
    if (ticket) {
      const notificationData = {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        ticketSubject: ticket.subject,
        ticketType: ticket.type,
        ticketPriority: ticket.priority,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        messageContent: data.content,
        senderName,
      };

      if (senderType === SenderType.ADMIN) {
        // Admin répond -> notifier l'utilisateur
        sendTicketNotification({
          ...notificationData,
          type: 'new_message_to_user' as const,
        });
      } else {
        // Utilisateur répond -> notifier l'admin/développeur
        sendTicketNotification({
          ...notificationData,
          type: 'new_message_to_admin' as const,
        });
      }
    }

    return {
      id: messageRef.id,
      ...messageData,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Récupère tous les messages d'un ticket
 */
export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  try {
    const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TicketMessage[];
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    throw error;
  }
}

/**
 * Abonnement en temps réel aux messages d'un ticket
 */
export function subscribeToTicketMessages(
  ticketId: string,
  callback: (messages: TicketMessage[]) => void
): () => void {
  const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TicketMessage[];
    callback(messages);
  });
}

/**
 * Marque les messages comme lus
 */
export async function markMessagesAsRead(
  ticketId: string,
  isAdmin: boolean
): Promise<void> {
  try {
    const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
    const fieldToUpdate = isAdmin ? 'readByAdmin' : 'readByUser';
    const unreadField = isAdmin ? 'hasUnreadForAdmin' : 'hasUnreadForUser';

    // Récupérer les messages non lus
    const q = query(messagesRef, where(fieldToUpdate, '==', false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const batch = writeBatch(db);

    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { [fieldToUpdate]: true });
    });

    // Mettre à jour le statut de non lu du ticket
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    batch.update(ticketRef, { [unreadField]: false });

    await batch.commit();
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

// ============================================================================
// MESSAGES SYSTÈME
// ============================================================================

/**
 * Ajoute un message système (changement de statut, etc.)
 */
async function addSystemMessage(
  ticketId: string,
  metadata: TicketMessage['systemMetadata'],
  actorId: string,
  actorName: string
): Promise<void> {
  const now = Timestamp.now();

  let content = '';
  switch (metadata?.action) {
    case 'ticket_created':
      content = `Ticket créé: "${metadata.newValue}"`;
      break;
    case 'status_change':
      content = `Statut changé de "${metadata.previousValue}" à "${metadata.newValue}"`;
      break;
    case 'priority_change':
      content = `Priorité changée de "${metadata.previousValue}" à "${metadata.newValue}"`;
      break;
    case 'assignment':
      content = `Ticket assigné à ${metadata.newValue}`;
      break;
    default:
      content = 'Action système';
  }

  const messageData: Omit<TicketMessage, 'id'> = {
    senderId: actorId,
    senderName: actorName,
    senderEmail: '',
    senderType: SenderType.SYSTEM,
    content,
    attachments: [],
    createdAt: now,
    readByUser: true,
    readByAdmin: true,
    isSystemMessage: true,
    systemMetadata: metadata,
  };

  const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
  await addDoc(messagesRef, messageData);
}

// ============================================================================
// HISTORIQUE
// ============================================================================

/**
 * Ajoute une entrée à l'historique du ticket
 */
async function addHistoryEntry(
  ticketId: string,
  entry: Omit<TicketHistoryEntry, 'id' | 'timestamp'>
): Promise<void> {
  const historyRef = collection(db, TICKETS_COLLECTION, ticketId, HISTORY_SUBCOLLECTION);
  await addDoc(historyRef, {
    ...entry,
    timestamp: Timestamp.now(),
  });
}

/**
 * Récupère l'historique d'un ticket
 */
export async function getTicketHistory(ticketId: string): Promise<TicketHistoryEntry[]> {
  try {
    const historyRef = collection(db, TICKETS_COLLECTION, ticketId, HISTORY_SUBCOLLECTION);
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TicketHistoryEntry[];
  } catch (error) {
    console.error('Error fetching ticket history:', error);
    throw error;
  }
}

// ============================================================================
// PIÈCES JOINTES
// ============================================================================

/**
 * Upload une pièce jointe
 */
async function uploadTicketAttachment(file: File, ticketId: string): Promise<TicketAttachment> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const extension = file.name.split('.').pop() || '';
  const fileName = `${id}.${extension}`;
  const storagePath = `tickets/${ticketId}/${fileName}`;

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return {
    id,
    fileName: file.name,
    mimeType: file.type,
    url,
    size: file.size,
    uploadedAt: Timestamp.now(),
  };
}

// ============================================================================
// STATISTIQUES
// ============================================================================

/**
 * Récupère les statistiques des tickets (pour dashboard admin)
 */
export async function getTicketStats(): Promise<TicketStats> {
  try {
    const ticketsRef = collection(db, TICKETS_COLLECTION);
    const querySnapshot = await getDocs(ticketsRef);
    const tickets = querySnapshot.docs.map(doc => doc.data() as Ticket);

    const stats: TicketStats = {
      total: tickets.length,
      byStatus: {
        open: 0,
        in_progress: 0,
        waiting_for_user: 0,
        resolved: 0,
        closed: 0,
      },
      byType: {
        maintenance: 0,
        improvement: 0,
        feature_request: 0,
        bug_report: 0,
        other: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      openTickets: 0,
      resolvedThisWeek: 0,
      averageResolutionTime: 0,
      unreadCount: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const ticket of tickets) {
      // Par statut
      if (stats.byStatus[ticket.status as keyof typeof stats.byStatus] !== undefined) {
        stats.byStatus[ticket.status as keyof typeof stats.byStatus]++;
      }

      // Par type
      if (stats.byType[ticket.type as keyof typeof stats.byType] !== undefined) {
        stats.byType[ticket.type as keyof typeof stats.byType]++;
      }

      // Par priorité
      if (stats.byPriority[ticket.priority as keyof typeof stats.byPriority] !== undefined) {
        stats.byPriority[ticket.priority as keyof typeof stats.byPriority]++;
      }

      // Tickets ouverts
      if (ticket.status !== TicketStatusEnum.CLOSED && ticket.status !== TicketStatusEnum.RESOLVED) {
        stats.openTickets++;
      }

      // Non lus
      if (ticket.hasUnreadForAdmin) {
        stats.unreadCount++;
      }

      // Résolus cette semaine
      if (ticket.resolvedAt) {
        const resolvedDate = ticket.resolvedAt.toDate();
        if (resolvedDate >= oneWeekAgo) {
          stats.resolvedThisWeek++;
        }

        // Calcul du temps de résolution
        const createdDate = ticket.createdAt.toDate();
        const resolutionTime = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60); // en heures
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    // Moyenne du temps de résolution
    if (resolvedCount > 0) {
      stats.averageResolutionTime = Math.round(totalResolutionTime / resolvedCount);
    }

    return stats;
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    throw error;
  }
}

/**
 * Récupère le nombre de tickets non lus (pour badge navigation)
 */
export async function getUnreadTicketsCount(): Promise<number> {
  try {
    const ticketsRef = collection(db, TICKETS_COLLECTION);
    const q = query(ticketsRef, where('hasUnreadForAdmin', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error fetching unread tickets count:', error);
    return 0;
  }
}

/**
 * Abonnement en temps réel au nombre de tickets non lus
 */
export function subscribeToUnreadTicketsCount(callback: (count: number) => void): () => void {
  const ticketsRef = collection(db, TICKETS_COLLECTION);
  const q = query(ticketsRef, where('hasUnreadForAdmin', '==', true));

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

// ============================================================================
// RÉOUVERTURE DE TICKET
// ============================================================================

/**
 * Réouvre un ticket fermé ou résolu
 */
export async function reopenTicket(
  ticketId: string,
  actorId: string,
  actorName: string,
  isAdmin: boolean
): Promise<void> {
  try {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      throw new Error('Ticket not found');
    }

    const currentTicket = ticketDoc.data() as Ticket;

    if (currentTicket.status !== TicketStatusEnum.CLOSED && currentTicket.status !== TicketStatusEnum.RESOLVED) {
      throw new Error('Can only reopen closed or resolved tickets');
    }

    await updateDoc(ticketRef, {
      status: TicketStatusEnum.OPEN,
      updatedAt: Timestamp.now(),
      resolvedAt: null,
      resolvedBy: null,
      hasUnreadForAdmin: !isAdmin,
      hasUnreadForUser: isAdmin,
    });

    await addHistoryEntry(ticketId, {
      actionType: HistoryActionType.REOPENED,
      actorId,
      actorName,
      actorType: isAdmin ? 'admin' : 'user',
      description: 'Ticket réouvert',
      previousValue: currentTicket.status,
      newValue: TicketStatusEnum.OPEN,
    });

    await addSystemMessage(ticketId, {
      action: 'status_change',
      previousValue: currentTicket.status,
      newValue: TicketStatusEnum.OPEN,
    }, actorId, actorName);
  } catch (error) {
    console.error('Error reopening ticket:', error);
    throw error;
  }
}

// ============================================================================
// FONCTIONS POUR ADMIN QUI CRÉENT DES TICKETS
// ============================================================================

/**
 * Récupère les tickets créés par un admin (pour la page "Mes Demandes Support")
 * Approche simple sans index composite : récupère par createdBy, filtre côté client
 */
export async function getAdminTickets(adminUid: string): Promise<Ticket[]> {
  try {
    const ticketsRef = collection(db, TICKETS_COLLECTION);
    // Requête simple avec un seul champ (pas besoin d'index composite)
    const q = query(
      ticketsRef,
      where('createdBy', '==', adminUid)
    );
    const querySnapshot = await getDocs(q);

    const tickets = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Ticket[];

    // Filtrer côté client les tickets avec source='admin'
    // et trier par date de création décroissante
    return tickets
      .filter(t => t.source === 'admin')
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    throw error;
  }
}

/**
 * Interface pour créer un ticket depuis le panel admin
 */
interface CreateAdminTicketData {
  subject: string;
  type: string;
  priority: string;
  description: string;
  createdBy: string;
  userEmail: string;
  userName: string;
  source: 'admin';
  adminRole: string;
  adminRoleLabel: string;
  attachments?: File[];
}

/**
 * Crée un ticket depuis le panel admin (par un admin pour signaler un problème)
 */
export async function createAdminTicket(data: CreateAdminTicketData): Promise<Ticket> {
  try {
    const ticketNumber = generateTicketNumber();
    const now = Timestamp.now();

    // Upload des pièces jointes si présentes
    const attachments: TicketAttachment[] = [];
    if (data.attachments && data.attachments.length > 0) {
      for (const file of data.attachments) {
        const attachment = await uploadTicketAttachment(file, 'new-admin-ticket');
        attachments.push(attachment);
      }
    }

    const ticketData: Omit<Ticket, 'id'> = {
      ticketNumber,
      createdBy: data.createdBy,
      userEmail: data.userEmail,
      userName: data.userName,
      type: data.type,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      status: TicketStatusEnum.OPEN,
      attachments,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      hasUnreadForUser: false,
      hasUnreadForAdmin: true,
      source: 'admin',
      adminRole: data.adminRole,
    } as any; // Cast pour inclure les nouveaux champs

    const ticketRef = await addDoc(collection(db, TICKETS_COLLECTION), ticketData);
    const ticketId = ticketRef.id;

    // Créer l'entrée d'historique pour la création
    await addHistoryEntry(ticketId, {
      actionType: HistoryActionType.CREATED,
      actorId: data.createdBy,
      actorName: data.userName,
      actorType: 'user', // L'admin qui crée un ticket est considéré comme "user" dans ce contexte
      description: `Ticket créé par ${data.adminRoleLabel}: ${data.subject}`,
    });

    // Créer un message système pour la création
    await addSystemMessage(ticketId, {
      action: 'ticket_created',
      newValue: data.subject,
    }, data.createdBy, data.userName);

    // Notifier le développeur qu'un admin a créé un ticket (non bloquant)
    sendTicketNotification({
      type: 'new_ticket',
      ticketId,
      ticketNumber,
      ticketSubject: data.subject,
      ticketType: data.type,
      ticketPriority: data.priority,
      userName: `${data.userName} (${data.adminRoleLabel})`,
      userEmail: data.userEmail,
    });

    return {
      id: ticketId,
      ...ticketData,
    } as Ticket;
  } catch (error) {
    console.error('Error creating admin ticket:', error);
    throw error;
  }
}

/**
 * Ajoute un message à un ticket (version simplifiée pour les admins créateurs)
 */
export async function addTicketMessage(
  ticketId: string,
  messageData: {
    content: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderType: typeof SenderType[keyof typeof SenderType];
    attachments?: File[];
  }
): Promise<TicketMessage> {
  try {
    const now = Timestamp.now();

    // Upload des pièces jointes si présentes
    const attachments: TicketAttachment[] = [];
    if (messageData.attachments && messageData.attachments.length > 0) {
      for (const file of messageData.attachments) {
        const attachment = await uploadTicketAttachment(file, ticketId);
        attachments.push(attachment);
      }
    }

    const message: Omit<TicketMessage, 'id'> = {
      senderId: messageData.senderId,
      senderName: messageData.senderName,
      senderEmail: messageData.senderEmail,
      senderType: messageData.senderType,
      content: messageData.content,
      attachments,
      createdAt: now,
      readByUser: messageData.senderType === SenderType.USER,
      readByAdmin: messageData.senderType === SenderType.ADMIN,
      isSystemMessage: false,
    };

    const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
    const messageRef = await addDoc(messagesRef, message);

    // Mettre à jour le ticket
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    const updateData: Record<string, any> = {
      updatedAt: now,
      lastMessageAt: now,
      messageCount: increment(1),
    };

    // Marquer comme non lu pour l'autre partie
    if (messageData.senderType === SenderType.USER) {
      updateData.hasUnreadForAdmin = true;
      updateData.hasUnreadForUser = false;
    } else if (messageData.senderType === SenderType.ADMIN) {
      updateData.hasUnreadForUser = true;
      updateData.hasUnreadForAdmin = false;
    }

    await updateDoc(ticketRef, updateData);

    // Ajouter à l'historique
    await addHistoryEntry(ticketId, {
      actionType: HistoryActionType.MESSAGE_SENT,
      actorId: messageData.senderId,
      actorName: messageData.senderName,
      actorType: messageData.senderType === SenderType.ADMIN ? 'admin' : 'user',
      description: 'Message envoyé',
    });

    // Envoyer notification email à l'autre partie (non bloquant)
    const ticket = await getTicketById(ticketId);
    if (ticket) {
      const notificationData = {
        ticketId,
        ticketNumber: ticket.ticketNumber,
        ticketSubject: ticket.subject,
        ticketType: ticket.type,
        ticketPriority: ticket.priority,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        messageContent: messageData.content,
        senderName: messageData.senderName,
      };

      if (messageData.senderType === SenderType.ADMIN) {
        // Développeur répond -> notifier l'admin créateur
        sendTicketNotification({
          ...notificationData,
          type: 'new_message_to_user' as const,
        });
      } else {
        // Admin créateur répond -> notifier le développeur
        sendTicketNotification({
          ...notificationData,
          type: 'new_message_to_admin' as const,
        });
      }
    }

    return {
      id: messageRef.id,
      ...message,
    };
  } catch (error) {
    console.error('Error adding ticket message:', error);
    throw error;
  }
}

/**
 * Marque un ticket comme lu pour l'utilisateur (admin créateur du ticket)
 */
export async function markTicketAsReadForUser(ticketId: string): Promise<void> {
  try {
    const ticketRef = doc(db, TICKETS_COLLECTION, ticketId);
    await updateDoc(ticketRef, {
      hasUnreadForUser: false,
    });

    // Marquer aussi tous les messages comme lus pour l'utilisateur
    const messagesRef = collection(db, TICKETS_COLLECTION, ticketId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, where('readByUser', '==', false));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { readByUser: true });
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Error marking ticket as read for user:', error);
    throw error;
  }
}
