import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
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
 * Retourne un nouvel objet sans aucune valeur undefined, même dans les objets et tableaux imbriqués
 */
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Vérifier si c'est un Timestamp Firestore
  const isTimestamp = obj && typeof obj === 'object' && 'toDate' in obj && typeof obj.toDate === 'function';
  if (isTimestamp) {
    return obj;
  }

  // Vérifier si c'est une Date
  const isDate = Object.prototype.toString.call(obj) === '[object Date]';
  if (isDate) {
    return obj;
  }

  // Si c'est un tableau, nettoyer chaque élément et filtrer les undefined
  if (Array.isArray(obj)) {
    const cleaned = obj
      .filter(item => item !== undefined)
      .map(item => {
        if (item && typeof item === 'object') {
          return cleanUndefinedFields(item);
        }
        return item;
      });
    return cleaned.filter(item => item !== undefined) as any;
  }

  // Si c'est un objet, nettoyer récursivement
  const cleaned: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      // Ignorer uniquement les valeurs undefined (null est accepté par Firebase)
      if (value === undefined) {
        continue;
      }

      // Nettoyer récursivement les objets et tableaux
      if (value && typeof value === 'object') {
        const cleanedValue = cleanUndefinedFields(value);

        // Ne pas ajouter des objets vides ou des tableaux vides issus du nettoyage
        if (Array.isArray(cleanedValue)) {
          if (cleanedValue.length > 0) {
            cleaned[key] = cleanedValue;
          }
        } else if (typeof cleanedValue === 'object') {
          // Vérifier si c'est un Timestamp ou une Date
          const isSpecialObject =
            (cleanedValue.toDate && typeof cleanedValue.toDate === 'function') ||
            Object.prototype.toString.call(cleanedValue) === '[object Date]';

          if (isSpecialObject || Object.keys(cleanedValue).length > 0) {
            cleaned[key] = cleanedValue;
          }
        } else {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned as Partial<T>;
}

// ============================================================================
// GESTION DU CONTENU EMAIL (sous-collection Firestore en chunks)
// Le HTML exporté par Unlayer peut dépasser 1 MiB (images base64 inline).
// On découpe le contenu en chunks de 900 KB stockés dans une sous-collection.
// Pas de Firebase Storage = pas de CORS, tout reste dans Firestore.
// ============================================================================

const CONTENT_SUBCOLLECTION = 'content';
const CHUNK_SIZE = 900 * 1024; // 900 KB par chunk (marge sous la limite de 1 MiB)

/**
 * Sauvegarde le HTML et le design en chunks dans Firestore
 */
export async function saveCampaignContent(
  campaignId: string,
  html: string,
  designJson?: string
): Promise<void> {
  try {
    const contentRef = collection(db, CAMPAIGNS_COLLECTION, campaignId, CONTENT_SUBCOLLECTION);
    const existingSnapshot = await getDocs(contentRef);

    if (!existingSnapshot.empty) {
      const deleteBatch = writeBatch(db);
      existingSnapshot.docs.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();
    }

    // Découper le HTML en chunks
    const chunks: string[] = [];
    for (let i = 0; i < html.length; i += CHUNK_SIZE) {
      chunks.push(html.substring(i, i + CHUNK_SIZE));
    }

    // Sauvegarder chaque chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkRef = doc(db, CAMPAIGNS_COLLECTION, campaignId, CONTENT_SUBCOLLECTION, `html_${i}`);
      await setDoc(chunkRef, {
        data: chunks[i],
        index: i,
        total: chunks.length,
        type: 'html',
      });
    }

    // Sauvegarder le design JSON (généralement < 1 MiB)
    if (designJson) {
      const designRef = doc(db, CAMPAIGNS_COLLECTION, campaignId, CONTENT_SUBCOLLECTION, 'design');
      await setDoc(designRef, {
        data: designJson,
        type: 'design',
      });
    }

    console.log(`✅ Contenu sauvegardé: ${chunks.length} chunk(s) HTML + ${designJson ? 'design' : 'pas de design'}`);
  } catch (error) {
    console.error('Error saving campaign content:', error);
    throw error;
  }
}

