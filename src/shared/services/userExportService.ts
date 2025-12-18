import * as XLSX from 'xlsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, MemberTag } from '../types/user';
import {
    MEMBERSHIP_TYPE_LABELS,
    MEMBERSHIP_STATUS_LABELS,
    REGISTRATION_SOURCE_LABELS,
} from '../types/user';
import type {
    UserExportField,
    UserExportFilters,
    UserExportOptions,
} from '../../admin/types/exportTypes';
import { EXPORT_FIELDS } from '../../admin/types/exportTypes';

const USERS_COLLECTION = 'users';

// ============================================================================
// CONVERSION DE DATES
// ============================================================================

/**
 * Convertit un timestamp Firestore (tous formats) en Date JS
 * Retourne null si la conversion échoue
 */
function toDate(timestamp: any): Date | null {
    if (!timestamp) return null;

    try {
        // Si c'est déjà une Date
        if (timestamp instanceof Date) {
            return timestamp;
        }

        // Si c'est un Timestamp Firestore avec la méthode toDate()
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate();
        }

        // Si c'est un objet avec seconds (format Firestore après sérialisation)
        if (typeof timestamp === 'object' && ('seconds' in timestamp || '_seconds' in timestamp)) {
            const seconds = timestamp.seconds ?? timestamp._seconds ?? 0;
            const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
            return new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
        }

        // Si c'est un nombre (timestamp en millisecondes ou secondes)
        if (typeof timestamp === 'number') {
            if (timestamp < 10000000000) {
                return new Date(timestamp * 1000);
            }
            return new Date(timestamp);
        }

        // Si c'est une string ISO
        if (typeof timestamp === 'string') {
            const parsed = new Date(timestamp);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return null;
    } catch (e) {
        console.error('Error parsing timestamp:', e, timestamp);
        return null;
    }
}

/**
 * Formatte une date en format français (DD/MM/YYYY)
 * Retourne "N/A" si la date est invalide
 */
function formatDate(timestamp: any): string {
    const date = toDate(timestamp);
    if (!date || date.getTime() === 0) return 'N/A';
    return date.toLocaleDateString('fr-FR');
}

// ============================================================================
// RÉCUPÉRATION DES DONNÉES COMPLÈTES
// ============================================================================

/**
 * Récupère tous les utilisateurs avec toutes leurs données
 * (Pas la version simplifiée UserListItem)
 */
async function getAllUsersComplete(): Promise<User[]> {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const querySnapshot = await getDocs(usersRef);

        const users: User[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data() as User;
            users.push({
                ...data,
                uid: doc.id,
            });
        });

        return users;
    } catch (error) {
        console.error('Error fetching users for export:', error);
        throw error;
    }
}

// ============================================================================
// FILTRAGE DES UTILISATEURS
// ============================================================================

/**
 * Applique les filtres d'export à une liste d'utilisateurs complets
 */
