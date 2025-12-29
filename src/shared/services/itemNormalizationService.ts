/**
 * Service de normalisation des noms d'items
 * Permet de detecter et corriger les incohérences dans les noms d'items
 * dans les collections contributions et purchases
 */

import {
    collection,
    collectionGroup,
    getDocs,
    doc,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const CONTRIBUTIONS_COLLECTION = 'contributions';
const PURCHASES_SUBCOLLECTION = 'purchases';

// ============================================================================
// TYPES
// ============================================================================

export interface ItemNameStats {
    itemName: string;
    count: number;
    sources: {
        contributions: number;
        purchases: number;
    };
    totalAmount: number;
}

export interface ItemNormalizationMapping {
    from: string;
    to: string;
}

export interface NormalizationResult {
    totalUpdated: number;
    contributionsUpdated: number;
    purchasesUpdated: number;
    errors: number;
    logs: string[];
}

// ============================================================================
// CONSTANTES - Noms standards des items
// ============================================================================

/**
 * Mapping des noms d'items vers leur forme normalisee
 * Cle = variante possible, Valeur = nom standard
 */
export const ITEM_NAME_NORMALIZATION_MAP: Record<string, string> = {
    // Party Harder variants -> PACK PARTY HARDER
    '20€ - PACK PARTY HARDER - edition limitee': 'PACK PARTY HARDER',
    '20€ - PACK PARTY HARDER - édition limitée': 'PACK PARTY HARDER',
    'PACK PARTY HARDER - edition limitee': 'PACK PARTY HARDER',
    'Pack Party Harder': 'PACK PARTY HARDER',
    'pack party harder': 'PACK PARTY HARDER',

    // Pass Love variants
    'Pass Love': 'PASS Love',
    'PASS LOVE': 'PASS Love',
    'pass love': 'PASS Love',
    '2€ - PASS Love': 'PASS Love',

    // Pass Pionnier variants
    'Pass Pionnier': 'PASS PIONNIER',
    'PASS pionnier': 'PASS PIONNIER',
    'pass pionnier': 'PASS PIONNIER',
    '12€ - PASS PIONNIER': 'PASS PIONNIER',

    // Pass Summer variants
    'Pass Summer': 'PASS SUMMER',
    'PASS summer': 'PASS SUMMER',
    'pass summer': 'PASS SUMMER',
    '35€ - PACK SUMMER': 'PASS SUMMER',
    'PACK SUMMER': 'PASS SUMMER',

    // Pack Winter variants
    'Pack Winter': 'PACK WINTER',
    'PACK winter': 'PACK WINTER',
    'pack winter': 'PACK WINTER',
    '55€ - PACK WINTER': 'PACK WINTER',
};

/**
 * Liste des noms d'items standards (ceux qu'on veut garder)
 */
export const STANDARD_ITEM_NAMES = [
    'PASS Love',
    'PASS PIONNIER',
    'PASS SUMMER',
    'PACK WINTER',
    'PACK PARTY HARDER',
    'PACK AMBASSADEUR',
    'MEETING PASS',
    'COWORK PASS',
    'MANUFACTURE PASS',
    'PRIVATE PASS',
    'LES BÂTISSEURS du FORT',
    'Don libre',
    'Don supplementaire (tip)',
] as const;

// ============================================================================
// DETECTION DES ITEMS
// ============================================================================

/**
 * Scan toutes les collections pour trouver tous les noms d'items uniques
 * et leurs statistiques
 */
export async function getAllItemNames(): Promise<ItemNameStats[]> {
    const itemStats = new Map<string, ItemNameStats>();

    const addOrUpdate = (itemName: string, source: 'contributions' | 'purchases', amount: number) => {
        const existing = itemStats.get(itemName);
        if (existing) {
            existing.count++;
            existing.sources[source]++;
            existing.totalAmount += amount;
        } else {
            itemStats.set(itemName, {
                itemName,
                count: 1,
                sources: {
                    contributions: source === 'contributions' ? 1 : 0,
                    purchases: source === 'purchases' ? 1 : 0,
                },
                totalAmount: amount,
            });
        }
    };

    try {
        // 1. Scanner la collection contributions
        console.log('📥 Scan des contributions...');
        const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
        const contributionsSnapshot = await getDocs(contributionsRef);

        contributionsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.itemName) {
                addOrUpdate(data.itemName, 'contributions', data.amount || 0);
            }
        });
        console.log(`   ${contributionsSnapshot.size} contributions scannees`);

        // 2. Scanner toutes les sous-collections purchases via collectionGroup
        console.log('📥 Scan des purchases...');
        const purchasesQuery = collectionGroup(db, PURCHASES_SUBCOLLECTION);
        const purchasesSnapshot = await getDocs(purchasesQuery);

        purchasesSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.itemName) {
                addOrUpdate(data.itemName, 'purchases', data.amount || 0);
            }
        });
        console.log(`   ${purchasesSnapshot.size} purchases scannees`);

        // Convertir en array et trier par count descendant
        const result = Array.from(itemStats.values());
        result.sort((a, b) => b.count - a.count);

        console.log(`✅ ${result.length} noms d'items uniques trouves`);
        return result;

    } catch (error) {
        console.error('Erreur lors du scan des items:', error);
        throw error;
    }
}