/**
 * Charge le HTML d'une campagne depuis les chunks Firestore
 */
export async function loadCampaignHtml(campaignId: string): Promise<string | null> {
  try {
    const contentRef = collection(db, CAMPAIGNS_COLLECTION, campaignId, CONTENT_SUBCOLLECTION);
    const snapshot = await getDocs(contentRef);

    if (snapshot.empty) return null;

    // Récupérer les chunks HTML et les trier par index
    const htmlChunks: { index: number; data: string }[] = [];
    for (const docSnap of snapshot.docs) {
      const docData = docSnap.data();
      if (docData.type === 'html') {
        htmlChunks.push({ index: docData.index, data: docData.data });
      }
    }

    if (htmlChunks.length === 0) return null;

    // Reconstituer le HTML dans l'ordre
    htmlChunks.sort((a, b) => a.index - b.index);
    return htmlChunks.map(c => c.data).join('');
  } catch (error) {
    console.error('Error loading campaign HTML:', error);
    return null;
  }
}

/**
 * Charge le design JSON d'une campagne depuis Firestore
 */
export async function loadCampaignDesign(campaignId: string): Promise<string | null> {
  try {
    const designRef = doc(db, CAMPAIGNS_COLLECTION, campaignId, CONTENT_SUBCOLLECTION, 'design');
    const designSnap = await getDoc(designRef);

    if (designSnap.exists()) {
      return designSnap.data().data || null;
    }
    return null;
  } catch (error) {
    console.error('Error loading campaign design:', error);
    return null;
  }
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
    // Skip si pas de date de naissance
    if (!user.birthDate) {
      return false;
    }
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

  // Filtre de source d'inscription
  if (filters.registrationSources && filters.registrationSources.length > 0) {
    if (!filters.registrationSources.includes(user.registration.source)) {
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

  // Filtre d'envoi de carte d'adhérent - N'a PAS reçu
  if (filters.membershipCardNotSent) {
    // Vérifier si l'utilisateur n'a PAS reçu sa carte
    const hasReceivedCard = user.emailStatus?.membershipCardSent || false;
    if (hasReceivedCard) {
      return false;
    }
  }

  // Filtre d'envoi de carte d'adhérent - A reçu
  if (filters.membershipCardSent) {
    // Vérifier si l'utilisateur A reçu sa carte
    const hasReceivedCard = user.emailStatus?.membershipCardSent || false;
    if (!hasReceivedCard) {
      return false;
    }
  }

  // Filtre d'exclusion manuelle
  if (filters.excludedUserIds && filters.excludedUserIds.length > 0) {
    if (filters.excludedUserIds.includes(user.uid)) {
      return false;
    }
  }

  // Filtre par liste d'emails (whitelist)
  // Si une whitelist est définie, on ne garde que les users dont l'email est dans la liste
  if (filters.emailWhitelist && filters.emailWhitelist.length > 0) {
    const userEmailLower = user.email.toLowerCase().trim();
    const isInWhitelist = filters.emailWhitelist.some(
      whitelistedEmail => whitelistedEmail.toLowerCase().trim() === userEmailLower
    );
    if (!isInWhitelist) {
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

    // Extraire le HTML et le designJson - ils seront stockés dans la sous-collection
    // `content` pour contourner la limite de 1 MiB par document Firestore.
    const htmlToSave = String(data.content.html || '');
    const designJsonToSave = data.content.designJson || undefined;

    // Construire le content SANS le html (qui ira dans la sous-collection)
    const safeContent: Record<string, string | boolean | number> = {
      subject: String(data.content.subject || ''),
      fromName: String(data.content.fromName || ''),
      fromEmail: String(data.content.fromEmail || ''),
      attachMembershipCard: data.content.attachMembershipCard === true,
      // Flag pour indiquer que le HTML est dans la sous-collection
      htmlInStorage: true,
    };

    // Ajouter les champs optionnels seulement s'ils existent
    if (data.content.replyTo) {
      safeContent.replyTo = String(data.content.replyTo);
    }
    if (data.content.preheader && String(data.content.preheader).trim()) {
      safeContent.preheader = String(data.content.preheader);
    }
    if (data.content.templateId) {
      safeContent.templateId = String(data.content.templateId);
    }

    // Construire le targeting de façon safe
    const safeTargeting: Record<string, any> = {
      mode: String(data.targeting.mode || 'all'),
      estimatedRecipients: Number(data.targeting.estimatedRecipients || 0),
    };
    if (data.targeting.manualUserIds && data.targeting.manualUserIds.length > 0) {
      safeTargeting.manualUserIds = data.targeting.manualUserIds.map(String);
    }
    if (data.targeting.filters) {
      safeTargeting.filters = JSON.parse(JSON.stringify(data.targeting.filters));
    }

    const campaign: Record<string, any> = {
      name: String(data.name),
      status: 'draft',
      content: safeContent,
      targeting: safeTargeting,
      sendImmediately: data.sendImmediately === true,
      stats: createInitialStats(),
      createdBy: String(adminId),
      createdAt: now,
      updatedAt: now,
    };

    if (data.description && data.description.trim()) {
      campaign.description = String(data.description);
    }
    if (data.scheduledAt) {
      campaign.scheduledAt = data.scheduledAt;
    }

    console.log('✅ Données de campagne validées (HTML: ' + (htmlToSave.length / 1024).toFixed(0) + ' KB → chunks)');

    // 1. Créer le document Firestore (sans le gros HTML)
    const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
    const docRef = await addDoc(campaignsRef, campaign);

    // 2. Sauvegarder le HTML et le design en chunks dans la sous-collection
    await saveCampaignContent(docRef.id, htmlToSave, designJsonToSave);

    console.log('✅ Campagne créée avec contenu en chunks');

    return {
      ...campaign,
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

    const cleaned = cleanUndefinedFields(data);

    // Extraire HTML et design du content pour la sous-collection
    let htmlToSave: string | undefined;
    let designJsonToSave: string | undefined;
    if (cleaned.content) {
      htmlToSave = cleaned.content.html;
      designJsonToSave = cleaned.content.designJson;
      // Supprimer les gros champs du content Firestore
      delete cleaned.content.html;
      delete cleaned.content.designJson;
      delete cleaned.content.design;
      cleaned.content.htmlInStorage = true;
      cleaned.content = JSON.parse(JSON.stringify(cleaned.content));
    }
    if (cleaned.targeting) {
      cleaned.targeting = JSON.parse(JSON.stringify(cleaned.targeting));
    }

    const updates = {
      ...cleaned,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(campaignRef, updates);

    // Sauvegarder HTML et design dans la sous-collection `content`
    if (htmlToSave !== undefined || designJsonToSave !== undefined) {
      await saveCampaignContent(campaignId, htmlToSave || '', designJsonToSave);
    }
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
    const contentRef = collection(db, CAMPAIGNS_COLLECTION, campaignId, CONTENT_SUBCOLLECTION);
    const contentSnapshot = await getDocs(contentRef);

    const batch = writeBatch(db);

    // Ajouter tous les destinataires à supprimer dans le batch
    recipientsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    contentSnapshot.docs.forEach(doc => {
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

    if (mode === 'manual' && manualUserIds && manualUserIds.length > 0) {
      // Paralléliser les requêtes pour tous les users sélectionnés
      const userPromises = manualUserIds.map(async (userId) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          return {
            ...userDoc.data(),
            uid: userDoc.id,
          } as User;
        }
        return null;
      });

      const usersOrNull = await Promise.all(userPromises);
      // Filtrer les null (utilisateurs non trouvés)
      return usersOrNull.filter((user): user is User => user !== null);
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
 * @deprecated Les recipients sont créés automatiquement lors de l'envoi via l'API
 * Ne plus utiliser cette fonction - conservée pour compatibilité
 */
export async function createCampaignRecipients(
  _campaignId: string,
  _users: User[]
): Promise<void> {
  console.warn('⚠️ createCampaignRecipients est obsolète - les recipients sont créés automatiquement lors de l\'envoi');
  // Ne rien faire - les recipients sont créés automatiquement par l'API
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
 * @deprecated Plus nécessaire - l'envoi se fait directement via sendCampaignEmails
 * Conservée pour compatibilité
 */
export async function prepareCampaignForSending(_campaignId: string): Promise<void> {
  console.warn('⚠️ prepareCampaignForSending est obsolète - utiliser sendCampaignEmails directement');
  // Ne rien faire - l'envoi se fait directement via sendCampaignEmails
}

/**
 * Type pour le callback de progression d'envoi de campagne
 */
export type SendCampaignProgressCallback = (progress: {
  current: number;
  total: number;
  currentRecipient: string;
  success: number;
  errors: number;
}) => void;

export interface SendCampaignTestResult {
  success: boolean;
  message: string;
  messageId?: string;
  sentAt?: string;
  provider?: 'fornap' | 'brevo';
  fallbackUsed?: boolean;
}

/**
 * Envoie une campagne email - SYSTÈME UNIFIÉ
 *
 * Principe:
 * 1. Récupère tous les utilisateurs ciblés
 * 2. Envoie un email à chaque utilisateur via l'API unifiée
 * 3. L'API crée automatiquement le recipient, injecte le tracking et envoie
 * 4. Suivi en temps réel avec callback de progression
 *
 * L'API /api/campaigns/send-email gère:
 * - Création du recipient dans Firestore
 * - Injection du pixel de tracking
 * - Transformation des liens pour le suivi des clics
 * - Envoi via Nodemailer (no-reply@fornap.fr)
 * - Mise à jour des stats
 */
export async function sendCampaignEmails(
  campaignId: string,
  onProgress?: SendCampaignProgressCallback
): Promise<{
  success: number;
  errors: number;
  total: number;
  errorDetails: Array<{ userId: string; userName: string; error: string }>;
}> {
  try {
    // 1. Récupérer la campagne
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (!campaign.lastTestSentAt) {
      throw new Error('Un email de test doit etre envoye avant l’envoi definitif');
    }

    // 2. Mettre la campagne en statut "sending"
    await updateCampaignStatus(campaignId, 'sending');

    // 3. Récupérer tous les utilisateurs ciblés
    const targetedUsers = await getTargetedUsers(
      campaign.targeting.mode,
      campaign.targeting.manualUserIds,
      campaign.targeting.filters
    );

    const results = {
      success: 0,
      errors: 0,
      total: targetedUsers.length,
      errorDetails: [] as Array<{ userId: string; userName: string; error: string }>,
    };

    let current = 0;

    // 4. Parcourir tous les utilisateurs ciblés
    for (const user of targetedUsers) {
      current++;
      const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

      // Appeler le callback de progression
      if (onProgress) {
        onProgress({
          current,
          total: results.total,
          currentRecipient: userName,
          success: results.success,
          errors: results.errors,
        });
      }

      try {
        // Envoyer l'email à cet utilisateur via l'API unifiée
        const result = await sendCampaignEmail(campaignId, user.uid);

        if (result.success) {
          results.success++;
        } else {
          results.errors++;
          results.errorDetails.push({
            userId: user.uid,
            userName,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error: any) {
        results.errors++;
        results.errorDetails.push({
          userId: user.uid,
          userName,
          error: error.message || 'Unknown error',
        });
      }

      // Petite pause pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 5. Mettre à jour le statut final de la campagne
    await updateCampaignStatus(campaignId, 'sent');

    return results;
  } catch (error: any) {
    console.error('Error sending campaign emails:', error);
    throw error;
  }
}

/**
 * Envoie un email de test pour vérifier le rendu avant diffusion définitive.
 */
export async function sendCampaignTestEmail(
  campaignId: string,
  to: string
): Promise<SendCampaignTestResult> {
  const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/campaigns/send-test`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      campaignId,
      to,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to send campaign test email');
  }

  return data as SendCampaignTestResult;
}

/**
 * Envoie un email de campagne à un utilisateur spécifique
 * Appelle l'API unifiée /api/campaigns/send-email
 *
 * @param campaignId - ID de la campagne
 * @param userId - ID de l'utilisateur
 * @returns Résultat de l'envoi
 */
async function sendCampaignEmail(
  campaignId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Appeler l'API Vercel serverless unifiée
    const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/campaigns/send-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId,
        userId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send campaign email');
    }

    return {
      success: data.success,
      message: data.message || 'Email sent successfully',
    };
  } catch (error: any) {
    console.error('Error sending campaign email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Réessaye l'envoi aux destinataires en échec (SANS progression)
 * @deprecated Utiliser retryFailedEmailsWithProgress pour avoir la progression en temps réel
 *
 * @param campaignId - ID de la campagne
 * @returns Résultat du retry avec statistiques
 */
export async function retryFailedEmails(
  campaignId: string
): Promise<{
  success: boolean;
  message?: string;
  retryCount?: number;
  results?: {
    success: number;
    failed: number;
    total: number;
  };
  errors?: Array<{ email: string; error: string }>;
  error?: string;
}> {
  try {
    const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/campaigns/retry-failed`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaignId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to retry failed emails');
    }

    return data;
  } catch (error: any) {
    console.error('Error retrying failed emails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Réessaye l'envoi aux destinataires en échec AVEC progression en temps réel
 * Similaire à sendCampaignEmails mais uniquement pour les recipients en 'failed'
 *
 * @param campaignId - ID de la campagne
 * @param onProgress - Callback appelé à chaque progression
 * @returns Résultat détaillé du retry
 */
export async function retryFailedEmailsWithProgress(
  campaignId: string,
  onProgress?: SendCampaignProgressCallback
): Promise<{
  success: number;
  errors: number;
  total: number;
  errorDetails: Array<{ email: string; error: string }>;
}> {
  try {
    // 1. Récupérer la campagne
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // 2. Récupérer tous les recipients en échec
    const allRecipients = await getCampaignRecipients(campaignId);
    const failedRecipients = allRecipients.filter((r) => r.status === 'failed');

    if (failedRecipients.length === 0) {
      return {
        success: 0,
        errors: 0,
        total: 0,
        errorDetails: [],
      };
    }

    console.log(`🔄 Retry de ${failedRecipients.length} emails en échec pour la campagne ${campaignId}`);

    const results = {
      success: 0,
      errors: 0,
      total: failedRecipients.length,
      errorDetails: [] as Array<{ email: string; error: string }>,
    };

    let current = 0;

    // 3. Parcourir tous les recipients en échec
    for (const recipient of failedRecipients) {
      current++;
      const recipientName = `${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email;

      // Appeler le callback de progression
      if (onProgress) {
        onProgress({
          current,
          total: results.total,
          currentRecipient: recipientName,
          success: results.success,
          errors: results.errors,
        });
      }

      try {
        // Renvoyer l'email via l'API send-email (qui gère le tracking automatiquement)
        const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/campaigns/send-email`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId,
            userId: recipient.userId,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          results.success++;
          console.log(`✅ Retry réussi pour ${recipient.email}`);
        } else {
          results.errors++;
          results.errorDetails.push({
            email: recipient.email,
            error: data.error || 'Unknown error',
          });
          console.error(`❌ Retry échoué pour ${recipient.email}:`, data.error);
        }
      } catch (error: any) {
        results.errors++;
        results.errorDetails.push({
          email: recipient.email,
          error: error.message || 'Unknown error',
        });
        console.error(`❌ Retry échoué pour ${recipient.email}:`, error);
      }

      // Petite pause pour ne pas surcharger l'API
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`🔄 Retry terminé: ${results.success} succès, ${results.errors} échecs sur ${results.total}`);

    return results;
  } catch (error: any) {
    console.error('Error retrying failed emails with progress:', error);
    throw error;
  }
}
