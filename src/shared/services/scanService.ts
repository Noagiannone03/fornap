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
  limit,
  Timestamp,


} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  ScanMode,
  ScanResultStatus,
} from '../types/scan';
import type {
  ScanResult,
  ScanRecord,
  EventScanStatistics,

  ScanFilters,
  ScannerConfig,
  ScanInsights,
} from '../types/scan';
import type { User } from '../types/user';
import type { EventPurchase } from '../types/event';
import type { AdminUser } from '../types/admin';
import { addActionHistory } from './userService';

/**
 * ============================================
 * QR CODE SCANNING SERVICE
 * ============================================
 * Service pour gérer les scans QR aux événements
 */

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convertit un timestamp de manière sécurisée en Date
 * Gère les différents formats de timestamps (Firestore, plain object, Date, string, number)
 * @param timestamp Timestamp à convertir
 * @returns Date object
 */
function safeToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
  }

  // Si c'est déjà une Date
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Si c'est un Timestamp Firestore avec la méthode toDate()
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Si c'est un objet avec seconds (format Firestore après sérialisation)
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }

  // Si c'est un nombre (timestamp en millisecondes)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  // Si c'est une string ISO
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  // Fallback
  return new Date();
}

/**
 * Extrait les secondes d'un timestamp de manière sécurisée
 * @param timestamp Timestamp quelconque
 * @returns Nombre de secondes depuis epoch
 */
function getTimestampSeconds(timestamp: any): number {
  if (!timestamp) {
    return Date.now() / 1000;
  }

  // Si c'est un objet avec seconds
  if (timestamp.seconds !== undefined) {
    return timestamp.seconds;
  }

  // Si c'est un Timestamp Firestore
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime() / 1000;
  }

  // Si c'est une Date
  if (timestamp instanceof Date) {
    return timestamp.getTime() / 1000;
  }

  // Si c'est un nombre (millisecondes)
  if (typeof timestamp === 'number') {
    // Si > 10000000000, c'est probablement en millisecondes
    return timestamp > 10000000000 ? timestamp / 1000 : timestamp;
  }

  // Fallback
  return Date.now() / 1000;
}

/**
 * Normalise un timestamp en Timestamp Firestore pour l'écriture dans la base
 * Convertit tous les formats en vrai Timestamp Firestore
 * @param timestamp Timestamp quelconque
 * @returns Timestamp Firestore ou undefined
 */
