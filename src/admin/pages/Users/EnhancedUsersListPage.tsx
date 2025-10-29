import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Group,
  Button,
  Select,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  Stack,
  Pagination,
  MultiSelect,
  LoadingOverlay,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconDownload,
  IconPlus,
  IconDots,
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconLock,
  IconLockOpen,
  IconCreditCard,
  IconCreditCardOff,
  IconQrcode,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import {
  getAllUsersForList,
  toggleAccountBlocked,
  toggleCardBlocked,
  regenerateQRCode,
} from '../../../shared/services/userService';
import type {
  UserListItem,
  UserFilters,
  MembershipType,
  MembershipStatus,
  MemberTag,
} from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  REGISTRATION_SOURCE_LABELS,
  AVAILABLE_TAGS,
} from '../../../shared/types/user';

const membershipTypeColors: Record<MembershipType, string> = {
  monthly: 'blue',
  annual: 'green',
  lifetime: 'grape',
};

const membershipStatusColors: Record<MembershipStatus, string> = {
  active: 'green',
  expired: 'red',
  pending: 'orange',
  cancelled: 'gray',
};

export function EnhancedUsersListPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [blockedFilter, setBlockedFilter] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Charger les utilisateurs
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsersForList();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les utilisateurs',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Appliquer les filtres
  useEffect(() => {
    let filtered = [...users];

    // Recherche textuelle
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchLower) ||
          user.lastName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par type d'abonnement
    if (membershipType) {
      filtered = filtered.filter((user) => user.membership.type === membershipType);
    }

    // Filtre par statut d'abonnement
    if (membershipStatus) {
      filtered = filtered.filter((user) => user.membership.status === membershipStatus);
    }

    // Filtre par tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((user) =>
        selectedTags.some((tag) => user.tags.includes(tag))
      );
    }

    // Filtre par blocage
    if (blockedFilter === 'account_blocked') {
      filtered = filtered.filter((user) => user.isAccountBlocked);
    } else if (blockedFilter === 'card_blocked') {
      filtered = filtered.filter((user) => user.isCardBlocked);
    } else if (blockedFilter === 'not_blocked') {
      filtered = filtered.filter((user) => !user.isAccountBlocked && !user.isCardBlocked);
    }

    setFilteredUsers(filtered);
    setPage(1); // Reset à la page 1 quand on filtre
  }, [search, membershipType, membershipStatus, selectedTags, blockedFilter, users]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleViewUser = (uid: string) => {
    navigate(`/admin/users/${uid}`);
  };

  const handleEditUser = (uid: string) => {
    navigate(`/admin/users/${uid}/edit`);
  };

  const handleDeleteUser = (uid: string) => {
    // TODO: Implémenter la confirmation et la suppression
    console.log('Delete user:', uid);
  };

  const handleSendEmail = (email: string) => {
    // TODO: Implémenter l'envoi d'email
    console.log('Send email to:', email);
    notifications.show({
      title: 'Fonction à venir',
      message: 'L\'envoi d\'email sera disponible prochainement',
      color: 'blue',
    });
  };

  const handleToggleAccountBlock = async (userId: string, currentState: boolean) => {
    try {
      await toggleAccountBlocked(
        userId,
        !currentState,
        currentState ? '' : 'Bloqué via interface admin',
        'current-admin-id' // TODO: Utiliser l'ID de l'admin connecté
      );
      notifications.show({
        title: 'Succès',
        message: `Compte ${!currentState ? 'bloqué' : 'débloqué'}`,
        color: 'green',
      });
      loadUsers();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de modifier le statut du compte',
        color: 'red',
      });
    }
  };

  const handleToggleCardBlock = async (userId: string, currentState: boolean) => {
    try {
      await toggleCardBlocked(
        userId,
        !currentState,
        currentState ? '' : 'Carte bloquée via interface admin',
        'current-admin-id' // TODO: Utiliser l'ID de l'admin connecté
      );
      notifications.show({
        title: 'Succès',
        message: `Carte ${!currentState ? 'bloquée' : 'débloquée'}`,
        color: 'green',
      });
      loadUsers();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de modifier le statut de la carte',
        color: 'red',
      });
    }
  };

  const handleRegenerateQR = async (userId: string) => {
    try {
      await regenerateQRCode(userId, 'current-admin-id'); // TODO: Utiliser l'ID de l'admin connecté
      notifications.show({
        title: 'Succès',
        message: 'QR code régénéré avec succès',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de régénérer le QR code',
        color: 'red',
      });
    }
  };

  const handleExport = () => {
    // TODO: Implémenter l'export CSV/Excel
    console.log('Export users');
    notifications.show({
      title: 'Fonction à venir',
      message: 'L\'export sera disponible prochainement',
      color: 'blue',
    });
  };

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Utilisateurs</Title>
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            variant="light"
            onClick={handleExport}
          >
            Exporter
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate('/admin/users/new')}
          >
            Nouvel Utilisateur
          </Button>
        </Group>
      </Group>

      {/* Statistiques rapides */}
      <Group mb="xl" grow>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Total Utilisateurs</Text>
          <Text size="xl" fw={700}>{users.length}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Abonnements Actifs</Text>
          <Text size="xl" fw={700} c="green">
            {users.filter((u) => u.membership.status === 'active').length}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Comptes Bloqués</Text>
          <Text size="xl" fw={700} c="red">
            {users.filter((u) => u.isAccountBlocked).length}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">Cartes Bloquées</Text>
          <Text size="xl" fw={700} c="orange">
            {users.filter((u) => u.isCardBlocked).length}
          </Text>
        </Paper>
      </Group>

      {/* Filtres */}
      <Paper withBorder p="md" mb="md" radius="md">
        <Stack gap="md">
          <TextInput
            placeholder="Rechercher par nom, email..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
          />

          <Group>
            <Select
              placeholder="Type d'abonnement"
              data={[
                { value: '', label: 'Tous' },
                { value: 'monthly', label: MEMBERSHIP_TYPE_LABELS.monthly },
                { value: 'annual', label: MEMBERSHIP_TYPE_LABELS.annual },
                { value: 'lifetime', label: MEMBERSHIP_TYPE_LABELS.lifetime },
              ]}
              value={membershipType || ''}
              onChange={(value) => setMembershipType((value as MembershipType) || null)}
              clearable
              style={{ flex: 1 }}
            />

            <Select
              placeholder="Statut"
              data={[
                { value: '', label: 'Tous' },
                { value: 'active', label: MEMBERSHIP_STATUS_LABELS.active },
                { value: 'expired', label: MEMBERSHIP_STATUS_LABELS.expired },
                { value: 'pending', label: MEMBERSHIP_STATUS_LABELS.pending },
                { value: 'cancelled', label: MEMBERSHIP_STATUS_LABELS.cancelled },
              ]}
              value={membershipStatus || ''}
              onChange={(value) => setMembershipStatus((value as MembershipStatus) || null)}
              clearable
              style={{ flex: 1 }}
            />

            <Select
              placeholder="État de blocage"
              data={[
                { value: '', label: 'Tous' },
                { value: 'not_blocked', label: 'Non bloqués' },
                { value: 'account_blocked', label: 'Compte bloqué' },
                { value: 'card_blocked', label: 'Carte bloquée' },
              ]}
              value={blockedFilter || ''}
              onChange={setBlockedFilter}
              clearable
              style={{ flex: 1 }}
            />

            <MultiSelect
              placeholder="Tags"
              data={AVAILABLE_TAGS.map((tag) => ({ value: tag, label: tag }))}
              value={selectedTags}
              onChange={setSelectedTags}
              clearable
              searchable
              style={{ flex: 1 }}
            />
          </Group>

          {(search || membershipType || membershipStatus || selectedTags.length > 0 || blockedFilter) && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setSearch('');
                  setMembershipType(null);
                  setMembershipStatus(null);
                  setSelectedTags([]);
                  setBlockedFilter(null);
                }}
              >
                Réinitialiser les filtres
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Table des utilisateurs */}
      <Paper withBorder radius="md" shadow="sm">
        <Table.ScrollContainer minWidth={1000}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Utilisateur</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Abonnement</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Points</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Blocage</Table.Th>
                <Table.Th>Inscription</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedUsers.map((user) => (
                <Table.Tr key={user.uid}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar color="indigo" radius="xl">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={500}>
                          {user.firstName} {user.lastName}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{user.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={membershipTypeColors[user.membership.type]} variant="light">
                      {MEMBERSHIP_TYPE_LABELS[user.membership.type]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={membershipStatusColors[user.membership.status]} variant="dot">
                      {MEMBERSHIP_STATUS_LABELS[user.membership.status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {user.loyaltyPoints}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} size="xs" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {user.tags.length > 2 && (
                        <Badge size="xs" variant="outline">
                          +{user.tags.length - 2}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {user.isAccountBlocked && (
                        <Tooltip label="Compte bloqué">
                          <Badge size="xs" color="red">
                            <IconLock size={12} />
                          </Badge>
                        </Tooltip>
                      )}
                      {user.isCardBlocked && (
                        <Tooltip label="Carte bloquée">
                          <Badge size="xs" color="orange">
                            <IconCreditCardOff size={12} />
                          </Badge>
                        </Tooltip>
                      )}
                      {!user.isAccountBlocked && !user.isCardBlocked && (
                        <Badge size="xs" color="green" variant="light">
                          Actif
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(user.createdAt.toDate()).toLocaleDateString('fr-FR')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Tooltip label="Voir le profil">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={() => handleViewUser(user.uid)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Menu shadow="md" width={220}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => handleEditUser(user.uid)}
                          >
                            Modifier
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconMail size={14} />}
                            onClick={() => handleSendEmail(user.email)}
                          >
                            Envoyer un email
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconQrcode size={14} />}
                            onClick={() => handleRegenerateQR(user.uid)}
                          >
                            Régénérer QR code
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={user.isAccountBlocked ? <IconLockOpen size={14} /> : <IconLock size={14} />}
                            color={user.isAccountBlocked ? 'green' : 'orange'}
                            onClick={() => handleToggleAccountBlock(user.uid, user.isAccountBlocked)}
                          >
                            {user.isAccountBlocked ? 'Débloquer' : 'Bloquer'} le compte
                          </Menu.Item>
                          <Menu.Item
                            leftSection={user.isCardBlocked ? <IconCreditCard size={14} /> : <IconCreditCardOff size={14} />}
                            color={user.isCardBlocked ? 'green' : 'orange'}
                            onClick={() => handleToggleCardBlock(user.uid, user.isCardBlocked)}
                          >
                            {user.isCardBlocked ? 'Débloquer' : 'Bloquer'} la carte
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleDeleteUser(user.uid)}
                          >
                            Supprimer
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {filteredUsers.length === 0 && !loading && (
          <Text ta="center" c="dimmed" py="xl">
            Aucun utilisateur trouvé
          </Text>
        )}

        {filteredUsers.length > 0 && (
          <Group justify="space-between" p="md">
            <Text size="sm" c="dimmed">
              Affichage de {(page - 1) * itemsPerPage + 1} à{' '}
              {Math.min(page * itemsPerPage, filteredUsers.length)} sur{' '}
              {filteredUsers.length} utilisateurs
            </Text>
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
            />
          </Group>
        )}
      </Paper>
    </Container>
  );
}
