import {
    doc,
    getDoc,
    setDoc,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface TagConfig {
    name: string;
    color: string;
}

interface TagsDocument {
    items: TagConfig[];
    updatedAt: Timestamp;
    updatedBy: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG_COLLECTION = 'config';
const TAGS_DOC_ID = 'tags';

// Default tags to initialize with
const DEFAULT_TAGS: TagConfig[] = [
    { name: 'actif', color: '#40c057' },
    { name: 'inactif', color: '#868e96' },
    { name: 'vip', color: '#be4bdb' },
    { name: 'atelier_couture', color: '#228be6' },
    { name: 'billetterie', color: '#fd7e14' },
    { name: 'exposant', color: '#fab005' },
];

// ============================================================================
// FIREBASE OPERATIONS
// ============================================================================

/**
 * Get all tags from Firebase
 * Returns default tags if the collection doesn't exist yet
 */
export async function getAllTags(): Promise<TagConfig[]> {
    try {
        const tagsRef = doc(db, CONFIG_COLLECTION, TAGS_DOC_ID);
        const tagsDoc = await getDoc(tagsRef);

        if (tagsDoc.exists()) {
            const data = tagsDoc.data() as TagsDocument;
            return data.items || [];
        }

        // Initialize with default tags if document doesn't exist
        await initializeDefaultTags('system');
        return DEFAULT_TAGS;
    } catch (error) {
        console.error('Error fetching tags:', error);
        return DEFAULT_TAGS;
    }
}

/**
 * Get tag names only (for TagsInput data prop)
 */
export async function getTagNames(): Promise<string[]> {
    const tags = await getAllTags();
    return tags.map(t => t.name);
}

/**
 * Save all tags to Firebase (full replacement)
 */
export async function saveTags(tags: TagConfig[], updatedBy: string): Promise<void> {
    try {
        const tagsRef = doc(db, CONFIG_COLLECTION, TAGS_DOC_ID);
        const tagsDocument: TagsDocument = {
            items: tags,
            updatedAt: Timestamp.now(),
            updatedBy,
        };
        await setDoc(tagsRef, tagsDocument);
    } catch (error) {
        console.error('Error saving tags:', error);
        throw error;
    }
}

/**
 * Add a new tag to Firebase
 */
export async function addTag(tag: TagConfig, updatedBy: string): Promise<void> {
    try {
        const currentTags = await getAllTags();

        // Check for duplicates (case-insensitive)
        const exists = currentTags.some(
            t => t.name.toLowerCase() === tag.name.toLowerCase()
        );

        if (exists) {
            throw new Error(`Le tag "${tag.name}" existe deja`);
        }

        const updatedTags = [...currentTags, tag];
        await saveTags(updatedTags, updatedBy);
    } catch (error) {
        console.error('Error adding tag:', error);
        throw error;
    }
}

/**
 * Update a tag's color in Firebase
 */
export async function updateTagColor(
    tagName: string,
    newColor: string,
    updatedBy: string
): Promise<void> {
    try {
        const currentTags = await getAllTags();
        const updatedTags = currentTags.map(t =>
            t.name === tagName ? { ...t, color: newColor } : t
        );
        await saveTags(updatedTags, updatedBy);
    } catch (error) {
        console.error('Error updating tag color:', error);
        throw error;
    }
}

/**
 * Delete a tag from Firebase
 */
export async function deleteTag(tagName: string, updatedBy: string): Promise<void> {
    try {
        const currentTags = await getAllTags();
        const updatedTags = currentTags.filter(t => t.name !== tagName);
        await saveTags(updatedTags, updatedBy);
    } catch (error) {
        console.error('Error deleting tag:', error);
        throw error;
    }
}

/**
 * Initialize default tags in Firebase (only if collection is empty)
 */
export async function initializeDefaultTags(updatedBy: string): Promise<void> {
    try {
        const tagsRef = doc(db, CONFIG_COLLECTION, TAGS_DOC_ID);
        const tagsDoc = await getDoc(tagsRef);

        if (!tagsDoc.exists()) {
            await saveTags(DEFAULT_TAGS, updatedBy);
            console.log('Default tags initialized in Firebase');
        }
    } catch (error) {
        console.error('Error initializing default tags:', error);
        throw error;
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the color for a specific tag
 */
export function getTagColor(tagName: string, tagsConfig: TagConfig[]): string {
    // Special rules for system tags
    if (tagName.includes('MIGRATED') || tagName.includes('LEGACY')) {
        return '#fd7e14'; // orange
    }

    // Look in custom config
    const config = tagsConfig.find(
        t => t.name.toLowerCase() === tagName.toLowerCase()
    );

    if (config) {
        return config.color;
    }

    // Default color for unknown tags
    return '#228be6'; // blue
}

/**
 * Merge existing tags from users with tag configuration
 * Adds missing tags with default color
 */
export function mergeTagsWithConfig(
    existingTagNames: string[],
    currentConfig: TagConfig[]
): TagConfig[] {
    const configMap = new Map(currentConfig.map(t => [t.name.toLowerCase(), t]));

    // Add missing tags with default color
    existingTagNames.forEach(tag => {
        const tagLower = tag.toLowerCase();
        if (!configMap.has(tagLower) && !tag.includes('MIGRATED') && !tag.includes('LEGACY')) {
            configMap.set(tagLower, {
                name: tag,
                color: '#228be6', // blue default
            });
        }
    });

    return Array.from(configMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
}
