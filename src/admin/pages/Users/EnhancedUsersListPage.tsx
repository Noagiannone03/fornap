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
  IconArrowRight,
  IconUsers,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  getAllUsersForListSeparated,
  toggleAccountBlocked,
  toggleCardBlocked,
  deleteUser,
  migrateLegacyMember,
} from '../../../shared/services/userService';
import type {
  UserListItem,
  MembershipType,
  MembershipStatus,
} from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  AVAILABLE_TAGS,
  REGISTRATION_SOURCE_LABELS,
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

const registrationSourceColors: Record<string, string> = {
  platform: 'cyan',
  admin: 'violet',
  transfer: 'orange',
};

// Composant pour rendre une ligne de tableau
function UserTableRow({
  user,
  isLegacy,
  onView,
  onEdit,
  onDelete,
  onSendEmail,
  onToggleAccountBlock,
  onToggleCardBlock,
  onMigrate,
}: {
  user: UserListItem;
  isLegacy: boolean;
  onView?: (uid: string) => void;
  onEdit?: (uid: string) => void;
  onDelete?: (uid: string, name: string) => void;
  onSendEmail?: (email: string) => void;
  onToggleAccountBlock?: (uid: string, current: boolean) => void;
  onToggleCardBlock?: (uid: string, current: boolean) => void;
  onMigrate?: (uid: string, name: string) => void;
}) {
  const hasDataAnomaly = user.tags.includes('DATA_ANOMALY');

  return (
    <Table.Tr style={isLegacy ? { backgroundColor: 'rgba(255, 165, 0, 0.08)' } : undefined}>
      <Table.Td>
        <Group gap="sm">
          <Avatar color={isLegacy ? 'orange' : hasDataAnomaly ? 'red' : 'indigo'} radius="xl">
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
        <Text size="sm" c="dimmed">
          {(() => {
            try {
              if (!user.createdAt) return 'Date inconnue';
              const date =
                typeof user.createdAt.toDate === 'function'
                  ? user.createdAt.toDate()
                  : new Date((user.createdAt.seconds || 0) * 1000);
              return date.toLocaleDateString('fr-FR');
            } catch (e) {
              return 'Date invalide';
            }
          })()}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={registrationSourceColors[user.registrationSource]} variant="light" size="sm">
          {REGISTRATION_SOURCE_LABELS[user.registrationSource]}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {!isLegacy && onView && (
            <Tooltip label="Voir le profil">
              <ActionIcon variant="subtle" color="blue" onClick={() => onView(user.uid)}>
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Menu shadow="md" width={240}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {isLegacy ? (
                <>
                  <Menu.Item
                    leftSection={<IconArrowRight size={14} />}
                    color="blue"
                    onClick={() => onMigrate?.(user.uid, `${user.firstName} ${user.lastName}`)}
                  >
                    Migrer vers nouveau système
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconMail size={14} />}
                    onClick={() => onSendEmail?.(user.email)}
                  >
                    Envoyer un email
                  </Menu.Item>
                </>
              ) : (
                <>
                  <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit?.(user.uid)}>
                    Modifier
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconMail size={14} />}
                    onClick={() => onSendEmail?.(user.email)}
                  >
                    Envoyer un email
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={
                      user.isAccountBlocked ? <IconLockOpen size={14} /> : <IconLock size={14} />
                    }
                    color={user.isAccountBlocked ? 'green' : 'orange'}
                    onClick={() => onToggleAccountBlock?.(user.uid, user.isAccountBlocked)}
                  >
                    {user.isAccountBlocked ? 'Débloquer' : 'Bloquer'} le compte
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      user.isCardBlocked ? <IconCreditCard size={14} /> : <IconCreditCardOff size={14} />
                    }
                    color={user.isCardBlocked ? 'green' : 'orange'}
                    onClick={() => onToggleCardBlock?.(user.uid, user.isCardBlocked)}
                  >
                    {user.isCardBlocked ? 'Débloquer' : 'Bloquer'} la carte
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => onDelete?.(user.uid, `${user.firstName} ${user.lastName}`)}
                  >
                    Supprimer
                  </Menu.Item>
                </>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function EnhancedUsersListPage() {
  const navigate = useNavigate();
  const [legacyMembers, setLegacyMembers] = useState<UserListItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredLegacyMembers, setFilteredLegacyMembers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [blockedFilter, setBlockedFilter] = useState<string | null>(null);
  const [registrationSourceFilter, setRegistrationSourceFilter] = useState<string | null>(null);

  // Pagination
  const [legacyPage, setLegacyPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsersForListSeparated();
      setLegacyMembers(data.legacyMembers);
      setUsers(data.users);
      setFilteredLegacyMembers(data.legacyMembers);
      setFilteredUsers(data.users);
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
    const applyFilters = (userList: UserListItem[]) => {
      let filtered = [...userList];

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.firstName.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower)
        );
      }

      if (membershipType) {
        filtered = filtered.filter((user) => user.membership.type === membershipType);
      }

      if (membershipStatus) {
        filtered = filtered.filter((user) => user.membership.status === membershipStatus);
      }

      if (registrationSourceFilter) {
        filtered = filtered.filter((user) => user.registrationSource === registrationSourceFilter);
      }

      return filtered;
    };

    let filteredUsersData = applyFilters(users);

    if (selectedTags.length > 0) {
      filteredUsersData = filteredUsersData.filter((user) =>
        selectedTags.some((tag) => user.tags.includes(tag))
      );
    }

    if (blockedFilter === 'account_blocked') {
      filteredUsersData = filteredUsersData.filter((user) => user.isAccountBlocked);
    } else if (blockedFilter === 'card_blocked') {
      filteredUsersData = filteredUsersData.filter((user) => user.isCardBlocked);
    } else if (blockedFilter === 'not_blocked') {
      filteredUsersData = filteredUsersData.filter(
        (user) => !user.isAccountBlocked && !user.isCardBlocked
      );
    }

    setFilteredLegacyMembers(applyFilters(legacyMembers));
    setFilteredUsers(filteredUsersData);
    setLegacyPage(1);
    setUsersPage(1);
  }, [search, membershipType, membershipStatus, selectedTags, blockedFilter, registrationSourceFilter, legacyMembers, users]);

  // Pagination
  const legacyTotalPages = Math.ceil(filteredLegacyMembers.length / itemsPerPage);
  const paginatedLegacyMembers = filteredLegacyMembers.slice(
    (legacyPage - 1) * itemsPerPage,
    legacyPage * itemsPerPage
  );

  const usersTotalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * itemsPerPage,
    usersPage * itemsPerPage
  );

  const handleViewUser = (uid: string) => navigate(`/admin/users/${uid}`);
  const handleEditUser = (uid: string) => navigate(`/admin/users/${uid}/edit`);

  const handleDeleteUser = (uid: string, userName: string) => {
    modals.openConfirmModal({
      title: "Supprimer définitivement l'utilisateur",
      centered: true,
      children: (
        <Text size="sm">
          Êtes-vous sûr de vouloir supprimer <strong>{userName}</strong> ?<br />
          <br />
          ⚠️ <strong>Cette action est irréversible.</strong>
        </Text>
      ),
      labels: { confirm: 'Supprimer définitivement', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteUser(uid, 'current-admin-id');
          notifications.show({
            title: 'Succès',
            message: 'Utilisateur supprimé',
            color: 'green',
          });
          loadUsers();
        } catch (error) {
          notifications.show({
            title: 'Erreur',
            message: "Impossible de supprimer l'utilisateur",
            color: 'red',
          });
        }
      },
    });
  };

  const handleSendEmail = (_email: string) => {
    notifications.show({
      title: 'Fonction à venir',
      message: "L'envoi d'email sera disponible prochainement",
      color: 'blue',
    });
  };

  const handleToggleAccountBlock = async (userId: string, currentState: boolean) => {
    try {
      await toggleAccountBlocked(
        userId,
        !currentState,
        currentState ? '' : 'Bloqué via interface admin',
        'current-admin-id'
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
        'current-admin-id'
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

  // Note: La régénération du QR code n'est plus nécessaire car le QR code
  // est maintenant basé directement sur l'UID de l'utilisateur, qui ne change jamais.

  const handleMigrateLegacyMember = (uid: string, userName: string) => {
    modals.openConfirmModal({
      title: 'Migrer vers le nouveau système',
      centered: true,
      children: (
        <Text size="sm">
          Êtes-vous sûr de vouloir migrer <strong>{userName}</strong> vers le nouveau système ?
          <br />
          <br />
          Les informations suivantes seront conservées :
          <ul>
            <li>Nom et prénom</li>
            <li>Email et téléphone</li>
            <li>Code postal</li>
            <li>Type d'abonnement</li>
            <li>Date de fin d'abonnement</li>
          </ul>
        </Text>
      ),
      labels: { confirm: 'Migrer', cancel: 'Annuler' },
      confirmProps: { color: 'blue' },
      onConfirm: async () => {
        try {
          await migrateLegacyMember(uid, 'current-admin-id');
          notifications.show({
            title: 'Succès',
            message: 'Membre migré avec succès',
            color: 'green',
          });
          loadUsers();
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Impossible de migrer le membre',
            color: 'red',
          });
        }
      },
    });
  };

  const handleExport = () => {
    notifications.show({
      title: 'Fonction à venir',
      message: "L'export sera disponible prochainement",
      color: 'blue',
    });
  };

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Utilisateurs</Title>
        <Group>
          <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
            Exporter
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/admin/users/new')}>
            Nouvel Utilisateur
          </Button>
        </Group>
      </Group>

      {/* Statistiques */}
      <Group mb="xl" grow>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            Total Utilisateurs
          </Text>
          <Text size="xl" fw={700}>
            {legacyMembers.length + users.length}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            Membres Non Migrés
          </Text>
          <Text size="xl" fw={700} c="orange">
            {legacyMembers.length}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            Abonnements Actifs
          </Text>
          <Text size="xl" fw={700} c="green">
            {users.filter((u) => u.membership.status === 'active').length}
          </Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="sm" c="dimmed">
            Comptes Bloqués
          </Text>
          <Text size="xl" fw={700} c="red">
            {users.filter((u) => u.isAccountBlocked).length}
          </Text>
        </Paper>
      </Group>

      {/* Filtres */}
      <Paper withBorder p="md" mb="xl" radius="md">
        <Stack gap="md">
          <TextInput
            placeholder="Rechercher par nom, email..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
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

            <Select
              placeholder="Source d'origine"
              data={[
                { value: '', label: 'Toutes' },
                { value: 'platform', label: REGISTRATION_SOURCE_LABELS.platform },
                { value: 'admin', label: REGISTRATION_SOURCE_LABELS.admin },
                { value: 'transfer', label: REGISTRATION_SOURCE_LABELS.transfer },
              ]}
              value={registrationSourceFilter || ''}
              onChange={setRegistrationSourceFilter}
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

          {(search ||
            membershipType ||
            membershipStatus ||
            selectedTags.length > 0 ||
            blockedFilter ||
            registrationSourceFilter) && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Anciens membres: {filteredLegacyMembers.length} | Utilisateurs: {filteredUsers.length}
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
                  setRegistrationSourceFilter(null);
                }}
              >
                Réinitialiser les filtres
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>

      {/* SECTION 1: Utilisateurs (nouveau système) */}
      <Stack gap="md" mb={filteredLegacyMembers.length > 0 ? 'xl' : undefined}>
        <Paper withBorder p="md" radius="md" bg="blue.0">
          <Group>
            <IconUsers size={28} />
            <div style={{ flex: 1 }}>
              <Title order={2}>Utilisateurs</Title>
              <Text size="sm" c="dimmed">
                Membres du nouveau système
              </Text>
            </div>
            <Badge size="lg" color="blue" variant="filled">
              {filteredUsers.length}
            </Badge>
          </Group>
        </Paper>

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
                  <Table.Th>Inscription</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedUsers.map((user) => (
                  <UserTableRow
                    key={user.uid}
                    user={user}
                    isLegacy={false}
                    onView={handleViewUser}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                    onSendEmail={handleSendEmail}
                    onToggleAccountBlock={handleToggleAccountBlock}
                    onToggleCardBlock={handleToggleCardBlock}
                  />
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
                Affichage de {(usersPage - 1) * itemsPerPage + 1} à{' '}
                {Math.min(usersPage * itemsPerPage, filteredUsers.length)} sur {filteredUsers.length}{' '}
                utilisateurs
              </Text>
              <Pagination
                total={usersTotalPages}
                value={usersPage}
                onChange={setUsersPage}
                size="sm"
              />
            </Group>
          )}
        </Paper>
      </Stack>

      {/* SECTION 2: Anciens membres non migrés */}
      {filteredLegacyMembers.length > 0 && (
        <Stack gap="md">
          <Paper withBorder p="md" radius="md" bg="orange.0">
            <Group>
              <IconAlertTriangle size={28} />
              <div style={{ flex: 1 }}>
                <Title order={2}>Membres à migrer</Title>
                <Text size="sm" c="dimmed">
                  Anciens membres non encore migrés vers le nouveau système
                </Text>
              </div>
              <Badge size="lg" color="orange" variant="filled">
                {filteredLegacyMembers.length}
              </Badge>
            </Group>
          </Paper>

          <Paper
            withBorder
            radius="md"
            shadow="sm"
            style={{ borderColor: 'var(--mantine-color-orange-6)', borderWidth: 2 }}
          >
            <Table.ScrollContainer minWidth={1000}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Membre</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Points</Table.Th>
                    <Table.Th>Inscription</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedLegacyMembers.map((member) => (
                    <UserTableRow
                      key={member.uid}
                      user={member}
                      isLegacy={true}
                      onSendEmail={handleSendEmail}
                      onMigrate={handleMigrateLegacyMember}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            {filteredLegacyMembers.length > 0 && (
              <Group justify="space-between" p="md">
                <Text size="sm" c="dimmed">
                  Affichage de {(legacyPage - 1) * itemsPerPage + 1} à{' '}
                  {Math.min(legacyPage * itemsPerPage, filteredLegacyMembers.length)} sur{' '}
                  {filteredLegacyMembers.length} membres
                </Text>
                <Pagination
                  total={legacyTotalPages}
                  value={legacyPage}
                  onChange={setLegacyPage}
                  size="sm"
                />
              </Group>
            )}
          </Paper>
        </Stack>
      )}
    </Container>
  );
}
