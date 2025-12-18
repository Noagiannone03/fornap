import { Timestamp } from 'firebase/firestore';

/**
 * ============================================
 * TICKET SUPPORT SYSTEM TYPES
 * ============================================
 * Système de gestion des tickets de support
 * pour les demandes de maintenance, améliorations,
 * nouvelles fonctionnalités et corrections de bugs.
 */

// ============================================
// TICKET TYPES & STATUS
// ============================================

/**
 * Types de tickets disponibles
 */
export const TicketType = {
  /** Demande de maintenance */
  MAINTENANCE: 'maintenance',
  /** Demande d'amélioration d'une fonctionnalité existante */
  IMPROVEMENT: 'improvement',
  /** Demande de nouvelle fonctionnalité */
  FEATURE_REQUEST: 'feature_request',
  /** Signalement de bug */
  BUG_REPORT: 'bug_report',
  /** Autre demande */
  OTHER: 'other',
} as const;

export type TicketType = typeof TicketType[keyof typeof TicketType];

/**
 * Labels pour les types de tickets
 */
export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.MAINTENANCE]: 'Maintenance',
  [TicketType.IMPROVEMENT]: 'Amélioration',
  [TicketType.FEATURE_REQUEST]: 'Nouvelle fonctionnalité',
  [TicketType.BUG_REPORT]: 'Correction de bug',
  [TicketType.OTHER]: 'Autre',
};

/**
 * Couleurs pour les types de tickets (Mantine colors)
 */
export const TICKET_TYPE_COLORS: Record<TicketType, string> = {
  [TicketType.MAINTENANCE]: 'orange',
  [TicketType.IMPROVEMENT]: 'blue',
  [TicketType.FEATURE_REQUEST]: 'grape',
  [TicketType.BUG_REPORT]: 'red',
  [TicketType.OTHER]: 'gray',
};

/**
 * Statuts possibles d'un ticket
 */
export const TicketStatus = {
  /** Ticket ouvert, en attente de traitement */
  OPEN: 'open',
  /** Ticket en cours de traitement */
  IN_PROGRESS: 'in_progress',
  /** En attente d'une réponse de l'utilisateur */
  WAITING_FOR_USER: 'waiting_for_user',
  /** Ticket résolu */
  RESOLVED: 'resolved',
  /** Ticket fermé */
  CLOSED: 'closed',
} as const;

export type TicketStatus = typeof TicketStatus[keyof typeof TicketStatus];

/**
 * Labels pour les statuts de tickets
 */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Ouvert',
  [TicketStatus.IN_PROGRESS]: 'En cours',
  [TicketStatus.WAITING_FOR_USER]: 'En attente de réponse',
  [TicketStatus.RESOLVED]: 'Résolu',
  [TicketStatus.CLOSED]: 'Fermé',
};

/**
 * Couleurs pour les statuts de tickets (Mantine colors)
 */
export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'blue',
  [TicketStatus.IN_PROGRESS]: 'yellow',
  [TicketStatus.WAITING_FOR_USER]: 'orange',
  [TicketStatus.RESOLVED]: 'green',
  [TicketStatus.CLOSED]: 'gray',
};

/**
 * Niveaux de priorité d'un ticket
 */
export const TicketPriority = {
  /** Priorité basse */
  LOW: 'low',
  /** Priorité normale */
  MEDIUM: 'medium',
  /** Priorité haute */
  HIGH: 'high',
  /** Priorité urgente */
  URGENT: 'urgent',
} as const;

export type TicketPriority = typeof TicketPriority[keyof typeof TicketPriority];

/**
 * Labels pour les priorités de tickets
 */
export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Basse',
  [TicketPriority.MEDIUM]: 'Normale',
  [TicketPriority.HIGH]: 'Haute',
  [TicketPriority.URGENT]: 'Urgente',
};

/**
 * Couleurs pour les priorités de tickets (Mantine colors)
 */
export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'gray',
  [TicketPriority.MEDIUM]: 'blue',
  [TicketPriority.HIGH]: 'orange',
  [TicketPriority.URGENT]: 'red',
};

// ============================================
// TICKET DOCUMENT
// ============================================

/**
 * Pièce jointe d'un ticket ou message
 */
export interface TicketAttachment {
  /** ID unique de la pièce jointe */
  id: string;
  /** Nom du fichier */
  fileName: string;
  /** Type MIME du fichier */
  mimeType: string;
  /** URL de téléchargement (Firebase Storage) */
  url: string;
  /** Taille en bytes */
  size: number;
  /** Date d'upload */
  uploadedAt: Timestamp;
}

/**
 * Document principal d'un ticket dans Firestore
 * Collection: tickets
 */
export interface Ticket {
  /** ID unique du ticket (auto-généré) */
  id: string;

  /** Numéro de ticket lisible (ex: TKT-2024-0001) */
  ticketNumber: string;

  /** UID de l'utilisateur qui a créé le ticket */
  createdBy: string;

  /** Email de l'utilisateur (pour notifications) */
  userEmail: string;

  /** Nom complet de l'utilisateur */
  userName: string;

  /** Type de ticket */
  type: TicketType;

  /** Sujet/Titre du ticket */
  subject: string;

  /** Description détaillée de la demande */
  description: string;

  /** Niveau de priorité */
  priority: TicketPriority;

  /** Statut actuel du ticket */
  status: TicketStatus;

  /** Pièces jointes (images, documents) */
  attachments: TicketAttachment[];

  /** UID de l'admin assigné (optionnel) */
  assignedTo?: string;

