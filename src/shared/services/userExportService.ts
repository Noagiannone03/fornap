import * as XLSX from 'xlsx';
import type { UserListItem } from '../types/user';
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

// ============================================================================
// FILTRAGE DES UTILISATEURS
// ============================================================================

/**
 * Parse une date Firestore (tous formats) en Date JS
 */
function parseCreatedAtDate(createdAt: any): Date {
    if (!createdAt) return new Date(0);

    try {
        if (typeof createdAt.toDate === 'function') {
            return createdAt.toDate();
        }

        if (typeof createdAt === 'object' && ('seconds' in createdAt || '_seconds' in createdAt)) {
            const seconds = createdAt.seconds || createdAt._seconds || 0;
            const nanoseconds = createdAt.nanoseconds || createdAt._nanoseconds || 0;
            const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1000000);
            return new Date(milliseconds);
        }

        if (createdAt instanceof Date) {
            return createdAt;
        }

        if (typeof createdAt === 'number') {
            if (createdAt < 10000000000) {
                return new Date(createdAt * 1000);
            }
            return new Date(createdAt);
        }

        if (typeof createdAt === 'string') {
            const parsed = new Date(createdAt);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return new Date(0);
    } catch (e) {
        console.error('Error parsing createdAt:', e, createdAt);
        return new Date(0);
    }
}

/**
 * Applique les filtres d'export à une liste d'utilisateurs
 */
export function applyExportFilters(
    users: UserListItem[],
    filters: UserExportFilters
): UserListItem[] {
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
            filters.membershipTypes!.includes(user.membership.type)
        );
    }

    // Filtre par statut d'abonnement
    if (filters.membershipStatus && filters.membershipStatus.length > 0) {
        filtered = filtered.filter((user) =>
            filters.membershipStatus!.includes(user.membership.status)
        );
    }

    // Filtre par tags à inclure (au moins un)
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
                const userDate = parseCreatedAtDate(user.createdAt);
                return userDate >= startOfDay;
            });
        }

        if (end) {
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            filtered = filtered.filter((user) => {
                const userDate = parseCreatedAtDate(user.createdAt);
                return userDate <= endOfDay;
            });
        }
    }

    // Filtre par source d'inscription
    if (filters.registrationSources && filters.registrationSources.length > 0) {
        filtered = filtered.filter((user) =>
            filters.registrationSources!.includes(user.registrationSource)
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

    return filtered;
}

/**
 * Compte le nombre d'utilisateurs correspondant aux filtres
 */
export function countFilteredUsers(
    users: UserListItem[],
    filters: UserExportFilters
): number {
    return applyExportFilters(users, filters).length;
}

// ============================================================================
// EXTRACTION DES CHAMPS
// ============================================================================

/**
 * Extrait les champs sélectionnés d'un utilisateur pour l'export
 */
export function extractUserFields(
    user: UserListItem,
    selectedFields: UserExportField[]
): Record<string, any> {
    const result: Record<string, any> = {};
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
 * Récupère la valeur d'un champ pour un utilisateur
 */
function getFieldValue(user: UserListItem, field: UserExportField): string {
    switch (field) {
        // Informations de base
        case 'uid':
            return user.uid;
        case 'email':
            return user.email;
        case 'firstName':
            return user.firstName;
        case 'lastName':
            return user.lastName;
        case 'phone':
            return (user as any).phone || '';
        case 'postalCode':
            return (user as any).postalCode || '';
        case 'birthDate':
            const birthDate = (user as any).birthDate;
            if (!birthDate) return '';
            const bd = parseCreatedAtDate(birthDate);
            return bd.getTime() === 0 ? '' : bd.toLocaleDateString('fr-FR');

        // Abonnement
        case 'membershipType':
            return MEMBERSHIP_TYPE_LABELS[user.membership.type] || user.membership.type;
        case 'membershipStatus':
            return MEMBERSHIP_STATUS_LABELS[user.membership.status] || user.membership.status;
        case 'membershipPlanName':
            return user.membership.planName || '';
        case 'membershipStartDate':
            const startDate = (user as any).membership?.startDate;
            if (!startDate) return '';
            const sd = parseCreatedAtDate(startDate);
            return sd.getTime() === 0 ? '' : sd.toLocaleDateString('fr-FR');
        case 'membershipExpiryDate':
            const expiryDate = (user as any).membership?.expiryDate;
            if (!expiryDate) return 'Aucune';
            const ed = parseCreatedAtDate(expiryDate);
            return ed.getTime() === 0 ? 'Aucune' : ed.toLocaleDateString('fr-FR');
        case 'membershipPrice':
            const price = (user as any).membership?.price;
            return price !== undefined ? `${price}€` : '';

        // Statut & Tags
        case 'tags':
            return user.tags.join(', ');
        case 'loyaltyPoints':
            return String(user.loyaltyPoints);
        case 'isAccountBlocked':
            return user.isAccountBlocked ? 'Oui' : 'Non';
        case 'isCardBlocked':
            return user.isCardBlocked ? 'Oui' : 'Non';

        // Métadonnées
        case 'registrationSource':
            return REGISTRATION_SOURCE_LABELS[user.registrationSource] || user.registrationSource;
        case 'createdAt':
            const createdAt = parseCreatedAtDate(user.createdAt);
            return createdAt.getTime() === 0 ? '' : createdAt.toLocaleDateString('fr-FR');
        case 'emailCardSent':
            return user.emailStatus?.membershipCardSent ? 'Oui' : 'Non';
        case 'emailCardSentCount':
            return String(user.emailStatus?.membershipCardSentCount || 0);
        case 'emailCardSentAt':
            const sentAt = user.emailStatus?.membershipCardSentAt;
            if (!sentAt) return '';
            const sat = parseCreatedAtDate(sentAt);
            return sat.getTime() === 0 ? '' : sat.toLocaleDateString('fr-FR');

        default:
            return '';
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
 * Génère un fichier CSV à partir des données
 */
export function exportUsersToCSV(
    users: UserListItem[],
    options: UserExportOptions
): Blob {
    const filteredUsers = applyExportFilters(users, options.filters);
    const fieldConfigs = EXPORT_FIELDS.filter((f) =>
        options.selectedFields.includes(f.key)
    );

    const headers = fieldConfigs.map((f) => f.labelCSV);
    const rows = filteredUsers.map((user) => {
        const extracted = extractUserFields(user, options.selectedFields);
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
 * Génère un fichier XLSX à partir des données
 */
export function exportUsersToXLSX(
    users: UserListItem[],
    options: UserExportOptions
): Blob {
    const filteredUsers = applyExportFilters(users, options.filters);
    const fieldConfigs = EXPORT_FIELDS.filter((f) =>
        options.selectedFields.includes(f.key)
    );

    const headers = fieldConfigs.map((f) => f.labelCSV);
    const data = filteredUsers.map((user) => {
        const extracted = extractUserFields(user, options.selectedFields);
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
 */
export function downloadUserExport(
    users: UserListItem[],
    options: UserExportOptions
): void {
    const date = new Date().toISOString().split('T')[0];
    const defaultFilename = `utilisateurs-export-${date}`;
    const filename = options.filename || defaultFilename;

    let blob: Blob;
    let fullFilename: string;

    if (options.format === 'xlsx') {
        blob = exportUsersToXLSX(users, options);
        fullFilename = `${filename}.xlsx`;
    } else {
        blob = exportUsersToCSV(users, options);
        fullFilename = `${filename}.csv`;
    }

    downloadBlob(blob, fullFilename);
}
