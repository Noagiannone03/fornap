import { useState, useMemo } from 'react';
import {
  Stack,
  Text,
  TextInput,
  Group,
  Badge,
  Table,
  Checkbox,
  Button,
  Paper,
  ScrollArea,
  Pagination,
  LoadingOverlay,
} from '@mantine/core';
import {
  IconUsers,
  IconSearch,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react';
import type { UsersPreviewStepProps } from './types';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
} from '../../../shared/types/user';
import type { MembershipType, MembershipStatus } from '../../../shared/types/user';

const ITEMS_PER_PAGE = 20;

export function UsersPreviewStep({
  users,
  excludedUserIds,
  onExcludedChange,
  isLoading,
  tagsConfig,
  onPrevious,
  onNext,
}: UsersPreviewStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Filtrer les utilisateurs par recherche
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;

    const searchLower = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Selection
  const selectedCount = users.length - excludedUserIds.length;
  const isAllSelected = excludedUserIds.length === 0;

  const handleToggleUser = (userId: string) => {
    if (excludedUserIds.includes(userId)) {
      onExcludedChange(excludedUserIds.filter((id) => id !== userId));
    } else {
      onExcludedChange([...excludedUserIds, userId]);
    }
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      // Tout deselectionner
      onExcludedChange(users.map((u) => u.uid));
    } else {
      // Tout selectionner
      onExcludedChange([]);
    }
  };

  const handleTogglePage = () => {
    const pageUserIds = paginatedUsers.map((u) => u.uid);
    const allPageSelected = pageUserIds.every((id) => !excludedUserIds.includes(id));

    if (allPageSelected) {
      // Deselectionner la page
      onExcludedChange([...excludedUserIds, ...pageUserIds]);
    } else {
      // Selectionner la page
      onExcludedChange(excludedUserIds.filter((id) => !pageUserIds.includes(id)));
    }
  };

  const getTagColor = (tagName: string): string => {
    const config = tagsConfig.find((t) => t.name === tagName);
    return config?.color || 'gray';
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={isLoading} />

      {/* Header avec compteur */}
      <Paper p="md" withBorder bg="green.0">
        <Group justify="space-between">
          <Group>
            <IconUsers size={24} color="green" />
            <div>
              <Text fw={600}>Previsualisation</Text>
              <Text size="sm" c="dimmed">
                {users.length} utilisateur{users.length !== 1 ? 's' : ''} correspondent aux filtres
              </Text>
            </div>
          </Group>
          <Group>
            {excludedUserIds.length > 0 && (
              <Badge size="lg" color="red" variant="filled">
                {excludedUserIds.length} exclu{excludedUserIds.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge size="xl" color="green" variant="filled">
              {selectedCount} selectionne{selectedCount !== 1 ? 's' : ''}
            </Badge>
          </Group>
        </Group>
      </Paper>

      {/* Barre d'outils */}
      <Group justify="space-between">
        <TextInput
          placeholder="Rechercher dans les resultats..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <Group>
          <Button
            variant="light"
            size="sm"
            onClick={handleToggleAll}
          >
            {isAllSelected ? 'Tout deselectionner' : 'Tout selectionner'}
          </Button>
        </Group>
      </Group>

      {/* Tableau */}
      <ScrollArea h={400}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 50 }}>
                <Checkbox
                  checked={paginatedUsers.every((u) => !excludedUserIds.includes(u.uid))}
                  indeterminate={
                    paginatedUsers.some((u) => !excludedUserIds.includes(u.uid)) &&
                    !paginatedUsers.every((u) => !excludedUserIds.includes(u.uid))
                  }
                  onChange={handleTogglePage}
                />
              </Table.Th>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th>Tags</Table.Th>
              <Table.Th>Inscription</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedUsers.map((user) => {
              const isExcluded = excludedUserIds.includes(user.uid);
              return (
                <Table.Tr
                  key={user.uid}
                  style={{
                    opacity: isExcluded ? 0.5 : 1,
                    backgroundColor: isExcluded ? 'var(--mantine-color-red-0)' : undefined,
                  }}
                >
                  <Table.Td>
                    <Checkbox
                      checked={!isExcluded}
                      onChange={() => handleToggleUser(user.uid)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      fw={500}
                      style={{ textDecoration: isExcluded ? 'line-through' : 'none' }}
                    >
                      {user.firstName} {user.lastName}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      c="dimmed"
                      style={{ textDecoration: isExcluded ? 'line-through' : 'none' }}
                    >
                      {user.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      color={
                        user.currentMembership.planType === 'lifetime'
                          ? 'grape'
                          : user.currentMembership.planType === 'annual'
                          ? 'green'
                          : 'blue'
                      }
                    >
                      {MEMBERSHIP_TYPE_LABELS[user.currentMembership.planType as MembershipType]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      color={
                        user.currentMembership.status === 'active'
                          ? 'green'
                          : user.currentMembership.status === 'expired'
                          ? 'red'
                          : 'orange'
                      }
                    >
                      {MEMBERSHIP_STATUS_LABELS[user.currentMembership.status as MembershipStatus]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.status.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} size="xs" color={getTagColor(tag)}>
                          {tag}
                        </Badge>
                      ))}
                      {user.status.tags.length > 3 && (
                        <Badge size="xs" color="gray">
                          +{user.status.tags.length - 3}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {formatDate(user.registration.createdAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>

        {filteredUsers.length === 0 && (
          <Paper p="xl" ta="center">
            <Text c="dimmed">Aucun utilisateur trouve</Text>
          </Paper>
        )}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center">
          <Pagination value={page} onChange={setPage} total={totalPages} />
        </Group>
      )}

      {/* Actions */}
      <Group justify="space-between" mt="md">
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onPrevious}
        >
          Retour aux filtres
        </Button>
        <Button
          rightSection={<IconArrowRight size={16} />}
          onClick={onNext}
          disabled={selectedCount === 0}
        >
          Choisir les actions ({selectedCount})
        </Button>
      </Group>
    </Stack>
  );
}
