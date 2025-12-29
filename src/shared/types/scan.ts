import { Timestamp } from 'firebase/firestore';
import type { MembershipType } from './user';

/**
 * ============================================
 * QR CODE SCAN SYSTEM
 * ============================================
 * Système de scan QR pour la vérification aux événements
 * Format QR: "FORNAP-MEMBER:{uid}"
 */

// ============================================
// SCAN MODES
// ============================================

/**
 * Mode de scan déterminant ce qui doit être vérifié
 */
export const ScanMode = {
  /** Vérifier uniquement si l'abonnement est actif */
  SUBSCRIPTION_ONLY: 'subscription_only',

  /** Scanner pour un événement - comptabiliser présence sans vérifier billet */
  EVENT_ATTENDANCE: 'event_attendance',

  /** Scanner pour un événement - vérifier abonnement + billet */
  EVENT_WITH_TICKET: 'event_with_ticket',

  /** Scanner pour la Soirée Inkipit - vérifier abonnement + billet PACK PARTY HARDER */
  INKIPIT_EVENT: 'inkipit_event',
} as const;

export type ScanMode = (typeof ScanMode)[keyof typeof ScanMode];

// ============================================
// SCAN RESULT
// ============================================

/**
 * Résultat d'un scan QR
 */
export const ScanResultStatus = {
  /** Scan réussi - tout est valide */
  SUCCESS: 'success',

  /** Erreur - abonnement inactif ou expiré */
  SUBSCRIPTION_INACTIVE: 'subscription_inactive',

  /** Erreur - pas de billet pour cet événement */
  NO_TICKET: 'no_ticket',

  /** Erreur - billet déjà scanné */
  ALREADY_SCANNED: 'already_scanned',

  /** Erreur - utilisateur non trouvé */
  USER_NOT_FOUND: 'user_not_found',

  /** Erreur - QR code invalide */
  INVALID_QR: 'invalid_qr',

  /** Erreur - compte ou carte bloqué */
  BLOCKED: 'blocked',

  /** Warning - ancien compte migré */
  LEGACY_ACCOUNT: 'legacy_account',
} as const;

export type ScanResultStatus = (typeof ScanResultStatus)[keyof typeof ScanResultStatus];

/**
 * Résultat complet d'un scan
 */
export interface ScanResult {
  /** Status du scan */
  status: ScanResultStatus;

  /** Message explicatif */
  message: string;

  /** Informations utilisateur si trouvé */
  user?: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    membershipType?: MembershipType;
    membershipStatus?: string;
    membershipExpiry?: Timestamp;
    isLegacyAccount: boolean;
    scanCount?: number;
    birthDate?: Timestamp;
    postalCode?: string;
    isAccountBlocked?: boolean;
    isCardBlocked?: boolean;
  };

  /** Informations billet si mode EVENT_WITH_TICKET */
  ticket?: {
    purchaseId: string;
    ticketNumber: string;
    ticketCategoryName: string;
    alreadyScanned: boolean;
    scannedAt?: Timestamp;
  };

  /** Timestamp du scan */
  scannedAt: Timestamp;
}

// ============================================
// SCAN RECORD (DATABASE)
// ============================================

/**
 * Enregistrement d'un scan dans Firestore
 * Stocké dans: events/{eventId}/scans/{scanId} ou global_scans/{scanId}
 */
export interface ScanRecord {
  /** ID unique du scan */
  id: string;

  /** UID de l'utilisateur scanné */
  userId: string;

  /** Informations utilisateur dénormalisées */
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    membershipType?: MembershipType;
    isLegacyAccount: boolean;
    birthDate?: Timestamp;
    postalCode?: string;
    age?: number; // Calculé au moment du scan
  };

  /** Mode de scan utilisé */
  scanMode: ScanMode;

  /** ID événement si scan pour événement */
  eventId?: string;

  /** Informations événement dénormalisées */
  eventInfo?: {
    title: string;
    startDate: Timestamp;
    type: string;
  };

  /** ID du billet si mode EVENT_WITH_TICKET */
  purchaseId?: string;

  /** Informations billet dénormalisées */
  ticketInfo?: {
    ticketNumber: string;
    ticketCategoryName: string;
    price: number;
  };

  /** Résultat du scan */
  scanResult: ScanResultStatus;

  /** Vérificateur qui a effectué le scan */
  scannedBy: string;

  /** Informations du vérificateur */
  scannedByInfo: {
    firstName: string;
    lastName: string;
    role: string;
  };

  /** Timestamp du scan */
  scannedAt: Timestamp;

  /** Localisation du scan (optionnel) */
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };

  /** Device info (optionnel) */
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
  };

  /** Notes additionnelles */
  notes?: string;
}

// ============================================
// SCAN STATISTICS
// ============================================

/**
 * Statistiques de scan pour un événement
 */
export interface EventScanStatistics {
  /** ID de l'événement */
  eventId: string;

  /** Total de scans effectués */
  totalScans: number;

  /** Scans avec succès */
  successfulScans: number;

  /** Scans avec abonnement actif */
  scansWithActiveSubscription: number;

  /** Scans avec billet valide */
  scansWithValidTicket: number;

  /** Scans refusés (abonnement inactif) */
  rejectedSubscription: number;

  /** Scans refusés (pas de billet) */
  rejectedNoTicket: number;

  /** Comptes anciens/migrés scannés */
  legacyAccountScans: number;

  /** Distribution par type d'abonnement */
  byMembershipType: {
    monthly: number;
    annual: number;
    lifetime: number;
    none: number;
  };

