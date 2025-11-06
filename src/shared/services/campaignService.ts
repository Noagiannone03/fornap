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
  limit as firestoreLimit,
  Timestamp,
  QueryConstraint,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type {
  Campaign,
  CampaignRecipient,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  CampaignPaginationOptions,
  PaginatedCampaigns,
  TargetingFilters,
  CampaignStats,
} from '../types/campaign';
import type { User } from '../types/user';
import { createInitialStats } from '../types/campaign';

const CAMPAIGNS_COLLECTION = 'campaigns';
const RECIPIENTS_SUBCOLLECTION = 'recipients';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Nettoie les champs undefined d'un objet de manière récursive
 */
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      // Si c'est un objet (mais pas un Timestamp ou Date ou Array), nettoyer récursivement
      const isTimestamp = value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function';
      const isDate = Object.prototype.toString.call(value) === '[object Date]';
      const isArray = Array.isArray(value);

      if (value && typeof value === 'object' && !isArray && !isTimestamp && !isDate) {
        cleaned[key] = cleanUndefinedFields(value) as any;
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

/**
 * Calcule l'âge à partir de la date de naissance
 */
function calculateAge(birthDate: Timestamp): number {
  const birth = birthDate.toDate();
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Vérifie si un utilisateur correspond aux filtres de ciblage
 */
function userMatchesFilters(user: User, filters: TargetingFilters): boolean {
  // Filtre de membership type
  if (filters.membershipTypes && filters.membershipTypes.length > 0) {
    if (!filters.membershipTypes.includes(user.currentMembership.planType)) {
      return false;
    }
  }

  // Filtre de membership status
  if (filters.membershipStatus && filters.membershipStatus.length > 0) {
    if (!filters.membershipStatus.includes(user.currentMembership.status)) {
      return false;
    }
  }

  // Filtre de tags (include)
  if (filters.includeTags && filters.includeTags.length > 0) {
    const hasTag = filters.includeTags.some(tag => user.status.tags.includes(tag));
    if (!hasTag) {
      return false;
    }
  }

  // Filtre de tags (exclude)
  if (filters.excludeTags && filters.excludeTags.length > 0) {
    const hasExcludedTag = filters.excludeTags.some(tag => user.status.tags.includes(tag));
    if (hasExcludedTag) {
      return false;
    }
  }

  // Filtre d'âge
  if (filters.ageRange) {
    const age = calculateAge(user.birthDate);
    if (filters.ageRange.min !== undefined && age < filters.ageRange.min) {
      return false;
    }
    if (filters.ageRange.max !== undefined && age > filters.ageRange.max) {
      return false;
    }
  }

  // Filtre de codes postaux
  if (filters.postalCodes && filters.postalCodes.length > 0) {
    if (!filters.postalCodes.includes(user.postalCode)) {
      return false;
    }
  }

  // Filtre de date d'inscription
  if (filters.registrationDateRange) {
    const registrationDate = user.registration.createdAt;
    if (filters.registrationDateRange.start && registrationDate.toMillis() < filters.registrationDateRange.start.toMillis()) {
      return false;
    }
    if (filters.registrationDateRange.end && registrationDate.toMillis() > filters.registrationDateRange.end.toMillis()) {
      return false;
    }
  }

  // Filtre de points de fidélité
  if (filters.loyaltyPointsRange) {
    if (filters.loyaltyPointsRange.min !== undefined && user.loyaltyPoints < filters.loyaltyPointsRange.min) {
      return false;
    }
    if (filters.loyaltyPointsRange.max !== undefined && user.loyaltyPoints > filters.loyaltyPointsRange.max) {
      return false;
    }
  }

  // Filtre de profil étendu
  if (filters.hasExtendedProfile !== undefined) {
    const hasProfile = user.extendedProfile !== undefined;
    if (hasProfile !== filters.hasExtendedProfile) {
      return false;
    }
  }

  // Filtres du profil étendu (seulement si l'utilisateur a un profil étendu)
  if (user.extendedProfile) {
    // Statut professionnel
    if (filters.professionalStatus && filters.professionalStatus.length > 0) {
      if (!filters.professionalStatus.includes(user.extendedProfile.professional.status)) {
        return false;
      }
    }

    // Domaines d'activité
    if (filters.activityDomains && filters.activityDomains.length > 0) {
      if (!filters.activityDomains.includes(user.extendedProfile.professional.activityDomain)) {
        return false;
      }
    }

    // Compétences
    if (filters.skills && filters.skills.length > 0) {
      const hasSkill = filters.skills.some(skill =>
        user.extendedProfile?.professional.skills.includes(skill)
      );
      if (!hasSkill) {
        return false;
      }
    }

    // Types d'événements
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      const hasEventType = filters.eventTypes.some(eventType =>
        user.extendedProfile?.interests.eventTypes.includes(eventType)
      );
      if (!hasEventType) {
        return false;
      }
    }

    // Domaines artistiques
    if (filters.artisticDomains && filters.artisticDomains.length > 0) {
      const hasArtisticDomain = filters.artisticDomains.some(domain =>
        user.extendedProfile?.interests.artisticDomains.includes(domain)
      );
      if (!hasArtisticDomain) {
        return false;
      }
    }

    // Préférence de contact
    if (filters.preferredContact && filters.preferredContact.length > 0) {
      if (!filters.preferredContact.includes(user.extendedProfile.communication.preferredContact)) {
        return false;
      }
    }
  }

  // Filtre de blocage
  if (!filters.includeBlocked) {
    if (user.status.isAccountBlocked || user.status.isCardBlocked) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// GESTION DES CAMPAGNES
// ============================================================================

/**
 * Crée une nouvelle campagne
 */
export async function createCampaign(
  adminId: string,
  data: CreateCampaignData
): Promise<Campaign> {
  try {
    const now = Timestamp.now();

    // Construire l'objet campaign
    const campaign: any = {
      name: data.name,
      status: 'draft',
      content: cleanUndefinedFields(data.content),
      targeting: cleanUndefinedFields(data.targeting),
      sendImmediately: data.sendImmediately,
      stats: createInitialStats(),
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    };

    // Ajouter description seulement si elle existe
    if (data.description && data.description.trim()) {
      campaign.description = data.description;
    }

    // Ajouter scheduledAt seulement s'il existe
    if (data.scheduledAt) {
      campaign.scheduledAt = data.scheduledAt;
    }

    // Nettoyer les champs undefined de l'objet complet
    const cleanedCampaign = cleanUndefinedFields(campaign);

    const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
    const docRef = await addDoc(campaignsRef, cleanedCampaign);

    return {
      ...cleanedCampaign,
      id: docRef.id,
    } as Campaign;
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}

/**
 * Récupère une campagne par son ID
 */
export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  try {
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    const campaignDoc = await getDoc(campaignRef);

    if (campaignDoc.exists()) {
      return {
        ...campaignDoc.data(),
        id: campaignDoc.id,
      } as Campaign;
    }

    return null;
  } catch (error) {
    console.error('Error getting campaign:', error);
    throw error;
  }
}

/**
 * Récupère toutes les campagnes
 */
export async function getAllCampaigns(): Promise<Campaign[]> {
  try {
    const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
    const q = query(campaignsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as Campaign[];
  } catch (error) {
    console.error('Error getting campaigns:', error);
    throw error;
  }
}

/**
 * Récupère les campagnes avec filtres et pagination
 */
export async function getFilteredCampaigns(
  filters?: CampaignFilters,
  pagination?: CampaignPaginationOptions
): Promise<PaginatedCampaigns> {
  try {
    const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    // Appliquer les filtres
    if (filters?.status && filters.status.length > 0) {
      constraints.push(where('status', 'in', filters.status));
    }

    if (filters?.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy));
    }

    // Ordre et limite
    const orderByField = pagination?.orderBy || 'createdAt';
    const orderDirection = pagination?.orderDirection || 'desc';
    constraints.push(orderBy(orderByField, orderDirection));

    if (pagination?.limit) {
      constraints.push(firestoreLimit(pagination.limit));
    }

    const q = query(campaignsRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const campaigns = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as Campaign[];

    // Filtrer par terme de recherche (côté client car Firestore ne supporte pas le LIKE)
    let filteredCampaigns = campaigns;
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredCampaigns = campaigns.filter(campaign =>
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrer par date range (côté client pour plus de flexibilité)
    if (filters?.dateRange) {
      filteredCampaigns = filteredCampaigns.filter(campaign => {
        const campaignDate = campaign.createdAt.toMillis();
        if (filters.dateRange?.start && campaignDate < filters.dateRange.start.toMillis()) {
          return false;
        }
        if (filters.dateRange?.end && campaignDate > filters.dateRange.end.toMillis()) {
          return false;
        }
        return true;
      });
    }

    const total = filteredCampaigns.length;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const totalPages = Math.ceil(total / limit);

    // Paginer les résultats (côté client)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

    return {
      campaigns: paginatedCampaigns,
      total,
      page,
      totalPages,
    };
  } catch (error) {
    console.error('Error getting filtered campaigns:', error);
    throw error;
  }
}

/**
 * Met à jour une campagne
 */
export async function updateCampaign(
  campaignId: string,
  data: UpdateCampaignData
): Promise<void> {
  try {
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);

    const updates = {
      ...cleanUndefinedFields(data),
      updatedAt: Timestamp.now(),
    };

    await updateDoc(campaignRef, updates);
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
}

/**
 * Supprime une campagne
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  try {
    // Supprimer d'abord tous les destinataires
    const recipientsRef = collection(db, CAMPAIGNS_COLLECTION, campaignId, RECIPIENTS_SUBCOLLECTION);
    const recipientsSnapshot = await getDocs(recipientsRef);

    const batch = writeBatch(db);

    // Ajouter tous les destinataires à supprimer dans le batch
    recipientsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Supprimer la campagne
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    batch.delete(campaignRef);

    await batch.commit();
  } catch (error) {
    console.error('Error deleting campaign:', error);
    throw error;
  }
}

/**
 * Change le statut d'une campagne
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: Campaign['status']
): Promise<void> {
  try {
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    const updates: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (status === 'sent') {
      updates.sentAt = Timestamp.now();
    } else if (status === 'cancelled') {
      updates.cancelledAt = Timestamp.now();
    }

    await updateDoc(campaignRef, updates);
  } catch (error) {
    console.error('Error updating campaign status:', error);
    throw error;
  }
}

/**
 * Annule une campagne
 */
export async function cancelCampaign(
  campaignId: string,
  adminId: string,
  reason?: string
): Promise<void> {
  try {
    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    await updateDoc(campaignRef, {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancelledBy: adminId,
      cancellationReason: reason,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    throw error;
  }
}

// ============================================================================
// GESTION DU CIBLAGE
// ============================================================================

/**
 * Récupère tous les utilisateurs
 */
async function getAllUsers(): Promise<User[]> {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id,
    })) as User[];
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Récupère les utilisateurs ciblés en fonction des filtres
 */
export async function getTargetedUsers(
  mode: Campaign['targeting']['mode'],
  manualUserIds?: string[],
  filters?: TargetingFilters
): Promise<User[]> {
  try {
    if (mode === 'all') {
      const allUsers = await getAllUsers();
      // Exclure les utilisateurs bloqués si le filtre n'inclut pas les bloqués
      return allUsers.filter(user => {
        if (!filters?.includeBlocked && (user.status.isAccountBlocked || user.status.isCardBlocked)) {
          return false;
        }
        return true;
      });
    }

    if (mode === 'manual' && manualUserIds) {
      const users: User[] = [];
      for (const userId of manualUserIds) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          users.push({
            ...userDoc.data(),
            uid: userDoc.id,
          } as User);
        }
      }
      return users;
    }

    if (mode === 'filtered' && filters) {
      const allUsers = await getAllUsers();
      return allUsers.filter(user => userMatchesFilters(user, filters));
    }

    return [];
  } catch (error) {
    console.error('Error getting targeted users:', error);
    throw error;
  }
}

/**
 * Estime le nombre de destinataires en fonction des critères de ciblage
 */
export async function estimateRecipients(
  mode: Campaign['targeting']['mode'],
  manualUserIds?: string[],
  filters?: TargetingFilters
): Promise<number> {
  try {
    const users = await getTargetedUsers(mode, manualUserIds, filters);
    return users.length;
  } catch (error) {
    console.error('Error estimating recipients:', error);
    throw error;
  }
}

// ============================================================================
// GESTION DES DESTINATAIRES
// ============================================================================

/**
 * Crée les destinataires d'une campagne
 */
export async function createCampaignRecipients(
  campaignId: string,
  users: User[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const recipientsRef = collection(db, CAMPAIGNS_COLLECTION, campaignId, RECIPIENTS_SUBCOLLECTION);
    const now = Timestamp.now();

    users.forEach(user => {
      const recipientRef = doc(recipientsRef);
      const recipient: Omit<CampaignRecipient, 'id'> = {
        campaignId,
        userId: user.uid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: 'pending',
        openCount: 0,
        clickCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(recipientRef, cleanUndefinedFields(recipient));
    });

    await batch.commit();

    // Mettre à jour les stats de la campagne
    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('Error creating campaign recipients:', error);
    throw error;
  }
}

/**
 * Récupère les destinataires d'une campagne
 */
export async function getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]> {
  try {
    const recipientsRef = collection(db, CAMPAIGNS_COLLECTION, campaignId, RECIPIENTS_SUBCOLLECTION);
    const querySnapshot = await getDocs(recipientsRef);

    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as CampaignRecipient[];
  } catch (error) {
    console.error('Error getting campaign recipients:', error);
    throw error;
  }
}

/**
 * Met à jour le statut d'un destinataire
 */
export async function updateRecipientStatus(
  campaignId: string,
  recipientId: string,
  status: CampaignRecipient['status'],
  errorMessage?: string
): Promise<void> {
  try {
    const recipientRef = doc(db, CAMPAIGNS_COLLECTION, campaignId, RECIPIENTS_SUBCOLLECTION, recipientId);

    const updates: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (status === 'sent') {
      updates.sentAt = Timestamp.now();
    } else if (status === 'opened') {
      updates.openedAt = Timestamp.now();
    } else if (status === 'clicked') {
      updates.clickedAt = Timestamp.now();
    } else if (status === 'bounced') {
      updates.bouncedAt = Timestamp.now();
    } else if (status === 'failed' && errorMessage) {
      updates.errorMessage = errorMessage;
    }

    await updateDoc(recipientRef, updates);

    // Mettre à jour les stats de la campagne
    await updateCampaignStats(campaignId);
  } catch (error) {
    console.error('Error updating recipient status:', error);
    throw error;
  }
}

/**
 * Met à jour les statistiques d'une campagne
 */
export async function updateCampaignStats(campaignId: string): Promise<void> {
  try {
    const recipients = await getCampaignRecipients(campaignId);

    const stats: CampaignStats = {
      totalRecipients: recipients.length,
      sent: recipients.filter(r => r.status === 'sent' || r.status === 'opened' || r.status === 'clicked').length,
      pending: recipients.filter(r => r.status === 'pending').length,
      failed: recipients.filter(r => r.status === 'failed').length,
      opened: recipients.filter(r => r.status === 'opened' || r.status === 'clicked').length,
      clicked: recipients.filter(r => r.status === 'clicked').length,
      bounced: recipients.filter(r => r.status === 'bounced').length,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      failureRate: 0,
    };

    // Calculer les taux
    if (stats.sent > 0) {
      stats.openRate = (stats.opened / stats.sent) * 100;
      stats.clickRate = (stats.clicked / stats.sent) * 100;
      stats.bounceRate = (stats.bounced / stats.sent) * 100;
      stats.failureRate = (stats.failed / stats.sent) * 100;
    }

    const campaignRef = doc(db, CAMPAIGNS_COLLECTION, campaignId);
    await updateDoc(campaignRef, {
      stats,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating campaign stats:', error);
    throw error;
  }
}

/**
 * Prépare une campagne pour l'envoi (crée les destinataires)
 */
export async function prepareCampaignForSending(campaignId: string): Promise<void> {
  try {
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Récupérer les utilisateurs ciblés
    const users = await getTargetedUsers(
      campaign.targeting.mode,
      campaign.targeting.manualUserIds,
      campaign.targeting.filters
    );

    // Créer les destinataires
    await createCampaignRecipients(campaignId, users);

    // Mettre à jour le statut de la campagne
    await updateCampaignStatus(campaignId, campaign.sendImmediately ? 'sending' : 'scheduled');
  } catch (error) {
    console.error('Error preparing campaign for sending:', error);
    throw error;
  }
}