export function applyExportFilters(
    users: User[],
    filters: UserExportFilters
): User[] {
    let filtered = [...users];

    // Filtre de recherche textuelle
    if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        filtered = filtered.filter(
            (user) =>
                (user.firstName?.toLowerCase().includes(searchLower)) ||
                (user.lastName?.toLowerCase().includes(searchLower)) ||
                (user.email?.toLowerCase().includes(searchLower)) ||
                (user.uid?.toLowerCase().includes(searchLower))
        );
    }

    // Filtre par type d'abonnement
    if (filters.membershipTypes && filters.membershipTypes.length > 0) {
        filtered = filtered.filter((user) =>
            user.currentMembership?.planType &&
            filters.membershipTypes!.includes(user.currentMembership.planType)
        );
    }

    // Filtre par statut d'abonnement
    if (filters.membershipStatus && filters.membershipStatus.length > 0) {
        filtered = filtered.filter((user) =>
            user.currentMembership?.status &&
            filters.membershipStatus!.includes(user.currentMembership.status)
        );
    }

    // Filtre par tags à inclure (au moins un)
    if (filters.includeTags && filters.includeTags.length > 0) {
        filtered = filtered.filter((user) => {
            const userTags = user.status?.tags || [];
            return filters.includeTags!.some((tag) => userTags.includes(tag as MemberTag));
        });
    }

    // Filtre par tags à exclure
    if (filters.excludeTags && filters.excludeTags.length > 0) {
        filtered = filtered.filter((user) => {
            const userTags = user.status?.tags || [];
            return !filters.excludeTags!.some((tag) => userTags.includes(tag as MemberTag));
        });
    }

    // Filtre par période d'inscription
    if (filters.registrationDateRange) {
        const { start, end } = filters.registrationDateRange;

        if (start) {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            filtered = filtered.filter((user) => {
                const userDate = toDate(user.createdAt);
                return userDate && userDate >= startOfDay;
            });
        }

        if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            filtered = filtered.filter((user) => {
                const userDate = toDate(user.createdAt);
                return userDate && userDate <= endOfDay;
            });
        }
    }

    // Filtre par source d'inscription
    if (filters.registrationSources && filters.registrationSources.length > 0) {
        filtered = filtered.filter((user) =>
            user.registration?.source &&
            filters.registrationSources!.includes(user.registration.source)
        );
    }

    // Filtre par points de fidélité
    if (filters.loyaltyPointsRange) {
        const { min, max } = filters.loyaltyPointsRange;

        if (min !== undefined && min !== null) {
            filtered = filtered.filter((user) => (user.loyaltyPoints || 0) >= min);
        }

        if (max !== undefined && max !== null) {
            filtered = filtered.filter((user) => (user.loyaltyPoints || 0) <= max);
        }
    }

    // Filtre par statut de blocage
    if (filters.blockedFilter && filters.blockedFilter !== 'all') {
        switch (filters.blockedFilter) {
            case 'not_blocked':
                filtered = filtered.filter(
                    (user) => !user.status?.isAccountBlocked && !user.status?.isCardBlocked
                );
                break;
            case 'account_blocked':
                filtered = filtered.filter((user) => user.status?.isAccountBlocked);
                break;
            case 'card_blocked':
                filtered = filtered.filter((user) => user.status?.isCardBlocked);
                break;
        }
    }

    // Filtre par envoi email carte d'adhérent
    if (filters.emailCardFilter && filters.emailCardFilter !== 'all') {
        switch (filters.emailCardFilter) {
            case 'sent':
                filtered = filtered.filter(
                    (user) => user.emailStatus?.membershipCardSent === true
                );
                break;
            case 'not_sent':
                filtered = filtered.filter(
                    (user) => !user.emailStatus?.membershipCardSent
                );
                break;
        }
    }

    return filtered;
}

/**
 * Compte le nombre d'utilisateurs correspondant aux filtres
 * NOTE: Cette fonction utilise UserListItem pour la compatibilité avec le modal
 * Elle applique les mêmes filtres mais avec des champs disponibles dans UserListItem
 */
