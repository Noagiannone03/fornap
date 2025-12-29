import { useState } from 'react';
import {
    Modal,
    Stack,
    Group,
    Text,
    Title,
    Paper,
    Badge,
    Button,
    TextInput,
    ScrollArea,
    Avatar,
    Accordion,
    ThemeIcon,
    Divider,
} from '@mantine/core';
import {
    IconSearch,
    IconUsersGroup,
    IconGitMerge,
    IconX,
    IconAlertTriangle,
    IconCalendar,
    IconUserPlus,
} from '@tabler/icons-react';
import type { DuplicateGroup } from '../../shared/services/duplicateDetectionService';
import { REGISTRATION_SOURCE_LABELS } from '../../shared/types/user';
import { Timestamp } from 'firebase/firestore';

interface DuplicateReviewModalProps {
    opened: boolean;
    onClose: () => void;
    duplicateGroups: DuplicateGroup[];
    onSelectGroup: (groupIndex: number) => void;
}

// Helper pour formater une date Firestore
function formatDate(value: unknown): string {
    if (!value) return 'Non defini';

    try {
        let date: Date;

        // Si c'est un Timestamp Firestore
        if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
            date = (value as Timestamp).toDate();
        }
        // Si c'est un objet avec seconds
        else if (value && typeof value === 'object' && 'seconds' in value) {
            date = new Date((value as { seconds: number }).seconds * 1000);
        }
        // Si c'est deja une Date
        else if (value instanceof Date) {
            date = value;
        }
        // Si c'est un number (timestamp)
        else if (typeof value === 'number') {
            date = new Date(value);
        }
        // Si c'est une string
        else if (typeof value === 'string') {
            date = new Date(value);
        }
        else {
            return 'Date invalide';
        }

        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return 'Date invalide';
    }
}

export function DuplicateReviewModal({
    opened,
    onClose,
    duplicateGroups,
    onSelectGroup,
}: DuplicateReviewModalProps) {
    const [search, setSearch] = useState('');

    // Filtrer les groupes selon la recherche
    const filteredGroups = duplicateGroups.filter((group) => {
        if (!search) return true;

        const searchLower = search.toLowerCase();

        // Rechercher dans l'email du groupe
        if (group.email.toLowerCase().includes(searchLower)) {
            return true;
        }

        // Rechercher dans les noms/prenoms des utilisateurs du groupe
        return group.users.some(
            (user) =>
                user.firstName.toLowerCase().includes(searchLower) ||
                user.lastName.toLowerCase().includes(searchLower)
        );
    });

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group>
                    <ThemeIcon size="lg" color="yellow" variant="light">
                        <IconUsersGroup size={20} />
                    </ThemeIcon>
                    <div>
                        <Title order={4}>Doublons detectes</Title>
                        <Text size="sm" c="dimmed">
                            {duplicateGroups.length} groupe{duplicateGroups.length > 1 ? 's' : ''} de doublons trouve{duplicateGroups.length > 1 ? 's' : ''}
                        </Text>
                    </div>
                </Group>
            }
            size="xl"
            centered
        >
            <Stack gap="md">
                {/* Alerte */}
                <Paper withBorder p="sm" radius="md" bg="yellow.0">
                    <Group gap="xs">
                        <IconAlertTriangle size={20} color="orange" />
                        <Text size="sm">
                            Selectionnez un groupe de doublons pour le traiter. Vous pourrez choisir quel compte conserver et fusionner les donnees.
                        </Text>
                    </Group>
                </Paper>

                {/* Barre de recherche */}
                <TextInput
                    placeholder="Rechercher par email, prenom ou nom..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    rightSection={
                        search && (
                            <IconX
                                size={16}
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSearch('')}
                            />
                        )
                    }
                />

                {/* Resultat du filtre */}
                {search && (
                    <Text size="sm" c="dimmed">
                        {filteredGroups.length} groupe{filteredGroups.length > 1 ? 's' : ''} trouve{filteredGroups.length > 1 ? 's' : ''}
                    </Text>
                )}

                {/* Liste des groupes de doublons */}
                <ScrollArea h={400}>
                    {filteredGroups.length === 0 ? (
                        <Paper withBorder p="xl" radius="md" ta="center">
                            <Text size="sm" c="dimmed" fs="italic">
                                Aucun doublon trouve
                            </Text>
                        </Paper>
                    ) : (
                        <Accordion variant="separated">
                            {filteredGroups.map((group, groupIndex) => {
                                // Trouver l'index original dans duplicateGroups
                                const originalIndex = duplicateGroups.findIndex(
                                    (g) => g.email === group.email
                                );

                                return (
                                    <Accordion.Item key={group.email} value={`group-${groupIndex}`}>
                                        <Accordion.Control>
                                            <Group justify="space-between">
                                                <Group gap="sm">
                                                    <ThemeIcon color="red" variant="light" size="lg">
                                                        <IconUsersGroup size={18} />
                                                    </ThemeIcon>
                                                    <div>
                                                        <Text size="sm" fw={600}>
                                                            {group.email}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {group.users.length} comptes en doublon
                                                        </Text>
                                                    </div>
                                                </Group>
                                                <Badge size="lg" color="red" variant="filled">
                                                    {group.users.length}
                                                </Badge>
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Stack gap="sm">
                                                {/* Liste des utilisateurs du groupe */}
                                                {group.users.map((user, userIndex) => (
                                                    <Paper
                                                        key={user.uid}
                                                        withBorder
                                                        p="sm"
                                                        radius="md"
                                                        bg={userIndex === 0 ? 'blue.0' : 'gray.0'}
                                                    >
                                                        <Group justify="space-between">
                                                            <Group gap="sm">
                                                                <Avatar
                                                                    color={userIndex === 0 ? 'blue' : 'gray'}
                                                                    radius="xl"
                                                                >
                                                                    {user.firstName[0]}
                                                                    {user.lastName[0]}
                                                                </Avatar>
                                                                <div>
                                                                    <Text size="sm" fw={500}>
                                                                        {user.firstName} {user.lastName}
                                                                    </Text>
                                                                    <Group gap={8} mt={4}>
                                                                        <Group gap={4}>
                                                                            <IconCalendar size={12} />
                                                                            <Text size="xs" c="dimmed">
                                                                                {formatDate(user.createdAt)}
                                                                            </Text>
                                                                        </Group>
                                                                        <Group gap={4}>
                                                                            <IconUserPlus size={12} />
                                                                            <Badge size="xs" variant="light">
                                                                                {REGISTRATION_SOURCE_LABELS[user.registrationSource]}
                                                                            </Badge>
                                                                        </Group>
                                                                    </Group>
                                                                </div>
                                                            </Group>
                                                            {userIndex === 0 && (
                                                                <Badge size="xs" color="blue">
                                                                    Plus ancien
                                                                </Badge>
                                                            )}
                                                        </Group>
                                                    </Paper>
                                                ))}

                                                <Divider my="xs" />

                                                {/* Bouton pour traiter ce doublon */}
                                                <Button
                                                    leftSection={<IconGitMerge size={16} />}
                                                    color="yellow"
                                                    fullWidth
                                                    onClick={() => onSelectGroup(originalIndex)}
                                                >
                                                    Traiter ce doublon
                                                </Button>
                                            </Stack>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                );
                            })}
                        </Accordion>
                    )}
                </ScrollArea>

                {/* Boutons d'action */}
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={onClose}>
                        Fermer
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
