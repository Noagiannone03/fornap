import type { TagConfig } from '../../admin/components/TagsManagerModal';

const TAGS_CONFIG_KEY = 'fornap_tags_config';

// Tags prédéfinis avec leurs couleurs par défaut
export const DEFAULT_TAGS_CONFIG: TagConfig[] = [
  { name: 'actif', color: '#40c057' },
  { name: 'inactif', color: '#868e96' },
  { name: 'vip', color: '#be4bdb' },
  { name: 'atelier_couture', color: '#228be6' },
  { name: 'billetterie', color: '#fd7e14' },
  { name: 'exposant', color: '#fab005' },
];

/**
 * Récupère la configuration des tags depuis localStorage
 */
export function getTagsConfig(): TagConfig[] {
  try {
    const stored = localStorage.getItem(TAGS_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_TAGS_CONFIG;
    }
  } catch (error) {
    console.error('Error loading tags config:', error);
  }
  return DEFAULT_TAGS_CONFIG;
}

/**
 * Sauvegarde la configuration des tags dans localStorage
 */
export function saveTagsConfig(tags: TagConfig[]): void {
  try {
    localStorage.setItem(TAGS_CONFIG_KEY, JSON.stringify(tags));
  } catch (error) {
    console.error('Error saving tags config:', error);
  }
}

/**
 * Récupère la couleur d'un tag depuis la configuration
 */
export function getTagColor(tagName: string, tagsConfig: TagConfig[]): string {
  // Règles spéciales pour les tags système
  if (tagName.includes('MIGRATED') || tagName.includes('LEGACY')) {
    return '#fd7e14'; // orange
  }

  // Chercher dans la config personnalisée
  const config = tagsConfig.find(
    (t) => t.name.toLowerCase() === tagName.toLowerCase()
  );

  if (config) {
    return config.color;
  }

  // Couleur par défaut pour les tags inconnus
  return '#228be6'; // blue
}

/**
 * Fusionne les tags existants avec la configuration
 * Ajoute les nouveaux tags découverts avec une couleur par défaut
 */
export function mergeTagsWithConfig(
  existingTags: string[],
  currentConfig: TagConfig[]
): TagConfig[] {
  const configMap = new Map(currentConfig.map((t) => [t.name.toLowerCase(), t]));

  // Ajouter les tags manquants avec une couleur par défaut
  existingTags.forEach((tag) => {
    const tagLower = tag.toLowerCase();
    if (!configMap.has(tagLower) && !tag.includes('MIGRATED') && !tag.includes('LEGACY')) {
      configMap.set(tagLower, {
        name: tag,
        color: '#228be6', // blue par défaut
      });
    }
  });

  return Array.from(configMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