export function countFilteredUsersFromListItems(
    users: Array<{
        uid: string;
        email: string;
        firstName: string;
        lastName: string;
        membership: { type: string; status: string };
        loyaltyPoints: number;
        tags: string[];
        createdAt: any;
        isAccountBlocked: boolean;
        isCardBlocked: boolean;
        registrationSource: string;
        emailStatus?: { membershipCardSent?: boolean };
    }>,
    filters: UserExportFilters
): number {
    let filtered = [...users];

    // Filtre de recherche textuelle
    if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        filtered = filtered.filter(
            (user) =>
                user.firstName.toLowerCase().includes(searchLower) ||
                user.lastName.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                user.uid.toLowerCase().includes(searchLower)
        );
    }

    // Filtre par type d'abonnement
    if (filters.membershipTypes && filters.membershipTypes.length > 0) {
        filtered = filtered.filter((user) =>
            filters.membershipTypes!.includes(user.membership.type as any)
        );
    }

    // Filtre par statut d'abonnement
    if (filters.membershipStatus && filters.membershipStatus.length > 0) {
        filtered = filtered.filter((user) =>
            filters.membershipStatus!.includes(user.membership.status as any)
        );
    }

    // Filtre par tags à inclure
    if (filters.includeTags && filters.includeTags.length > 0) {
        filtered = filtered.filter((user) =>
            filters.includeTags!.some((tag) => user.tags.includes(tag))
        );
    }

    // Filtre par tags à exclure
    if (filters.excludeTags && filters.excludeTags.length > 0) {
        filtered = filtered.filter(
            (user) => !filters.excludeTags!.some((tag) => user.tags.includes(tag))
        );
    }

    // Filtre par période d'inscription
    if (filters.registrationDateRange) {
        const { start, end } = filters.registrationDateRange;

        if (start) {
            const startOfDay = new Date(start);
            startOfDay.setHours(0, 0, 0, 0);
            filtered = filtered.filter((user) => {
                const userDate = toDate(user.createdAt);
                return userDate && userDate >= startOfDay;
            });
        }

        if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            filtered = filtered.filter((user) => {
                const userDate = toDate(user.createdAt);
                return userDate && userDate <= endOfDay;
            });
        }
    }

    // Filtre par source d'inscription
    if (filters.registrationSources && filters.registrationSources.length > 0) {
        filtered = filtered.filter((user) =>
            filters.registrationSources!.includes(user.registrationSource as any)
        );
    }

    // Filtre par points de fidélité
    if (filters.loyaltyPointsRange) {
        const { min, max } = filters.loyaltyPointsRange;

        if (min !== undefined && min !== null) {
            filtered = filtered.filter((user) => user.loyaltyPoints >= min);
        }

        if (max !== undefined && max !== null) {
            filtered = filtered.filter((user) => user.loyaltyPoints <= max);
        }
    }

    // Filtre par statut de blocage
    if (filters.blockedFilter && filters.blockedFilter !== 'all') {
        switch (filters.blockedFilter) {
            case 'not_blocked':
                filtered = filtered.filter(
                    (user) => !user.isAccountBlocked && !user.isCardBlocked
                );
                break;
            case 'account_blocked':
                filtered = filtered.filter((user) => user.isAccountBlocked);
                break;
            case 'card_blocked':
                filtered = filtered.filter((user) => user.isCardBlocked);
                break;
        }
    }

    // Filtre par envoi email carte d'adhérent
    if (filters.emailCardFilter && filters.emailCardFilter !== 'all') {
        switch (filters.emailCardFilter) {
            case 'sent':
                filtered = filtered.filter(
                    (user) => user.emailStatus?.membershipCardSent === true
                );
                break;
            case 'not_sent':
                filtered = filtered.filter(
                    (user) => !user.emailStatus?.membershipCardSent
                );
                break;
        }
    }

    return filtered.length;
}

// Alias pour compatibilité
export const countFilteredUsers = countFilteredUsersFromListItems;

// ============================================================================
// EXTRACTION DES CHAMPS
// ============================================================================

/**
 * Extrait les champs sélectionnés d'un utilisateur complet pour l'export
 */
function extractUserFields(
    user: User,
    selectedFields: UserExportField[]
): Record<string, string> {
    const result: Record<string, string> = {};
    const fieldConfigs = EXPORT_FIELDS.filter((f) =>
        selectedFields.includes(f.key)
    );

    for (const fieldConfig of fieldConfigs) {
        const value = getFieldValue(user, fieldConfig.key);
        result[fieldConfig.labelCSV] = value;
    }

    return result;
}

/**
 * Récupère la valeur d'un champ pour un utilisateur complet
 * Utilise les données complètes de l'objet User
 */