/**
 * Detecte les items qui ne correspondent pas aux noms standards
 */
export function detectNonStandardItems(items: ItemNameStats[]): ItemNameStats[] {
    return items.filter(item => {
        // Verifier si c'est un nom standard
        const isStandard = STANDARD_ITEM_NAMES.includes(item.itemName as any);
        // Verifier si ca ressemble a un don libre (peut avoir des montants variables)
        const isDonation = item.itemName.toLowerCase().includes('don');
        return !isStandard && !isDonation;
    });
}

/**
 * Suggère une normalisation automatique basée sur le mapping
 */
export function suggestNormalization(itemName: string): string | null {
    // Vérifier le mapping direct
    if (ITEM_NAME_NORMALIZATION_MAP[itemName]) {
        return ITEM_NAME_NORMALIZATION_MAP[itemName];
    }

    // Vérifier en lowercase
    const lowerItemName = itemName.toLowerCase();
    for (const [key, value] of Object.entries(ITEM_NAME_NORMALIZATION_MAP)) {
        if (key.toLowerCase() === lowerItemName) {
            return value;
        }
    }

    // Recherche partielle
    for (const standard of STANDARD_ITEM_NAMES) {
        if (itemName.toLowerCase().includes(standard.toLowerCase()) ||
            standard.toLowerCase().includes(itemName.toLowerCase())) {
            return standard;
        }
    }

    return null;
}

// ============================================================================
// NORMALISATION
// ============================================================================

/**
 * Normalise un nom d'item specifique vers un autre dans toutes les collections
 * @param fromName Nom actuel a remplacer
 * @param toName Nouveau nom
 * @param dryRun Si true, simule sans modifier
 * @param onProgress Callback de progression
 */