  /** Nom de l'admin assigné */
  assignedToName?: string;

  /** Date de création */
  createdAt: Timestamp;

  /** Date de dernière mise à jour */
  updatedAt: Timestamp;

  /** Date de résolution (si résolu/fermé) */
  resolvedAt?: Timestamp;

  /** UID de l'admin qui a résolu le ticket */
  resolvedBy?: string;

  /** Nombre de messages dans la conversation */
  messageCount: number;

  /** Date du dernier message */
  lastMessageAt?: Timestamp;

  /** Indique si l'utilisateur a des messages non lus */
  hasUnreadForUser: boolean;

  /** Indique si l'admin a des messages non lus */
  hasUnreadForAdmin: boolean;

  /** Notes internes (visibles uniquement par les admins) */
  internalNotes?: string;

  /** Origine du ticket : 'user' pour utilisateur normal, 'admin' pour admin du panel */
  source?: 'user' | 'admin';

  /** Rôle admin si source='admin' */
  adminRole?: string;
}

// ============================================
// TICKET MESSAGE (Sous-collection)
// ============================================

/**
 * Type d'expéditeur d'un message
 */
export const MessageSenderType = {
  /** Message envoyé par l'utilisateur */
  USER: 'user',
  /** Message envoyé par un admin/superadmin */
  ADMIN: 'admin',
  /** Message système automatique */
  SYSTEM: 'system',
} as const;

export type MessageSenderType = typeof MessageSenderType[keyof typeof MessageSenderType];

/**
 * Message dans un ticket
 * Collection: tickets/{ticketId}/messages
 */
export interface TicketMessage {
  /** ID unique du message */
  id: string;

  /** UID de l'expéditeur */
  senderId: string;

  /** Nom de l'expéditeur */
  senderName: string;

  /** Email de l'expéditeur */
  senderEmail: string;

  /** Type d'expéditeur (user, admin, system) */
  senderType: MessageSenderType;

  /** Contenu du message */
  content: string;

  /** Pièces jointes du message */
  attachments: TicketAttachment[];

  /** Date d'envoi */
  createdAt: Timestamp;

  /** Message lu par l'utilisateur */
  readByUser: boolean;

  /** Message lu par l'admin */
  readByAdmin: boolean;

  /** Message système (changement de statut, etc.) */
  isSystemMessage: boolean;

  /** Métadonnées pour les messages système */
  systemMetadata?: {
    action: 'status_change' | 'priority_change' | 'assignment' | 'ticket_created';
    previousValue?: string;
    newValue?: string;
  };
}

// ============================================
// TICKET HISTORY (Sous-collection)
// ============================================

/**
 * Types d'actions dans l'historique
 */
export const TicketHistoryActionType = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  PRIORITY_CHANGED: 'priority_changed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  MESSAGE_SENT: 'message_sent',
  ATTACHMENT_ADDED: 'attachment_added',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
  CLOSED: 'closed',
} as const;

export type TicketHistoryActionType = typeof TicketHistoryActionType[keyof typeof TicketHistoryActionType];

/**
 * Entrée dans l'historique d'un ticket
 * Collection: tickets/{ticketId}/history
 */
export interface TicketHistoryEntry {
  /** ID unique de l'entrée */
  id: string;

  /** Type d'action */
  actionType: TicketHistoryActionType;

  /** UID de l'acteur */
  actorId: string;

  /** Nom de l'acteur */
  actorName: string;

  /** Type d'acteur (user ou admin) */
  actorType: 'user' | 'admin';

  /** Description de l'action */
  description: string;

  /** Valeur précédente (pour les changements) */
  previousValue?: string;

  /** Nouvelle valeur (pour les changements) */
  newValue?: string;

  /** Date de l'action */
  timestamp: Timestamp;
}

// ============================================
// DTO & FORMS
// ============================================

/**
 * Données pour créer un nouveau ticket
 */
export interface CreateTicketData {
  type: TicketType;
  subject: string;
  description: string;
  priority: TicketPriority;
  attachments?: File[];
}

/**
 * Données pour mettre à jour un ticket
 */
export interface UpdateTicketData {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  assignedToName?: string;
  internalNotes?: string;
}

/**
 * Données pour envoyer un message
 */
export interface SendMessageData {
  content: string;
  attachments?: File[];
}

/**
 * Filtres pour la liste des tickets
 */
export interface TicketFilters {
  status?: TicketStatus[];
  type?: TicketType[];
  priority?: TicketPriority[];
  assignedTo?: string;
  createdBy?: string;
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasUnread?: boolean;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Statistiques des tickets pour le dashboard admin
 */
export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
  byType: Record<TicketType, number>;
  byPriority: Record<TicketPriority, number>;
  openTickets: number;
  resolvedThisWeek: number;
  averageResolutionTime: number; // en heures
  unreadCount: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Génère un numéro de ticket lisible
 */
export function generateTicketNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT-${year}-${random}`;
}

/**
 * Vérifie si un ticket est ouvert (peut recevoir des messages)
 */
export function isTicketOpen(ticket: Ticket): boolean {
  return ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.RESOLVED;
}

/**
 * Vérifie si un ticket peut être réouvert
 */
export function canReopenTicket(ticket: Ticket): boolean {
  return ticket.status === TicketStatus.CLOSED || ticket.status === TicketStatus.RESOLVED;
}

/**
 * Vérifie si un ticket nécessite une action urgente
 */
export function isTicketUrgent(ticket: Ticket): boolean {
  return ticket.priority === TicketPriority.URGENT && isTicketOpen(ticket);
}
