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
} from '@mantine/core';
import { IconTrash, IconPlus, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export interface TagConfig {
  name: string;
  color: string;
}

interface TagsManagerModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (tags: TagConfig[]) => void;
  initialTags: TagConfig[];
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

export function TagsManagerModal({ opened, onClose, onSave, initialTags }: TagsManagerModalProps) {
  const [tags, setTags] = useState<TagConfig[]>(initialTags);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Le nom du tag ne peut pas être vide',
        color: 'red',
      });
      return;
    }

    const tagExists = tags.some(
      (t) => t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (tagExists) {
      notifications.show({
        title: 'Erreur',
        message: 'Ce tag existe déjà',
        color: 'red',
      });
      return;
    }

    setTags([...tags, { name: newTagName.trim(), color: selectedColor }]);
    setNewTagName('');
    setSelectedColor(PRESET_COLORS[0]);
  };

  const handleDeleteTag = (tagName: string) => {
    setTags(tags.filter((t) => t.name !== tagName));
  };

  const handleUpdateColor = (tagName: string, newColor: string) => {
    setTags(
      tags.map((t) => (t.name === tagName ? { ...t, color: newColor } : t))
    );
  };

  const handleSave = () => {
    onSave(tags);
    notifications.show({
      title: 'Succès',
      message: `${tags.length} tags enregistrés`,
      color: 'green',
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Gérer les tags"
      size="lg"
      centered
    >
      <Stack gap="lg">
        {/* Section d'ajout */}
        <Paper withBorder p="md" radius="md">
          <Text size="sm" fw={500} mb="md">
            Créer un nouveau tag
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
              Tags configurés ({tags.length})
            </Text>
          </Group>
          <ScrollArea h={300}>
            <Stack gap="xs">
              {tags.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  Aucun tag personnalisé. Ajoutez-en un ci-dessus !
                </Text>
              ) : (
                tags.map((tag) => (
                  <Paper key={tag.name} withBorder p="sm" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" style={{ flex: 1 }}>
                        <Badge
                          size="lg"
                          variant="light"
                          style={{ backgroundColor: tag.color + '20' }}
                        >
                          <Text c={tag.color} fw={500}>
                            {tag.name}
                          </Text>
                        </Badge>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <ColorPicker
                          size="xs"
                          value={tag.color}
                          onChange={(color) => handleUpdateColor(tag.name, color)}
                          format="hex"
                          swatches={PRESET_COLORS}
                        />
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => handleDeleteTag(tag.name)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                ))
              )}
            </Stack>
          </ScrollArea>
        </div>

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} leftSection={<IconCheck size={16} />}>
            Enregistrer ({tags.length} tags)
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