export async function normalizeItemName(
    fromName: string,
    toName: string,
    dryRun: boolean = false,
    onProgress?: (current: number, total: number, log: string) => void
): Promise<NormalizationResult> {
    const result: NormalizationResult = {
        totalUpdated: 0,
        contributionsUpdated: 0,
        purchasesUpdated: 0,
        errors: 0,
        logs: [],
    };

    const addLog = (message: string) => {
        result.logs.push(message);
        console.log(message);
    };

    try {
        addLog(`🔄 Normalisation: "${fromName}" -> "${toName}"`);
        addLog(dryRun ? '   Mode: DRY RUN (simulation)' : '   Mode: EXECUTION');

        // 1. Mettre a jour les contributions
        addLog('📥 Traitement des contributions...');
        const contributionsRef = collection(db, CONTRIBUTIONS_COLLECTION);
        const contributionsSnapshot = await getDocs(contributionsRef);

        const contributionsToUpdate: { id: string }[] = [];
        contributionsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.itemName === fromName) {
                contributionsToUpdate.push({ id: docSnap.id });
            }
        });

        addLog(`   ${contributionsToUpdate.length} contributions a mettre a jour`);

        if (!dryRun && contributionsToUpdate.length > 0) {
            // Utiliser des batches pour les mises à jour en masse
            const batchSize = 450;
            for (let i = 0; i < contributionsToUpdate.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = contributionsToUpdate.slice(i, i + batchSize);

                for (const item of chunk) {
                    const docRef = doc(db, CONTRIBUTIONS_COLLECTION, item.id);
                    batch.update(docRef, {
                        itemName: toName,
                        normalizedAt: Timestamp.now(),
                        originalItemName: fromName,
                    });
                }

                await batch.commit();
                result.contributionsUpdated += chunk.length;
                onProgress?.(i + chunk.length, contributionsToUpdate.length, `Contributions: ${i + chunk.length}/${contributionsToUpdate.length}`);
            }
        } else if (dryRun) {
            result.contributionsUpdated = contributionsToUpdate.length;
        }

        // 2. Mettre a jour les purchases (via collectionGroup)
        addLog('📥 Traitement des purchases...');
        const purchasesQuery = collectionGroup(db, PURCHASES_SUBCOLLECTION);
        const purchasesSnapshot = await getDocs(purchasesQuery);

        const purchasesToUpdate: { path: string }[] = [];
        purchasesSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.itemName === fromName) {
                purchasesToUpdate.push({ path: docSnap.ref.path });
            }
        });

        addLog(`   ${purchasesToUpdate.length} purchases a mettre a jour`);

        if (!dryRun && purchasesToUpdate.length > 0) {
            const batchSize = 450;
            for (let i = 0; i < purchasesToUpdate.length; i += batchSize) {
                const batch = writeBatch(db);
                const chunk = purchasesToUpdate.slice(i, i + batchSize);

                for (const item of chunk) {
                    const docRef = doc(db, item.path);
                    batch.update(docRef, {
                        itemName: toName,
                        normalizedAt: Timestamp.now(),
                        originalItemName: fromName,
                    });
                }

                await batch.commit();
                result.purchasesUpdated += chunk.length;
                onProgress?.(i + chunk.length, purchasesToUpdate.length, `Purchases: ${i + chunk.length}/${purchasesToUpdate.length}`);
            }
        } else if (dryRun) {
            result.purchasesUpdated = purchasesToUpdate.length;
        }

        result.totalUpdated = result.contributionsUpdated + result.purchasesUpdated;
        addLog(`✅ Normalisation terminee: ${result.totalUpdated} documents mis a jour`);

        return result;

    } catch (error: any) {
        addLog(`❌ Erreur: ${error.message}`);
        result.errors++;
        throw error;
    }
}

/**
 * Applique plusieurs normalisations en une seule operation
 */
export async function applyNormalizations(
    mappings: ItemNormalizationMapping[],
    dryRun: boolean = false,
    onProgress?: (current: number, total: number, log: string) => void
): Promise<NormalizationResult> {
    const result: NormalizationResult = {
        totalUpdated: 0,
        contributionsUpdated: 0,
        purchasesUpdated: 0,
        errors: 0,
        logs: [],
    };

    for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];
        onProgress?.(i, mappings.length, `Traitement: ${mapping.from} -> ${mapping.to}`);

        try {
            const subResult = await normalizeItemName(mapping.from, mapping.to, dryRun);
            result.totalUpdated += subResult.totalUpdated;
            result.contributionsUpdated += subResult.contributionsUpdated;
            result.purchasesUpdated += subResult.purchasesUpdated;
            result.logs.push(...subResult.logs);
        } catch (error: any) {
            result.errors++;
            result.logs.push(`❌ Erreur pour ${mapping.from}: ${error.message}`);
        }
    }

    return result;
}

/**
 * Auto-normalise tous les items non standards en utilisant le mapping predéfini
 */
export async function autoNormalizeAll(
    dryRun: boolean = false,
    onProgress?: (current: number, total: number, log: string) => void
): Promise<NormalizationResult> {
    const allItems = await getAllItemNames();
    const nonStandardItems = detectNonStandardItems(allItems);

    const mappings: ItemNormalizationMapping[] = [];

    for (const item of nonStandardItems) {
        const suggestion = suggestNormalization(item.itemName);
        if (suggestion) {
            mappings.push({
                from: item.itemName,
                to: suggestion,
            });
        }
    }

    if (mappings.length === 0) {
        return {
            totalUpdated: 0,
            contributionsUpdated: 0,
            purchasesUpdated: 0,
            errors: 0,
            logs: ['✅ Aucune normalisation necessaire'],
        };
    }

    return applyNormalizations(mappings, dryRun, onProgress);
}