function normalizeTimestamp(timestamp: any): Timestamp | undefined {
  if (!timestamp) {
    return undefined;
  }

  // Si c'est déjà un vrai Timestamp Firestore, le retourner
  if (timestamp instanceof Timestamp) {
    return timestamp;
  }

  // Si c'est un objet avec seconds (plain object de Firestore désérialisé)
  if (timestamp.seconds !== undefined) {
    return Timestamp.fromMillis(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }

  // Si c'est une Date
  if (timestamp instanceof Date) {
    return Timestamp.fromDate(timestamp);
  }

  // Si c'est un nombre (millisecondes)
  if (typeof timestamp === 'number') {
    return Timestamp.fromMillis(timestamp);
  }

  // Si c'est une string ISO
  if (typeof timestamp === 'string') {
    return Timestamp.fromDate(new Date(timestamp));
  }

  // Si ça a une méthode toDate (mais pas un vrai Timestamp), convertir
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    try {
      return Timestamp.fromDate(timestamp.toDate());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Nettoie un objet en supprimant tous les champs undefined
 * Firestore n'accepte pas les valeurs undefined
 * @param obj Objet à nettoyer
 * @returns Nouvel objet sans champs undefined
 */
function cleanUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};

  for (const key in obj) {
    const value: any = obj[key];

    if (value !== undefined) {
      // Si c'est un objet (mais pas Date, Array, ou Timestamp), nettoyer récursivement
      if (
        typeof value === 'object' &&
        value !== null &&
        !(value instanceof Date) &&
        !(value instanceof Timestamp) &&
        !Array.isArray(value)
      ) {
        cleaned[key] = cleanUndefinedFields(value);
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

// ============================================
// QR CODE PARSING
// ============================================

/**
 * Parse un QR code au format "FORNAP-MEMBER:{uid}"
 * @param qrCode Code QR scanné
 * @returns UID utilisateur ou null si invalide
 */
export function parseQRCode(qrCode: string): string | null {
  if (!qrCode || typeof qrCode !== 'string') {
    return null;
  }

  const trimmed = qrCode.trim();
  const prefix = 'FORNAP-MEMBER:';

  if (!trimmed.startsWith(prefix)) {
    return null;
  }

  const uid = trimmed.substring(prefix.length);

  if (!uid || uid.length < 10) {
    return null;
  }

  return uid;
}

/**
 * Génère un QR code pour un utilisateur
 * @param uid UID utilisateur
 * @returns Code QR au format standard
 */
export function generateQRCode(uid: string): string {
  return `FORNAP-MEMBER:${uid}`;
}

// ============================================
// SUBSCRIPTION VERIFICATION
// ============================================

/**
 * Vérifie si l'abonnement d'un utilisateur est actif
 * @param user Document utilisateur
 * @returns true si abonnement actif
 */
function isSubscriptionActive(user: User): boolean {
  if (!user.currentMembership) {
    return false;
  }

  const { status, paymentStatus } = user.currentMembership;

  return status === 'active' && paymentStatus === 'paid';
}

/**
 * Calcule l'âge à partir de la date de naissance
 * @param birthDate Date de naissance (peut être Timestamp, plain object, Date, etc.)
 * @returns Âge en années
 */
function calculateAge(birthDate?: any): number | undefined {
  if (!birthDate) return undefined;

  try {
    const birth = safeToDate(birthDate);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  } catch (error) {
    console.warn('Erreur calcul âge:', error);
    return undefined;
  }
}

/**
 * Détermine si un compte est ancien/migré
 * @param user Document utilisateur
 * @returns true si compte migré
 */
function isLegacyAccount(user: User): boolean {
  return (
    user.registration?.source === 'transfer' ||
    user.status?.tags?.includes('MIGRATED_FROM_LEGACY') ||
    false
  );
}

// ============================================
// MAIN SCAN FUNCTION
// ============================================

/**
 * Effectue un scan QR complet avec vérification
 * @param qrCode Code QR scanné
 * @param config Configuration du scan
 * @param scannerId UID du vérificateur
 * @returns Résultat du scan
 */
export async function performScan(
  qrCode: string,
  config: ScannerConfig,
  scannerId: string
): Promise<ScanResult> {
  try {
    // 1. Parser le QR code
    const uid = parseQRCode(qrCode);

    if (!uid) {
      return {
        status: ScanResultStatus.INVALID_QR,
        message: 'Code QR invalide. Format attendu: FORNAP-MEMBER:{uid}',
        scannedAt: Timestamp.now(),
      };
    }

    // 2. Récupérer l'utilisateur
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (!userDoc.exists()) {
      return {
        status: ScanResultStatus.USER_NOT_FOUND,
        message: 'Utilisateur non trouvé dans la base de données.',
        scannedAt: Timestamp.now(),
      };
    }

    const user = userDoc.data() as User;

    // 3. Vérifier si compte/carte bloqué
    if (user.status?.isAccountBlocked) {
      return {
        status: ScanResultStatus.BLOCKED,
        message: `Compte bloqué: ${user.status.blockedReason || 'Raison non spécifiée'}`,
        user: buildUserInfo(user),
        scannedAt: Timestamp.now(),
      };
    }

    if (user.status?.isCardBlocked) {
      return {
        status: ScanResultStatus.BLOCKED,
        message: `Carte bloquée: ${user.status.blockedReason || 'Raison non spécifiée'}`,
        user: buildUserInfo(user),
        scannedAt: Timestamp.now(),
      };
    }

    // 4. Vérifier l'abonnement
    const hasActiveSubscription = isSubscriptionActive(user);

    if (!hasActiveSubscription) {
      // Enregistrer le scan échoué
      await recordScan(uid, user, config, scannerId, ScanResultStatus.SUBSCRIPTION_INACTIVE);

      return {
        status: ScanResultStatus.SUBSCRIPTION_INACTIVE,
        message: 'Abonnement inactif ou expiré.',
        user: buildUserInfo(user),
        scannedAt: Timestamp.now(),
      };
    }

    // 5. Mode SUBSCRIPTION_ONLY - vérification terminée
    if (config.mode === ScanMode.SUBSCRIPTION_ONLY) {
      await recordScan(uid, user, config, scannerId, ScanResultStatus.SUCCESS);

      return {
        status: ScanResultStatus.SUCCESS,
        message: 'Abonnement actif - Accès autorisé',
        user: buildUserInfo(user),
        scannedAt: Timestamp.now(),
      };
    }

    // 6. Mode EVENT_ATTENDANCE - comptabiliser sans vérifier billet
    if (config.mode === ScanMode.EVENT_ATTENDANCE) {
      if (!config.eventId) {
        throw new Error('eventId requis pour mode EVENT_ATTENDANCE');
      }

      await recordScan(uid, user, config, scannerId, ScanResultStatus.SUCCESS);

      return {
        status: ScanResultStatus.SUCCESS,
        message: 'Présence enregistrée pour cet événement',
        user: buildUserInfo(user),
        scannedAt: Timestamp.now(),
      };
    }

    // 7. Mode EVENT_WITH_TICKET - vérifier billet
    if (config.mode === ScanMode.EVENT_WITH_TICKET) {
      if (!config.eventId) {
        throw new Error('eventId requis pour mode EVENT_WITH_TICKET');
      }

      // Récupérer le billet
      const ticketResult = await checkUserTicket(uid, config.eventId);

      if (!ticketResult.hasTicket) {
        await recordScan(uid, user, config, scannerId, ScanResultStatus.NO_TICKET);

        return {
          status: ScanResultStatus.NO_TICKET,
          message: "Aucun billet trouvé pour cet événement.",
          user: buildUserInfo(user),
          scannedAt: Timestamp.now(),
        };
      }

      if (ticketResult.alreadyScanned) {
        return {
          status: ScanResultStatus.ALREADY_SCANNED,
          message: `Billet déjà scanné le ${ticketResult.scannedAt ? safeToDate(ticketResult.scannedAt).toLocaleString('fr-FR') : 'date inconnue'}`,
          user: buildUserInfo(user),
          ticket: {
            purchaseId: ticketResult.purchaseId!,
            ticketNumber: ticketResult.ticketNumber!,
            ticketCategoryName: ticketResult.ticketCategoryName!,
            alreadyScanned: true,
            scannedAt: ticketResult.scannedAt,
          },
          scannedAt: Timestamp.now(),
        };
      }

      // Marquer le billet comme scanné
      await markTicketAsScanned(config.eventId, ticketResult.purchaseId!, scannerId);

      // Enregistrer le scan réussi
      await recordScan(
        uid,
        user,
        config,
        scannerId,
        ScanResultStatus.SUCCESS,
        ticketResult.purchaseId
      );

      return {
        status: ScanResultStatus.SUCCESS,
        message: 'Billet valide - Accès autorisé',
        user: buildUserInfo(user),
        ticket: {
          purchaseId: ticketResult.purchaseId!,
          ticketNumber: ticketResult.ticketNumber!,
          ticketCategoryName: ticketResult.ticketCategoryName!,
          alreadyScanned: false,
        },
        scannedAt: Timestamp.now(),
      };
    }

    throw new Error(`Mode de scan inconnu: ${config.mode}`);
  } catch (error) {
    console.error('Erreur lors du scan:', error);
    throw error;
  }
}

/**
 * Construit les informations utilisateur pour le résultat
 */
function buildUserInfo(user: User): ScanResult['user'] {
  return {
    uid: user.uid,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    membershipType: user.currentMembership?.planType,
    membershipStatus: user.currentMembership?.status,
    membershipExpiry: user.currentMembership?.expiryDate || undefined,
    isLegacyAccount: isLegacyAccount(user),
    scanCount: user.scanCount || 0,
    birthDate: user.birthDate,
    postalCode: user.postalCode,
    isAccountBlocked: user.status?.isAccountBlocked,
    isCardBlocked: user.status?.isCardBlocked,
  };
}

// ============================================
// TICKET VERIFICATION
// ============================================

interface TicketCheckResult {
  hasTicket: boolean;
  alreadyScanned: boolean;
  purchaseId?: string;
  ticketNumber?: string;
  ticketCategoryName?: string;
  scannedAt?: Timestamp;
}

/**
 * Vérifie si un utilisateur a un billet pour un événement
 * @param userId UID utilisateur
 * @param eventId ID événement
 * @returns Résultat de la vérification
 */
async function checkUserTicket(userId: string, eventId: string): Promise<TicketCheckResult> {
  try {
    const purchasesRef = collection(db, `events/${eventId}/purchases`);
    const q = query(
      purchasesRef,
      where('userId', '==', userId),
      where('status', '==', 'confirmed'),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { hasTicket: false, alreadyScanned: false };
    }

    const purchase = snapshot.docs[0].data() as EventPurchase;

    return {
      hasTicket: true,
      alreadyScanned: purchase.checkedIn || false,
      purchaseId: purchase.id,
      ticketNumber: purchase.ticketNumber,
      ticketCategoryName: purchase.ticketCategoryName,
      scannedAt: purchase.checkedInAt || undefined,
    };
  } catch (error) {
    console.error('Erreur vérification billet:', error);
    throw error;
  }
}

/**
 * Marque un billet comme scanné (check-in)
 * @param eventId ID événement
 * @param purchaseId ID achat
 * @param scannerId UID vérificateur
 */
async function markTicketAsScanned(
  eventId: string,
  purchaseId: string,
  scannerId: string
): Promise<void> {
  try {
    const purchaseRef = doc(db, `events/${eventId}/purchases`, purchaseId);

    await updateDoc(purchaseRef, {
      checkedIn: true,
      checkedInAt: Timestamp.now(),
      checkedInBy: scannerId,
      updatedAt: Timestamp.now(),
    });

    // Incrémenter le compteur de check-in de l'événement
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (eventDoc.exists()) {
      const currentCheckedIn = eventDoc.data().totalCheckedIn || 0;
      await updateDoc(eventRef, {
        totalCheckedIn: currentCheckedIn + 1,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Erreur marquage billet:', error);
    throw error;
  }
}

// ============================================
// SCAN RECORDING
// ============================================

/**
 * Enregistre un scan dans la base de données
 * @param userId UID utilisateur
 * @param user Document utilisateur
 * @param config Configuration du scan
 * @param scannerId UID vérificateur
 * @param result Résultat du scan
 * @param purchaseId ID achat si applicable
 */
async function recordScan(
  userId: string,
  user: User,
  config: ScannerConfig,
  scannerId: string,
  result: ScanResultStatus,
  purchaseId?: string
): Promise<void> {
  try {
    // Récupérer infos du vérificateur
    const scannerDoc = await getDoc(doc(db, 'admins', scannerId));
    const scanner = scannerDoc.data() as AdminUser;

    // Préparer l'enregistrement du scan avec normalisation des timestamps
    const scanRecord: Omit<ScanRecord, 'id'> = {
      userId,
      userInfo: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        membershipType: user.currentMembership?.planType,
        isLegacyAccount: isLegacyAccount(user),
        birthDate: normalizeTimestamp(user.birthDate),
        postalCode: user.postalCode,
        age: calculateAge(user.birthDate),
      },
      scanMode: config.mode,
      eventId: config.eventId,
      purchaseId,
      scanResult: result,
      scannedBy: scannerId,
      scannedByInfo: {
        firstName: scanner?.firstName || '',
        lastName: scanner?.lastName || '',
        role: scanner?.role || '',
      },
      scannedAt: Timestamp.now(),
    };

    // Si scan pour événement, récupérer infos événement
    if (config.eventId) {
      const eventDoc = await getDoc(doc(db, 'events', config.eventId));
      if (eventDoc.exists()) {
        const event = eventDoc.data();
        scanRecord.eventInfo = {
          title: event.title,
          startDate: normalizeTimestamp(event.startDate) || Timestamp.now(),
          type: event.type,
        };
      }

      // Si billet, récupérer infos billet
      if (purchaseId) {
        const purchaseDoc = await getDoc(
          doc(db, `events/${config.eventId}/purchases`, purchaseId)
        );
        if (purchaseDoc.exists()) {
          const purchase = purchaseDoc.data() as EventPurchase;
          scanRecord.ticketInfo = {
            ticketNumber: purchase.ticketNumber,
            ticketCategoryName: purchase.ticketCategoryName,
            price: purchase.totalPrice,
          };
        }
      }
    }

    // Enregistrer le scan
    let collectionPath: string;

    if (config.eventId) {
      // Scan pour événement: stocker dans l'événement
      collectionPath = `events/${config.eventId}/scans`;
    } else {
      // Scan global: stocker dans collection globale
      collectionPath = 'global_scans';
    }

    // Nettoyer les champs undefined avant l'écriture (Firestore n'accepte pas undefined)
    const cleanedScanRecord = cleanUndefinedFields(scanRecord);

    const scanRef = await addDoc(collection(db, collectionPath), cleanedScanRecord);

    // Mettre à jour l'ID
    await updateDoc(scanRef, { id: scanRef.id });

    // Incrémenter le compteur de scans de l'utilisateur
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentScanCount = userDoc.data().scanCount || 0;
      await updateDoc(userRef, {
        scanCount: currentScanCount + 1,
        lastScannedAt: Timestamp.now(),
      });
    }

    // Ajouter à l'historique d'actions de l'utilisateur
    const actionType: 'event_checkin' | 'scan' = config.eventId ? 'event_checkin' : 'scan';
    const actionDescription = config.eventId
      ? `Scan pour l'événement: ${scanRecord.eventInfo?.title || 'Événement'}${result !== ScanResultStatus.SUCCESS ? ' (Refusé: ' + result + ')' : ''}`
      : `Scan QR ${result === ScanResultStatus.SUCCESS ? 'réussi' : 'échoué ('+result+')'}`;

    await addActionHistory(userId, {
      actionType,
      details: {
        description: actionDescription,
        location: scanRecord.location?.latitude && scanRecord.location?.longitude
          ? `${scanRecord.location.latitude}, ${scanRecord.location.longitude}`
          : undefined,
        eventId: config.eventId,
        eventName: scanRecord.eventInfo?.title,
        scannedBy: scanner ? `${scanner.firstName} ${scanner.lastName}` : scannerId,
      },
      deviceType: 'scanner',
    });

    // Ajouter à l'historique de scan de l'admin/employé
    const adminScanHistoryRef = collection(db, 'admins', scannerId, 'scanHistory');
    await addDoc(adminScanHistoryRef, {
      scannedUserId: userId,
      scannedUserInfo: {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        membershipType: user.currentMembership?.planType,
      },
      scanMode: config.mode,
      eventId: config.eventId,
      eventName: scanRecord.eventInfo?.title,
      scanResult: result,
      scannedAt: Timestamp.now(),
      location: scanRecord.location,
    });
  } catch (error) {
    console.error('Erreur enregistrement scan:', error);
    throw error;
  }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Calcule les statistiques de scan pour un événement
 * @param eventId ID événement
 * @returns Statistiques complètes
 */
export async function calculateEventScanStatistics(
  eventId: string
): Promise<EventScanStatistics> {
  try {
    const scansRef = collection(db, `events/${eventId}/scans`);
    const snapshot = await getDocs(scansRef);

    const scans = snapshot.docs.map((doc) => doc.data() as ScanRecord);

    // Initialiser les stats
    const stats: EventScanStatistics = {
      eventId,
      totalScans: scans.length,
      successfulScans: 0,
      scansWithActiveSubscription: 0,
      scansWithValidTicket: 0,
      rejectedSubscription: 0,
      rejectedNoTicket: 0,
      legacyAccountScans: 0,
      byMembershipType: {
        monthly: 0,
        annual: 0,
        lifetime: 0,
        none: 0,
      },
      byAgeGroup: {
        '0-17': 0,
        '18-25': 0,
        '26-35': 0,
        '36-50': 0,
        '51-65': 0,
        '66+': 0,
        unknown: 0,
      },
      topPostalCodes: [],
      scansByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
      scanners: [],
      updatedAt: Timestamp.now(),
    };

    // Compteurs temporaires
    const postalCodeCount = new Map<string, number>();
    const scannerCount = new Map<string, { name: string; count: number }>();

    // Parcourir les scans
    scans.forEach((scan) => {
      // Compter par résultat
      if (scan.scanResult === ScanResultStatus.SUCCESS) {
        stats.successfulScans++;
      }
      if (scan.scanResult === ScanResultStatus.SUBSCRIPTION_INACTIVE) {
        stats.rejectedSubscription++;
      }
      if (scan.scanResult === ScanResultStatus.NO_TICKET) {
        stats.rejectedNoTicket++;
      }

      // Comptes anciens
      if (scan.userInfo.isLegacyAccount) {
        stats.legacyAccountScans++;
      }

      // Par type d'abonnement
      const membershipType = scan.userInfo.membershipType;
      if (membershipType === 'monthly') stats.byMembershipType.monthly++;
      else if (membershipType === 'annual') stats.byMembershipType.annual++;
      else if (membershipType === 'lifetime') stats.byMembershipType.lifetime++;
      else stats.byMembershipType.none++;

      // Par âge
      const age = scan.userInfo.age;
      if (age === undefined) {
        stats.byAgeGroup.unknown++;
      } else if (age <= 17) {
        stats.byAgeGroup['0-17']++;
      } else if (age <= 25) {
        stats.byAgeGroup['18-25']++;
      } else if (age <= 35) {
        stats.byAgeGroup['26-35']++;
      } else if (age <= 50) {
        stats.byAgeGroup['36-50']++;
      } else if (age <= 65) {
        stats.byAgeGroup['51-65']++;
      } else {
        stats.byAgeGroup['66+']++;
      }

      // Par code postal
      const postalCode = scan.userInfo.postalCode;
      if (postalCode) {
        postalCodeCount.set(postalCode, (postalCodeCount.get(postalCode) || 0) + 1);
      }

      // Par heure
      const hour = safeToDate(scan.scannedAt).getHours();
      stats.scansByHour[hour].count++;

      // Par vérificateur
      const scannerKey = scan.scannedBy;
      const scannerName = `${scan.scannedByInfo.firstName} ${scan.scannedByInfo.lastName}`;
      if (scannerCount.has(scannerKey)) {
        scannerCount.get(scannerKey)!.count++;
      } else {
        scannerCount.set(scannerKey, { name: scannerName, count: 1 });
      }

      // Premier et dernier scan
      if (!stats.firstScanAt || getTimestampSeconds(scan.scannedAt) < getTimestampSeconds(stats.firstScanAt)) {
        stats.firstScanAt = scan.scannedAt;
      }
      if (!stats.lastScanAt || getTimestampSeconds(scan.scannedAt) > getTimestampSeconds(stats.lastScanAt)) {
        stats.lastScanAt = scan.scannedAt;
      }

      // Compter scans avec abonnement actif
      if (
        scan.scanResult === ScanResultStatus.SUCCESS ||
        scan.scanResult === ScanResultStatus.NO_TICKET
      ) {
        stats.scansWithActiveSubscription++;
      }

      // Compter scans avec billet valide
      if (scan.scanResult === ScanResultStatus.SUCCESS && scan.ticketInfo) {
        stats.scansWithValidTicket++;
      }
    });

    // Finaliser top codes postaux
    stats.topPostalCodes = Array.from(postalCodeCount.entries())
      .map(([postalCode, count]) => ({ postalCode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Finaliser liste vérificateurs
    stats.scanners = Array.from(scannerCount.entries()).map(([scannerId, data]) => ({
      scannerId,
      name: data.name,
      scanCount: data.count,
    }));

    // Déterminer l'heure de pointe
    const maxHour = stats.scansByHour.reduce((max, current) =>
      current.count > max.count ? current : max
    );
    if (maxHour.count > 0) {
      stats.peakHour = maxHour;
    }

    return stats;
  } catch (error) {
    console.error('Erreur calcul statistiques:', error);
    throw error;
  }
}

/**
 * Récupère les scans d'un événement avec filtres
 * @param eventId ID événement
 * @param filters Filtres optionnels
 * @returns Liste des scans
 */
export async function getEventScans(
  eventId: string,
  filters?: ScanFilters
): Promise<ScanRecord[]> {
  try {
    const scansRef = collection(db, `events/${eventId}/scans`);
    let q = query(scansRef, orderBy('scannedAt', 'desc'));

    // Appliquer filtres
    if (filters?.scannedBy) {
      q = query(q, where('scannedBy', '==', filters.scannedBy));
    }

    const snapshot = await getDocs(q);
    let scans = snapshot.docs.map((doc) => doc.data() as ScanRecord);

    // Filtres côté client (plus complexes)
    if (filters?.scanResult && filters.scanResult.length > 0) {
      scans = scans.filter((scan) => filters.scanResult!.includes(scan.scanResult));
    }

    if (filters?.dateRange) {
      scans = scans.filter(
        (scan) =>
          getTimestampSeconds(scan.scannedAt) >= getTimestampSeconds(filters.dateRange!.start) &&
          getTimestampSeconds(scan.scannedAt) <= getTimestampSeconds(filters.dateRange!.end)
      );
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      scans = scans.filter(
        (scan) =>
          scan.userInfo.firstName.toLowerCase().includes(searchLower) ||
          scan.userInfo.lastName.toLowerCase().includes(searchLower) ||
          scan.userInfo.email.toLowerCase().includes(searchLower)
      );
    }

    return scans;
  } catch (error) {
    console.error('Erreur récupération scans:', error);
    throw error;
  }
}

/**
 * Récupère l'historique de scan d'un admin
 * @param adminId UID de l'admin
 * @param limitCount Nombre maximum de scans à retourner
 * @returns Liste des scans effectués par cet admin
 */
export async function getAdminScanHistory(
  adminId: string,
  limitCount: number = 50
): Promise<any[]> {
  try {
    const historyRef = collection(db, 'admins', adminId, 'scanHistory');
    const q = query(historyRef, orderBy('scannedAt', 'desc'), limit(limitCount));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Erreur récupération historique admin:', error);
    throw error;
  }
}

/**
 * Récupère les scans globaux (abonnement uniquement)
 * @param filters Filtres optionnels
 * @returns Liste des scans
 */
export async function getGlobalScans(filters?: ScanFilters): Promise<ScanRecord[]> {
  try {
    const scansRef = collection(db, 'global_scans');
    let q = query(scansRef, orderBy('scannedAt', 'desc'), limit(100));

    const snapshot = await getDocs(q);
    let scans = snapshot.docs.map((doc) => doc.data() as ScanRecord);

    // Appliquer filtres
    if (filters?.userId) {
      scans = scans.filter((scan) => scan.userId === filters.userId);
    }

    if (filters?.scannedBy) {
      scans = scans.filter((scan) => scan.scannedBy === filters.scannedBy);
    }

    if (filters?.dateRange) {
      scans = scans.filter(
        (scan) =>
          getTimestampSeconds(scan.scannedAt) >= getTimestampSeconds(filters.dateRange!.start) &&
          getTimestampSeconds(scan.scannedAt) <= getTimestampSeconds(filters.dateRange!.end)
      );
    }

    return scans;
  } catch (error) {
    console.error('Erreur récupération scans globaux:', error);
    throw error;
  }
}

/**
 * Génère des insights à partir des statistiques
 * @param stats Statistiques événement
 * @returns Insights et recommandations
 */
export function generateScanInsights(stats: EventScanStatistics): ScanInsights {
  const successRate = stats.totalScans > 0 ? (stats.successfulScans / stats.totalScans) * 100 : 0;

  const activeSubscriptionRate =
    stats.totalScans > 0 ? (stats.scansWithActiveSubscription / stats.totalScans) * 100 : 0;

  // Trouver tranche d'âge dominante
  const ageEntries = Object.entries(stats.byAgeGroup);
  const dominantAgeEntry = ageEntries.reduce((max, current) =>
    current[1] > max[1] ? current : max
  );

  // Trouver type d'abonnement dominant
  const membershipEntries = Object.entries(stats.byMembershipType);
  const dominantMembershipEntry = membershipEntries.reduce((max, current) =>
    current[1] > max[1] ? current : max
  );

  // Étendue géographique
  const uniquePostalCodes = stats.topPostalCodes.length;
  let geographicSpread: 'local' | 'regional' | 'national';
  if (uniquePostalCodes < 5) geographicSpread = 'local';
  else if (uniquePostalCodes < 20) geographicSpread = 'regional';
  else geographicSpread = 'national';

  // Générer recommandations
  const recommendations: string[] = [];

  if (successRate < 80) {
    recommendations.push(
      'Taux de succès faible - Communiquer sur les prérequis (abonnement actif + billet)'
    );
  }

  if (stats.rejectedSubscription > stats.totalScans * 0.2) {
    recommendations.push(
      'Beaucoup d\'abonnements inactifs - Proposer renouvellement sur place'
    );
  }

  if (stats.legacyAccountScans > 0) {
    recommendations.push(
      `${stats.legacyAccountScans} anciens comptes détectés - Envisager migration complète`
    );
  }

  if (stats.peakHour) {
    recommendations.push(
      `Heure de pointe: ${stats.peakHour.hour}h - Prévoir plus de vérificateurs`
    );
  }

  return {
    successRate,
    activeSubscriptionRate,
    demographicTrends: {
      dominantAgeGroup: dominantAgeEntry[0],
      dominantMembershipType: dominantMembershipEntry[0],
      geographicSpread,
    },
    recommendations,
  };
}
