import type { MembershipType, MembershipStatus, RegistrationSource } from '../../shared/types/user';

// ============================================================================
// CHAMPS EXPORTABLES
// ============================================================================

/**
 * Tous les champs possibles pour l'export utilisateur
 */
export type UserExportField =
    // Informations de base
    | 'uid'
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'phone'
    | 'postalCode'
    | 'birthDate'
    // Abonnement
    | 'membershipType'
    | 'membershipStatus'
    | 'membershipPlanName'
    | 'membershipStartDate'
    | 'membershipExpiryDate'
    | 'membershipPrice'
    // Statut & Tags
    | 'tags'
    | 'loyaltyPoints'
    | 'isAccountBlocked'
    | 'isCardBlocked'
    // Métadonnées
    | 'registrationSource'
    | 'createdAt'
    | 'emailCardSent'
    | 'emailCardSentCount'
    | 'emailCardSentAt';

/**
 * Configuration d'un champ exportable pour l'UI
 */
export interface ExportFieldConfig {
    key: UserExportField;
    label: string;
    labelCSV: string; // Nom de colonne pour l'export
    group: 'basic' | 'membership' | 'status' | 'meta';
    defaultSelected: boolean;
}

/**
 * Configuration complète de tous les champs exportables
 */
export const EXPORT_FIELDS: ExportFieldConfig[] = [
    // Informations de base
    { key: 'uid', label: 'UID', labelCSV: 'UID', group: 'basic', defaultSelected: false },
    { key: 'firstName', label: 'Prénom', labelCSV: 'Prenom', group: 'basic', defaultSelected: true },
    { key: 'lastName', label: 'Nom', labelCSV: 'Nom', group: 'basic', defaultSelected: true },
    { key: 'email', label: 'Email', labelCSV: 'Email', group: 'basic', defaultSelected: true },
    { key: 'phone', label: 'Téléphone', labelCSV: 'Telephone', group: 'basic', defaultSelected: true },
    { key: 'postalCode', label: 'Code postal', labelCSV: 'Code_Postal', group: 'basic', defaultSelected: true },
    { key: 'birthDate', label: 'Date de naissance', labelCSV: 'Date_Naissance', group: 'basic', defaultSelected: false },

    // Abonnement
    { key: 'membershipType', label: 'Type d\'abonnement', labelCSV: 'Type_Abonnement', group: 'membership', defaultSelected: true },
    { key: 'membershipStatus', label: 'Statut abonnement', labelCSV: 'Statut_Abonnement', group: 'membership', defaultSelected: true },
    { key: 'membershipPlanName', label: 'Nom du plan', labelCSV: 'Nom_Plan', group: 'membership', defaultSelected: false },
    { key: 'membershipStartDate', label: 'Date de début', labelCSV: 'Date_Debut_Abonnement', group: 'membership', defaultSelected: false },
    { key: 'membershipExpiryDate', label: 'Date d\'expiration', labelCSV: 'Date_Expiration', group: 'membership', defaultSelected: false },
    { key: 'membershipPrice', label: 'Prix', labelCSV: 'Prix_Abonnement', group: 'membership', defaultSelected: false },

    // Statut & Tags
    { key: 'tags', label: 'Tags', labelCSV: 'Tags', group: 'status', defaultSelected: true },
    { key: 'loyaltyPoints', label: 'Points de fidélité', labelCSV: 'Points_Fidelite', group: 'status', defaultSelected: false },
    { key: 'isAccountBlocked', label: 'Compte bloqué', labelCSV: 'Compte_Bloque', group: 'status', defaultSelected: false },
    { key: 'isCardBlocked', label: 'Carte bloquée', labelCSV: 'Carte_Bloquee', group: 'status', defaultSelected: false },

    // Métadonnées
    { key: 'registrationSource', label: 'Source d\'inscription', labelCSV: 'Source_Inscription', group: 'meta', defaultSelected: true },
    { key: 'createdAt', label: 'Date d\'inscription', labelCSV: 'Date_Inscription', group: 'meta', defaultSelected: true },
    { key: 'emailCardSent', label: 'Email carte envoyé', labelCSV: 'Email_Carte_Envoye', group: 'meta', defaultSelected: false },
    { key: 'emailCardSentCount', label: 'Nb envois email carte', labelCSV: 'Nb_Envois_Email_Carte', group: 'meta', defaultSelected: false },
    { key: 'emailCardSentAt', label: 'Date envoi email carte', labelCSV: 'Date_Envoi_Email_Carte', group: 'meta', defaultSelected: false },
];

/**
 * Labels des groupes de champs
 */
export const EXPORT_FIELD_GROUPS: Record<ExportFieldConfig['group'], string> = {
    basic: 'Informations de base',
    membership: 'Abonnement',
    status: 'Statut & Tags',
    meta: 'Métadonnées',
};

// ============================================================================
// FILTRES D'EXPORT
// ============================================================================

/**
 * Filtres pour l'export des utilisateurs
 */
export interface UserExportFilters {
    // Texte libre
    search?: string;

    // Membership
    membershipTypes?: MembershipType[];
    membershipStatus?: MembershipStatus[];

    // Tags
    includeTags?: string[];
    excludeTags?: string[];

    // Période d'inscription
    registrationDateRange?: {
        start?: Date | null;
        end?: Date | null;
    };

    // Source d'inscription
    registrationSources?: RegistrationSource[];

    // Points de fidélité
    loyaltyPointsRange?: {
        min?: number;
        max?: number;
    };

    // Statut de blocage
    blockedFilter?: 'all' | 'not_blocked' | 'account_blocked' | 'card_blocked';

    // Email carte d'adhérent
    emailCardFilter?: 'all' | 'sent' | 'not_sent';
}

/**
 * Options d'export
 */
export interface UserExportOptions {
    format: 'csv' | 'xlsx';
    selectedFields: UserExportField[];
    filters: UserExportFilters;
    filename?: string;
}

/**
 * Crée des filtres d'export par défaut (aucun filtre)
 */
export function createDefaultExportFilters(): UserExportFilters {
    return {
        search: '',
        membershipTypes: [],
        membershipStatus: [],
        includeTags: [],
        excludeTags: [],
        registrationDateRange: { start: null, end: null },
        registrationSources: [],
        loyaltyPointsRange: { min: undefined, max: undefined },
        blockedFilter: 'all',
        emailCardFilter: 'all',
    };
}

/**
 * Retourne les champs sélectionnés par défaut
 */
export function getDefaultSelectedFields(): UserExportField[] {
    return EXPORT_FIELDS.filter(f => f.defaultSelected).map(f => f.key);
}