function getFieldValue(user: User, field: UserExportField): string {
    switch (field) {
        // ===== Informations de base =====
        case 'uid':
            return user.uid || 'N/A';

        case 'email':
            return user.email || 'N/A';

        case 'firstName':
            return user.firstName || 'N/A';

        case 'lastName':
            return user.lastName || 'N/A';

        case 'phone':
            return user.phone || 'N/A';

        case 'postalCode':
            return user.postalCode || 'N/A';

        case 'birthDate':
            return formatDate(user.birthDate);

        // ===== Abonnement =====
        case 'membershipType':
            if (!user.currentMembership?.planType) return 'N/A';
            return MEMBERSHIP_TYPE_LABELS[user.currentMembership.planType] || user.currentMembership.planType;

        case 'membershipStatus':
            if (!user.currentMembership?.status) return 'N/A';
            return MEMBERSHIP_STATUS_LABELS[user.currentMembership.status] || user.currentMembership.status;

        case 'membershipPlanName':
            return user.currentMembership?.planName || 'N/A';

        case 'membershipStartDate':
            return formatDate(user.currentMembership?.startDate);

        case 'membershipExpiryDate':
            if (!user.currentMembership?.expiryDate) {
                // Abonnement à vie = pas d'expiration
                if (user.currentMembership?.planType === 'lifetime') {
                    return 'Illimité';
                }
                return 'N/A';
            }
            return formatDate(user.currentMembership.expiryDate);

        case 'membershipPrice':
            if (user.currentMembership?.price === undefined || user.currentMembership?.price === null) {
                return 'N/A';
            }
            return `${user.currentMembership.price}€`;

        // ===== Statut & Tags =====
        case 'tags':
            const tags = user.status?.tags || [];
            return tags.length > 0 ? tags.join(', ') : 'Aucun';

        case 'loyaltyPoints':
            return String(user.loyaltyPoints ?? 0);

        case 'isAccountBlocked':
            return user.status?.isAccountBlocked ? 'Oui' : 'Non';

        case 'isCardBlocked':
            return user.status?.isCardBlocked ? 'Oui' : 'Non';

        // ===== Métadonnées =====
        case 'registrationSource':
            if (!user.registration?.source) return 'N/A';
            return REGISTRATION_SOURCE_LABELS[user.registration.source] || user.registration.source;

        case 'createdAt':
            return formatDate(user.createdAt);

        case 'emailCardSent':
            return user.emailStatus?.membershipCardSent ? 'Oui' : 'Non';

        case 'emailCardSentCount':
            return String(user.emailStatus?.membershipCardSentCount ?? 0);

        case 'emailCardSentAt':
            return formatDate(user.emailStatus?.membershipCardSentAt);

        default:
            return 'N/A';
    }
}

// ============================================================================
// GÉNÉRATION DES FICHIERS
// ============================================================================

/**
 * Échappe une valeur pour le CSV
 */
function escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Génère un fichier CSV à partir des utilisateurs complets
 */
function generateCSV(
    users: User[],
    selectedFields: UserExportField[]
): Blob {
    const fieldConfigs = EXPORT_FIELDS.filter((f) =>
        selectedFields.includes(f.key)
    );

    const headers = fieldConfigs.map((f) => f.labelCSV);
    const rows = users.map((user) => {
        const extracted = extractUserFields(user, selectedFields);
        return headers.map((h) => escapeCSV(extracted[h]));
    });

    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
    ].join('\n');

    // BOM UTF-8 pour support Excel
    const BOM = '\uFEFF';
    return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Génère un fichier XLSX à partir des utilisateurs complets
 */
function generateXLSX(
    users: User[],
    selectedFields: UserExportField[]
): Blob {
    const fieldConfigs = EXPORT_FIELDS.filter((f) =>
        selectedFields.includes(f.key)
    );

    const headers = fieldConfigs.map((f) => f.labelCSV);
    const data = users.map((user) => {
        const extracted = extractUserFields(user, selectedFields);
        return headers.map((h) => extracted[h]);
    });

    // Créer le workbook
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilisateurs');

    // Générer le fichier
    const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbOut], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

// ============================================================================
// TÉLÉCHARGEMENT
// ============================================================================

/**
 * Télécharge un fichier Blob
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Exporte et télécharge les utilisateurs
 * Récupère les données complètes depuis Firestore pour l'export
 */
export async function downloadUserExport(
    _users: unknown[], // Ignoré - on récupère les données complètes
    options: UserExportOptions
): Promise<void> {
    // 1. Récupérer TOUS les utilisateurs avec données complètes
    const allUsers = await getAllUsersComplete();

    // 2. Appliquer les filtres
    const filteredUsers = applyExportFilters(allUsers, options.filters);

    // 3. Générer le fichier
    const date = new Date().toISOString().split('T')[0];
    const defaultFilename = `utilisateurs-export-${date}`;
    const filename = options.filename || defaultFilename;

    let blob: Blob;
    let fullFilename: string;

    if (options.format === 'xlsx') {
        blob = generateXLSX(filteredUsers, options.selectedFields);
        fullFilename = `${filename}.xlsx`;
    } else {
        blob = generateCSV(filteredUsers, options.selectedFields);
        fullFilename = `${filename}.csv`;
    }

    // 4. Télécharger
    downloadBlob(blob, fullFilename);
}