  /** Distribution par tranche d'âge */
  byAgeGroup: {
    '0-17': number;
    '18-25': number;
    '26-35': number;
    '36-50': number;
    '51-65': number;
    '66+': number;
    unknown: number;
  };

  /** Distribution par code postal (top 10) */
  topPostalCodes: Array<{
    postalCode: string;
    count: number;
  }>;

  /** Scans par heure (pour détecter les heures de pointe) */
  scansByHour: Array<{
    hour: number; // 0-23
    count: number;
  }>;

  /** Heure de pointe */
  peakHour?: {
    hour: number;
    count: number;
  };

  /** Premier et dernier scan */
  firstScanAt?: Timestamp;
  lastScanAt?: Timestamp;

  /** Liste des vérificateurs */
  scanners: Array<{
    scannerId: string;
    name: string;
    scanCount: number;
  }>;

  /** Dernière mise à jour des stats */
  updatedAt: Timestamp;
}

/**
 * Statistiques globales de scan (toutes périodes/événements)
 */
export interface GlobalScanStatistics {
  /** Total de scans tous événements confondus */
  totalScans: number;

  /** Scans aujourd'hui */
  scansToday: number;

  /** Scans cette semaine */
  scansThisWeek: number;

  /** Scans ce mois */
  scansThisMonth: number;

  /** Top événements par nombre de scans */
  topEvents: Array<{
    eventId: string;
    eventTitle: string;
    scanCount: number;
  }>;

  /** Top vérificateurs */
  topScanners: Array<{
    scannerId: string;
    name: string;
    scanCount: number;
  }>;

  /** Dernière mise à jour */
  updatedAt: Timestamp;
}

// ============================================
// SCANNER CONFIGURATION
// ============================================

/**
 * Configuration d'une session de scan
 */
export interface ScannerConfig {
  /** Mode de scan */
  mode: ScanMode;

  /** ID événement si scan pour événement */
  eventId?: string;

  /** Activer la géolocalisation */
  enableLocation?: boolean;

  /** Activer le feedback sonore */
  enableSound?: boolean;

  /** Activer les vibrations */
  enableVibration?: boolean;

  /** Délai avant permettre un nouveau scan du même QR (ms) */
  scanCooldown?: number;
}

// ============================================
// FILTERS & QUERIES
// ============================================

/**
 * Filtres pour rechercher des scans
 */
export interface ScanFilters {
  /** Filtrer par événement */
  eventId?: string;

  /** Filtrer par utilisateur */
  userId?: string;

  /** Filtrer par vérificateur */
  scannedBy?: string;

  /** Filtrer par résultat */
  scanResult?: ScanResultStatus[];

  /** Filtrer par mode */
  scanMode?: ScanMode[];

  /** Filtrer par plage de dates */
  dateRange?: {
    start: Timestamp;
    end: Timestamp;
  };

  /** Recherche texte (nom, email) */
  search?: string;
}

/**
 * Options de tri pour les scans
 */
export interface ScanSortOptions {
  field: 'scannedAt' | 'userInfo.lastName' | 'scanResult';
  direction: 'asc' | 'desc';
}

// ============================================
// FORM DATA
// ============================================

/**
 * Données pour créer manuellement un scan
 */
export interface CreateScanData {
  qrCode: string;
  mode: ScanMode;
  eventId?: string;
  notes?: string;
}

/**
 * Données pour exporter les scans
 */
export interface ExportScanData {
  eventId?: string;
  filters?: ScanFilters;
  format: 'csv' | 'json' | 'xlsx';
}

// ============================================
// UI STATE
// ============================================

/**
 * État de l'interface scanner
 */
export interface ScannerUIState {
  /** Scanner actif ou en pause */
  isScanning: boolean;

  /** Scan en cours */
  isProcessing: boolean;

  /** Dernier résultat */
  lastResult?: ScanResult;

  /** Historique des derniers scans (5 derniers) */
  recentScans: ScanResult[];

  /** Configuration active */
  config: ScannerConfig;

  /** Erreur de caméra */
  cameraError?: string;

  /** Permissions caméra accordées */
  cameraPermission: 'granted' | 'denied' | 'prompt';
}

/**
 * Props pour le composant scanner
 */
export interface QRScannerProps {
  /** Configuration initiale */
  initialConfig?: Partial<ScannerConfig>;

  /** Callback quand scan réussi */
  onScanSuccess?: (result: ScanResult) => void;

  /** Callback quand scan échoué */
  onScanError?: (error: Error) => void;

  /** Afficher l'historique des scans */
  showHistory?: boolean;

  /** Mode compact (pour intégration) */
  compact?: boolean;
}

// ============================================
// ANALYTICS & INSIGHTS
// ============================================

/**
 * Insights générés à partir des données de scan
 */
export interface ScanInsights {
  /** Taux de conversion (scans réussis / total) */
  successRate: number;

  /** Taux d'abonnés actifs */
  activeSubscriptionRate: number;

  /** Durée moyenne entre scans (pour détecter flux) */
  averageTimeBetweenScans?: number;

  /** Prédiction de l'affluence */
  predictedPeakTimes?: Array<{
    hour: number;
    confidence: number;
  }>;

  /** Tendances démographiques */
  demographicTrends: {
    dominantAgeGroup: string;
    dominantMembershipType: string;
    geographicSpread: 'local' | 'regional' | 'national';
  };

  /** Recommandations */
  recommendations: string[];
}
