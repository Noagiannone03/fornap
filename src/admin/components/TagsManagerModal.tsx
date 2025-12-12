import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  ColorPicker,
  Button,
  Group,
  Badge,
  ActionIcon,
  Paper,
  Text,
  ScrollArea,
  Divider,
  LoadingOverlay,
} from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { IconTrash, IconPlus, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  getAllTags,
  addTag,
  updateTagColor,
  deleteTag,
  type TagConfig,
} from '../../shared/services/tagService';

// Re-export TagConfig for backwards compatibility
export type { TagConfig };

interface TagsManagerModalProps {
  opened: boolean;
  onClose: () => void;
  onTagsUpdated?: () => void; // Callback when tags are updated
  adminUserId?: string;
}

const PRESET_COLORS = [
  '#228be6', // blue
  '#40c057', // green
  '#fd7e14', // orange
  '#be4bdb', // grape
  '#fa5252', // red
  '#15aabf', // cyan
  '#fab005', // yellow
  '#868e96', // gray
  '#e64980', // pink
  '#7950f2', // violet
];

export function TagsManagerModal({
  opened,
  onClose,
  onTagsUpdated,
  adminUserId = 'system',
}: TagsManagerModalProps) {
  const [tags, setTags] = useState<TagConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  // Track pending color changes locally (before saving to Firebase)
  const [pendingColors, setPendingColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (opened) {
      loadTags();
    }
  }, [opened]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const fetchedTags = await getAllTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Error loading tags:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les tags',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Le nom du tag ne peut pas etre vide',
        color: 'red',
      });
      return;
    }

    try {
      setSaving(true);
      await addTag({ name: newTagName.trim(), color: selectedColor }, adminUserId);
      setNewTagName('');
      setSelectedColor(PRESET_COLORS[0]);
      notifications.show({
        title: 'Succes',
        message: `Tag "${newTagName.trim()}" ajoute`,
        color: 'green',
      });
      await loadTags();
      onTagsUpdated?.();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Impossible d\'ajouter le tag',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      setSaving(true);
      await deleteTag(tagName, adminUserId);
      notifications.show({
        title: 'Succes',
        message: `Tag "${tagName}" supprime`,
        color: 'green',
      });
      await loadTags();
      onTagsUpdated?.();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de supprimer le tag',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  // Debounced function to save color to Firebase (only fires 500ms after last change)
  const debouncedSaveColor = useDebouncedCallback(
    async (tagName: string, newColor: string) => {
      try {
        await updateTagColor(tagName, newColor, adminUserId);
        // Clear pending state for this tag
        setPendingColors(prev => {
          const updated = { ...prev };
          delete updated[tagName];
          return updated;
        });
        onTagsUpdated?.();
      } catch (error) {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de mettre a jour la couleur',
          color: 'red',
        });
      }
    },
    500
  );

  // Handle color change: update local state immediately, debounce Firebase save
  const handleUpdateColor = (tagName: string, newColor: string) => {
    // Update local pending state immediately for responsiveness
    setPendingColors(prev => ({ ...prev, [tagName]: newColor }));
    // Schedule debounced save to Firebase
    debouncedSaveColor(tagName, newColor);
  };

  // Get the display color for a tag (pending color takes priority)
  const getTagDisplayColor = (tag: TagConfig) => {
    return pendingColors[tag.name] ?? tag.color;
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Gerer les tags"
      size="lg"
      centered
    >
      <LoadingOverlay visible={loading} />
      <Stack gap="lg">
        {/* Section d'ajout */}
        <Paper withBorder p="md" radius="md">
          <Text size="sm" fw={500} mb="md">
            Creer un nouveau tag
          </Text>
          <Stack gap="md">
            <TextInput
              label="Nom du tag"
              placeholder="Ex: nouveau_tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
              disabled={saving}
            />
            <div>
              <Text size="sm" fw={500} mb="xs">
                Couleur
              </Text>
              <Group gap="xs" mb="md">
                {PRESET_COLORS.map((color) => (
                  <ActionIcon
                    key={color}
                    size="lg"
                    radius="xl"
                    variant={selectedColor === color ? 'filled' : 'light'}
                    color={color}
                    onClick={() => setSelectedColor(color)}
                    style={{
                      backgroundColor: color,
                      border:
                        selectedColor === color
                          ? '3px solid white'
                          : '1px solid #dee2e6',
                      boxShadow:
                        selectedColor === color
                          ? '0 0 0 2px ' + color
                          : 'none',
                    }}
                  >
                    {selectedColor === color && (
                      <IconCheck size={16} color="white" />
                    )}
                  </ActionIcon>
                ))}
              </Group>
              <ColorPicker
                value={selectedColor}
                onChange={setSelectedColor}
                format="hex"
                swatches={PRESET_COLORS}
              />
            </div>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddTag}
              fullWidth
              loading={saving}
            >
              Ajouter le tag
            </Button>
          </Stack>
        </Paper>

        <Divider />

        {/* Liste des tags */}
        <div>
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={500}>
              Tags configures ({tags.length})
            </Text>
          </Group>
          <ScrollArea h={300}>
            <Stack gap="xs">
              {tags.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  Aucun tag personnalise. Ajoutez-en un ci-dessus !
                </Text>
              ) : (
                tags.map((tag) => {
                  const displayColor = getTagDisplayColor(tag);
                  return (
                    <Paper key={tag.name} withBorder p="sm" radius="md">
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" style={{ flex: 1 }}>
                          <Badge
                            size="lg"
                            variant="light"
                            style={{ backgroundColor: displayColor + '20' }}
                          >
                            <Text c={displayColor} fw={500}>
                              {tag.name}
                            </Text>
                          </Badge>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                          <ColorPicker
                            size="xs"
                            value={displayColor}
                            onChange={(color) => handleUpdateColor(tag.name, color)}
                            format="hex"
                            swatches={PRESET_COLORS}
                          />
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDeleteTag(tag.name)}
                            disabled={saving}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </ScrollArea>
        </div>

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Fermer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
