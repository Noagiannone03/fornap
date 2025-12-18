import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration du mode maintenance
 */
export interface MaintenanceConfig {
    /** Mode maintenance activé ou non */
    enabled: boolean;
    /** Message affiché aux utilisateurs bloqués */
    message: string;
    /** Heure estimée de fin de maintenance */
    estimatedEndTime: Timestamp | null;
    /** Heure d'activation du mode maintenance */
    enabledAt: Timestamp | null;
    /** ID de l'admin qui a activé le mode */
    enabledBy: string | null;
    /** Nom de l'admin qui a activé le mode */
    enabledByName: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG_COLLECTION = 'config';
const MAINTENANCE_DOC_ID = 'maintenance';

const DEFAULT_CONFIG: MaintenanceConfig = {
    enabled: false,
    message: '',
    estimatedEndTime: null,
    enabledAt: null,
    enabledBy: null,
    enabledByName: null,
};

// ============================================================================
// FIREBASE OPERATIONS
// ============================================================================

/**
 * Récupère le statut actuel de la maintenance
 */
export async function getMaintenanceStatus(): Promise<MaintenanceConfig> {
    try {
        const maintenanceRef = doc(db, CONFIG_COLLECTION, MAINTENANCE_DOC_ID);
        const maintenanceDoc = await getDoc(maintenanceRef);

        if (maintenanceDoc.exists()) {
            return maintenanceDoc.data() as MaintenanceConfig;
        }

        // Initialiser avec la config par défaut si le document n'existe pas
        await setDoc(maintenanceRef, DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    } catch (error) {
        console.error('Error fetching maintenance status:', error);
        return DEFAULT_CONFIG;
    }
}

/**
 * Active le mode maintenance
 * @param message Message à afficher aux utilisateurs
 * @param durationMinutes Durée estimée en minutes (null = pas de durée)
 * @param adminId ID de l'admin qui active
 * @param adminName Nom de l'admin qui active
 */
export async function enableMaintenance(
    message: string,
    durationMinutes: number | null,
    adminId: string,
    adminName: string
): Promise<void> {
    try {
        const maintenanceRef = doc(db, CONFIG_COLLECTION, MAINTENANCE_DOC_ID);
        const now = Timestamp.now();

        const config: MaintenanceConfig = {
            enabled: true,
            message: message || 'Une maintenance est en cours sur le panel administrateur.',
            estimatedEndTime: durationMinutes
                ? Timestamp.fromMillis(now.toMillis() + durationMinutes * 60 * 1000)
                : null,
            enabledAt: now,
            enabledBy: adminId,
            enabledByName: adminName,
        };

        await setDoc(maintenanceRef, config);
        console.log('[Maintenance] Mode maintenance activé');
    } catch (error) {
        console.error('Error enabling maintenance:', error);
        throw error;
    }
}

/**
 * Désactive le mode maintenance
 */
export async function disableMaintenance(): Promise<void> {
    try {
        const maintenanceRef = doc(db, CONFIG_COLLECTION, MAINTENANCE_DOC_ID);
        await setDoc(maintenanceRef, DEFAULT_CONFIG);
        console.log('[Maintenance] Mode maintenance désactivé');
    } catch (error) {
        console.error('Error disabling maintenance:', error);
        throw error;
    }
}

/**
 * Met à jour le message de maintenance
 */
export async function updateMaintenanceMessage(message: string): Promise<void> {
    try {
        const current = await getMaintenanceStatus();
        if (!current.enabled) {
            throw new Error('Cannot update message when maintenance is not enabled');
        }

        const maintenanceRef = doc(db, CONFIG_COLLECTION, MAINTENANCE_DOC_ID);
        await setDoc(maintenanceRef, {
            ...current,
            message,
        });
    } catch (error) {
        console.error('Error updating maintenance message:', error);
        throw error;
    }
}

/**
 * Écoute les changements de statut de maintenance en temps réel
 * @param callback Fonction appelée à chaque changement
 * @returns Fonction pour arrêter l'écoute
 */
export function subscribeToMaintenanceStatus(
    callback: (config: MaintenanceConfig) => void
): () => void {
    const maintenanceRef = doc(db, CONFIG_COLLECTION, MAINTENANCE_DOC_ID);

    const unsubscribe = onSnapshot(
        maintenanceRef,
        (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.data() as MaintenanceConfig);
            } else {
                callback(DEFAULT_CONFIG);
            }
        },
        (error) => {
            console.error('Error listening to maintenance status:', error);
            callback(DEFAULT_CONFIG);
        }
    );

    return unsubscribe;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Formate la durée restante de maintenance
 */
export function formatRemainingTime(endTime: Timestamp | null): string | null {
    if (!endTime) return null;

    const now = Date.now();
    const end = endTime.toMillis();
    const remaining = end - now;

    if (remaining <= 0) {
        return 'Bientôt terminé';
    }

    const minutes = Math.floor(remaining / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `~${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }

    return `~${mins} min`;
}

/**
 * Options de durée prédéfinies pour le formulaire
 */
export const DURATION_OPTIONS = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 heure' },
    { value: '120', label: '2 heures' },
    { value: '240', label: '4 heures' },
    { value: '0', label: 'Durée indéterminée' },
];
