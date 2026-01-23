import { useState, useEffect } from 'react';
import {
  Container,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  Stack,
  TagsInput,
  LoadingOverlay,
  Tooltip,
  Checkbox,
  Progress,
  Alert,
  Modal,
  Group,
  Paper,
  Button,
} from '@mantine/core';
import {
  IconEye,
  IconEdit,
  IconTrash,
  IconMail,
  IconLock,
  IconLockOpen,
  IconCreditCard,
  IconCreditCardOff,
  IconArrowRight,
  IconDots,
  IconMailCheck,
  IconMailX,
  IconSend,
  IconCheck,
  IconX,
  IconTags,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import {
  getAllUsersForListSeparated,
  toggleAccountBlocked,
  toggleCardBlocked,
  deleteUser,
  migrateLegacyMember,
  sendMembershipCard,
  getAllUniqueTags,
  bulkAddTagsToUsers,
} from '../../../shared/services/userService';
import type {
  UserListItem,
  MembershipType,
  MembershipStatus,
} from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  REGISTRATION_SOURCE_LABELS,
  AVAILABLE_TAGS,
} from '../../../shared/types/user';
import { CsvImportModal } from '../../components/CsvImportModal';
import { SendMassiveCardsModal } from '../../components/SendMassiveCardsModal';
import { TagsManagerModal } from '../../components/TagsManagerModal';
import { QuickAddUserModal } from '../../components/QuickAddUserModal';
import { ExordeTagCheckerModal } from '../../components/ExordeTagCheckerModal';
import { UserExportModal } from '../../components/UserExportModal';
import { PurchaseMigrationModal } from '../../components/PurchaseMigrationModal';
import { PaymentFixModal } from '../../components/PaymentFixModal';
import { ContributionFixModal } from '../../components/ContributionFixModal';
import {
  getAllTags,
  getTagColor,
  type TagConfig,
} from '../../../shared/services/tagService';
import {
  findDuplicateUsers,
  mergeUsers,
  type DuplicateGroup,
  type UserMergeData,
} from '../../../shared/services/duplicateDetectionService';
import { DuplicateUserModal } from '../../components/DuplicateUserModal';
import { DuplicateReviewModal } from '../../components/DuplicateReviewModal';
import { ItemNormalizationModal } from '../../components/ItemNormalizationModal';

// Import new components
import {
  UsersPageHeader,
  UsersStatsCards,
  UsersFiltersPanel,
  UsersTableSection,
  LegacyMembersSection,
} from './components';

// ============================================================================
// Constants
// ============================================================================

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

// ============================================================================
// Helper Functions
// ============================================================================

function parseCreatedAtDate(createdAt: any): Date {
  if (!createdAt) return new Date(0);

  try {
    if (typeof createdAt.toDate === 'function') {
      return createdAt.toDate();
    }

    if (typeof createdAt === 'object' && ('seconds' in createdAt || '_seconds' in createdAt)) {
      const seconds = createdAt.seconds || createdAt._seconds || 0;
      const nanoseconds = createdAt.nanoseconds || createdAt._nanoseconds || 0;
      const milliseconds = seconds * 1000 + Math.floor(nanoseconds / 1000000);
      return new Date(milliseconds);
    }

    if (createdAt instanceof Date) {
      return createdAt;
    }

    if (typeof createdAt === 'number') {
      if (createdAt < 10000000000) {
        return new Date(createdAt * 1000);
      }
      return new Date(createdAt);
    }

    if (typeof createdAt === 'string') {
      const parsed = new Date(createdAt);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    console.warn('Format de date inconnu:', createdAt);
    return new Date(0);
  } catch (e) {
    console.error('Error parsing createdAt:', e, createdAt);
    return new Date(0);
  }
}

// ============================================================================
// UserTableRow Component
// ============================================================================

interface UserTableRowProps {
  user: UserListItem;
  isLegacy: boolean;
  tagsConfig: TagConfig[];
  isSelected?: boolean;
  onSelect?: (uid: string, checked: boolean) => void;
  onView?: (uid: string) => void;
  onEdit?: (uid: string) => void;
  onDelete?: (uid: string, name: string) => void;
  onSendEmail?: (email: string) => void;
  onToggleAccountBlock?: (uid: string, current: boolean) => void;
  onToggleCardBlock?: (uid: string, current: boolean) => void;
  onMigrate?: (uid: string, name: string) => void;
  onSendMembershipCard?: (uid: string, userName: string, isResend: boolean) => void;
}

function UserTableRow({
  user,
  isLegacy,
  tagsConfig,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSendEmail,
  onToggleAccountBlock,
  onToggleCardBlock,
  onMigrate,
  onSendMembershipCard,
}: UserTableRowProps) {
  const hasDataAnomaly = user.tags.includes('DATA_ANOMALY');
  const emailSent = user.emailStatus?.membershipCardSent || false;
  const emailSentCount = user.emailStatus?.membershipCardSentCount || 0;

  return (
    <Table.Tr style={isLegacy ? { backgroundColor: 'rgba(255, 165, 0, 0.08)' } : undefined}>
      {onSelect && (
        <Table.Td>
          <Checkbox
            checked={isSelected || false}
            onChange={(e) => onSelect(user.uid, e.currentTarget.checked)}
          />
        </Table.Td>
      )}
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
            {!isLegacy && (
              <Group gap={4} mt={4}>
                {emailSent ? (
                  <Tooltip label={`Email envoye ${emailSentCount} fois - Derniere fois: ${user.emailStatus?.membershipCardSentAt?.toDate().toLocaleDateString('fr-FR') || 'N/A'}`}>
                    <Badge size="xs" variant="light" color="green" leftSection={<IconMailCheck size={12} />}>
                      Email envoye {emailSentCount > 1 ? `(x${emailSentCount})` : ''}
                    </Badge>
                  </Tooltip>
                ) : (
                  <Tooltip label="Email de carte d'adherent non envoye">
                    <Badge size="xs" variant="light" color="red" leftSection={<IconMailX size={12} />}>
                      Email non envoye
                    </Badge>
                  </Tooltip>
                )}
              </Group>
            )}
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
        <Group gap={6} wrap="wrap" maw={200}>
          {user.tags && user.tags.length > 0 ? (
            user.tags.map((tag, index) => {
              const tagColor = getTagColor(tag, tagsConfig);
              return (
                <Badge
                  key={index}
                  size="sm"
                  variant="light"
                  style={{
                    cursor: 'default',
                    backgroundColor: tagColor + '20',
                    color: tagColor,
                    borderColor: tagColor + '40',
                  }}
                >
                  {tag.length > 20 ? `${tag.substring(0, 20)}...` : tag}
                </Badge>
              );
            })
          ) : (
            <Text size="xs" c="dimmed" fs="italic">
              Aucun tag
            </Text>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge
          size="sm"
          variant="light"
          color={
            user.registrationSource === 'platform'
              ? 'blue'
              : user.registrationSource === 'admin'
                ? 'violet'
                : user.registrationSource === 'crowdfunding'
                  ? 'pink'
                  : user.registrationSource === 'adhesion_web'
                    ? 'green'
                    : user.registrationSource === 'adhesion'
                      ? 'teal'
                      : 'orange'
          }
        >
          {REGISTRATION_SOURCE_LABELS[user.registrationSource]}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {(() => {
            try {
              const date = parseCreatedAtDate(user.createdAt);
              if (date.getTime() === 0) return 'Date inconnue';
              return date.toLocaleDateString('fr-FR');
            } catch (e) {
              return 'Date invalide';
            }
          })()}
        </Text>
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
                    Migrer vers nouveau systeme
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
                    leftSection={<IconSend size={14} />}
                    color={emailSent ? 'blue' : 'green'}
                    onClick={() => onSendMembershipCard?.(user.uid, `${user.firstName} ${user.lastName}`, emailSent)}
                  >
                    {emailSent ? 'Renvoyer' : 'Envoyer'} la carte d'adherent
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={
                      user.isAccountBlocked ? <IconLockOpen size={14} /> : <IconLock size={14} />
                    }
                    color={user.isAccountBlocked ? 'green' : 'orange'}
                    onClick={() => onToggleAccountBlock?.(user.uid, user.isAccountBlocked)}
                  >
                    {user.isAccountBlocked ? 'Debloquer' : 'Bloquer'} le compte
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      user.isCardBlocked ? <IconCreditCard size={14} /> : <IconCreditCardOff size={14} />
                    }
                    color={user.isCardBlocked ? 'green' : 'orange'}
                    onClick={() => onToggleCardBlock?.(user.uid, user.isCardBlocked)}
                  >
                    {user.isCardBlocked ? 'Debloquer' : 'Bloquer'} la carte
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

// ============================================================================
// Migration Progress Interface
// ============================================================================

interface MigrationProgress {
  uid: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedUsersListPage() {
  const navigate = useNavigate();
  const { currentUser } = useAdminAuth();

  // Data state
  const [legacyMembers, setLegacyMembers] = useState<UserListItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredLegacyMembers, setFilteredLegacyMembers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>(AVAILABLE_TAGS);
  const [tagsConfig, setTagsConfig] = useState<TagConfig[]>([]);

  // Modal states
  const [csvImportModalOpened, setCsvImportModalOpened] = useState(false);
  const [quickAddModalOpened, setQuickAddModalOpened] = useState(false);
  const [sendMassiveCardsModalOpened, setSendMassiveCardsModalOpened] = useState(false);
  const [forceResend, setForceResend] = useState(false);
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [tagsManagerOpened, setTagsManagerOpened] = useState(false);
  const [exordeCheckerOpened, setExordeCheckerOpened] = useState(false);
  const [exportModalOpened, setExportModalOpened] = useState(false);
  const [purchaseMigrationOpened, setPurchaseMigrationOpened] = useState(false);
  const [paymentFixOpened, setPaymentFixOpened] = useState(false);
  const [itemNormalizationOpened, setItemNormalizationOpened] = useState(false);
  const [contributionFixOpened, setContributionFixOpened] = useState(false);

  // Duplicate detection states
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
  const [duplicateModalOpened, setDuplicateModalOpened] = useState(false);
  const [duplicateReviewOpened, setDuplicateReviewOpened] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

  // Bulk operations states
  const [selectedLegacyUsers, setSelectedLegacyUsers] = useState<Set<string>>(new Set());
  const [bulkMigrationModalOpened, setBulkMigrationModalOpened] = useState(false);
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAddTagsModalOpened, setBulkAddTagsModalOpened] = useState(false);
  const [addingTags, setAddingTags] = useState(false);

  // Filter states
  const [search, setSearch] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [blockedFilter, setBlockedFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [legacyDateRangeStart, setLegacyDateRangeStart] = useState<Date | null>(null);
  const [legacyDateRangeEnd, setLegacyDateRangeEnd] = useState<Date | null>(null);

  // Pagination states
  const [legacyPage, setLegacyPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const itemsPerPage = 20;

  const adminUserId = currentUser?.uid || 'system';

  // Computed values
  const unsentUsersCount = users.filter(
    (u) => !u.emailStatus || !u.emailStatus.membershipCardSent
  ).length;
  const emailsSentCount = users.length - unsentUsersCount;
  const activeSubscriptionsCount = users.filter((u) => u.membership.status === 'active').length;
  const blockedAccountsCount = users.filter((u) => u.isAccountBlocked).length;

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    loadUsers();
    loadAllTags();
    loadTagsConfig();
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

  const loadTagsConfig = async () => {
    try {
      const config = await getAllTags();
      setTagsConfig(config);
      const tagNames = config.map(t => t.name);
      const uniqueTags = await getAllUniqueTags();
      const mergedTags = Array.from(new Set([...AVAILABLE_TAGS, ...tagNames, ...uniqueTags]));
      setAllTags(mergedTags.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading tags config:', error);
    }
  };

  const loadAllTags = async () => {
    try {
      const [uniqueTags, configTags] = await Promise.all([
        getAllUniqueTags(),
        getAllTags(),
      ]);
      const configTagNames = configTags.map(t => t.name);
      const mergedTags = Array.from(new Set([...AVAILABLE_TAGS, ...configTagNames, ...uniqueTags]));
      setAllTags(mergedTags.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading tags:', error);
      setAllTags(AVAILABLE_TAGS);
    }
  };

  const handleTagsUpdated = () => {
    loadTagsConfig();
    loadAllTags();
  };

  // ============================================================================
  // Filtering Logic
  // ============================================================================

  useEffect(() => {
    const applyUsersFilters = (userList: UserListItem[]) => {
      let filtered = [...userList];

      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.firstName.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.uid.toLowerCase().includes(searchLower)
        );
      }

      if (membershipType) {
        filtered = filtered.filter((user) => user.membership.type === membershipType);
      }

      if (membershipStatus) {
        filtered = filtered.filter((user) => user.membership.status === membershipStatus);
      }

      if (dateRangeStart || dateRangeEnd) {
        filtered = filtered.filter((user) => {
          const userDate = parseCreatedAtDate(user.createdAt);
          if (dateRangeStart) {
            const startOfDay = new Date(dateRangeStart);
            startOfDay.setHours(0, 0, 0, 0);
            if (userDate < startOfDay) return false;
          }
          if (dateRangeEnd) {
            const endOfDay = new Date(dateRangeEnd);
            endOfDay.setHours(23, 59, 59, 999);
            if (userDate > endOfDay) return false;
          }
          return true;
        });
      }

      return filtered;
    };

    const applyLegacyFilters = (userList: UserListItem[]) => {
      let filtered = [...userList];
      if (legacyDateRangeStart || legacyDateRangeEnd) {
        filtered = filtered.filter((user) => {
          const userDate = parseCreatedAtDate(user.createdAt);
          if (legacyDateRangeStart) {
            const startOfDay = new Date(legacyDateRangeStart);
            startOfDay.setHours(0, 0, 0, 0);
            if (userDate < startOfDay) return false;
          }
          if (legacyDateRangeEnd) {
            const endOfDay = new Date(legacyDateRangeEnd);
            endOfDay.setHours(23, 59, 59, 999);
            if (userDate > endOfDay) return false;
          }
          return true;
        });
      }
      return filtered;
    };

    const applySorting = (userList: UserListItem[]) => {
      const sorted = [...userList];
      switch (sortBy) {
        case 'name_asc':
          sorted.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
          break;
        case 'name_desc':
          sorted.sort((a, b) => `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
          break;
        case 'date_asc':
          sorted.sort((a, b) => parseCreatedAtDate(a.createdAt).getTime() - parseCreatedAtDate(b.createdAt).getTime());
          break;
        case 'date_desc':
          sorted.sort((a, b) => parseCreatedAtDate(b.createdAt).getTime() - parseCreatedAtDate(a.createdAt).getTime());
          break;
        case 'points_asc':
          sorted.sort((a, b) => a.loyaltyPoints - b.loyaltyPoints);
          break;
        case 'points_desc':
          sorted.sort((a, b) => b.loyaltyPoints - a.loyaltyPoints);
          break;
        case 'tags_count':
          sorted.sort((a, b) => b.tags.length - a.tags.length);
          break;
      }
      return sorted;
    };

    let filteredUsersData = applyUsersFilters(users);

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
      filteredUsersData = filteredUsersData.filter((user) => !user.isAccountBlocked && !user.isCardBlocked);
    }

    filteredUsersData = applySorting(filteredUsersData);
    let filteredLegacyData = applyLegacyFilters(legacyMembers);
    filteredLegacyData = applySorting(filteredLegacyData);

    setFilteredLegacyMembers(filteredLegacyData);
    setFilteredUsers(filteredUsersData);
    setLegacyPage(1);
    setUsersPage(1);
  }, [search, membershipType, membershipStatus, selectedTags, blockedFilter, sortBy, legacyMembers, users, dateRangeStart, dateRangeEnd, legacyDateRangeStart, legacyDateRangeEnd]);

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

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleViewUser = (uid: string) => navigate(`/admin/users/${uid}`);
  const handleEditUser = (uid: string) => navigate(`/admin/users/${uid}/edit`);
  const handleNewUser = () => navigate('/admin/users/new');

  const handleDeleteUser = (uid: string, userName: string) => {
    modals.openConfirmModal({
      title: "Supprimer definitivement l'utilisateur",
      centered: true,
      children: (
        <Text size="sm">
          Etes-vous sur de vouloir supprimer <strong>{userName}</strong> ?<br />
          <br />
          ⚠️ <strong>Cette action est irreversible.</strong>
        </Text>
      ),
      labels: { confirm: 'Supprimer definitivement', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteUser(uid, adminUserId);
          notifications.show({ title: 'Succes', message: 'Utilisateur supprime', color: 'green' });
          loadUsers();
        } catch (error) {
          notifications.show({ title: 'Erreur', message: "Impossible de supprimer l'utilisateur", color: 'red' });
        }
      },
    });
  };

  const handleSendEmail = (_email: string) => {
    notifications.show({
      title: 'Fonction a venir',
      message: "L'envoi d'email sera disponible prochainement",
      color: 'blue',
    });
  };

  const handleToggleAccountBlock = async (userId: string, currentState: boolean) => {
    try {
      await toggleAccountBlocked(userId, !currentState, currentState ? '' : 'Bloque via interface admin', adminUserId);
      notifications.show({ title: 'Succes', message: `Compte ${!currentState ? 'bloque' : 'debloque'}`, color: 'green' });
      loadUsers();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de modifier le statut du compte', color: 'red' });
    }
  };

  const handleToggleCardBlock = async (userId: string, currentState: boolean) => {
    try {
      await toggleCardBlocked(userId, !currentState, currentState ? '' : 'Carte bloquee via interface admin', adminUserId);
      notifications.show({ title: 'Succes', message: `Carte ${!currentState ? 'bloquee' : 'debloquee'}`, color: 'green' });
      loadUsers();
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de modifier le statut de la carte', color: 'red' });
    }
  };

  const handleSendMembershipCard = (uid: string, userName: string, isResend: boolean) => {
    modals.open({
      title: 'Choisissez le type d\'email',
      centered: true,
      children: (
        <Stack gap="md">
          <Text size="sm">
            Selectionnez le type de carte d'adherent a envoyer a <strong>{userName}</strong> :
          </Text>
          <Group grow>
            <Button variant="light" color="blue" onClick={() => { modals.closeAll(); confirmAndSendCard(uid, userName, isResend, false); }}>
              Carte classique
            </Button>
            <Button variant="light" color="grape" onClick={() => { modals.closeAll(); confirmAndSendCard(uid, userName, isResend, true); }}>
              Carte avec entete EXORDE
            </Button>
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            L'entete EXORDE mentionne la soiree du 31 decembre 2024
          </Text>
        </Stack>
      ),
    });
  };

  const confirmAndSendCard = (uid: string, userName: string, isResend: boolean, includeExordeHeader: boolean) => {
    modals.openConfirmModal({
      title: isResend ? 'Renvoyer la carte d\'adherent' : 'Envoyer la carte d\'adherent',
      centered: true,
      children: (
        <Stack gap="xs">
          {isResend ? (
            <>
              <Text size="sm">Etes-vous sur de vouloir <strong>renvoyer</strong> la carte d'adherent a <strong>{userName}</strong> ?</Text>
              <Text size="sm">L'email a deja ete envoye precedemment.</Text>
            </>
          ) : (
            <>
              <Text size="sm">Etes-vous sur de vouloir envoyer la carte d'adherent a <strong>{userName}</strong> ?</Text>
              <div style={{ paddingLeft: '20px' }}>
                <Text size="sm">• Sa carte d'adherent personnalisee</Text>
                <Text size="sm">• Son QR code unique</Text>
                <Text size="sm">• Les informations sur son abonnement</Text>
                {includeExordeHeader && <Text size="sm" c="grape">• L'entete mentionnant la soiree EXORDE</Text>}
              </div>
            </>
          )}
        </Stack>
      ),
      labels: { confirm: isResend ? 'Renvoyer' : 'Envoyer', cancel: 'Annuler' },
      confirmProps: { color: isResend ? 'blue' : 'green' },
      onConfirm: async () => {
        try {
          const result = await sendMembershipCard(uid, isResend, includeExordeHeader);
          if (result.success) {
            notifications.show({ title: 'Succes', message: result.message || 'Carte d\'adherent envoyee', color: 'green' });
            loadUsers();
          } else {
            notifications.show({ title: 'Erreur', message: result.error || 'Impossible d\'envoyer', color: 'red' });
          }
        } catch (error: any) {
          notifications.show({ title: 'Erreur', message: error.message || 'Une erreur est survenue', color: 'red' });
        }
      },
    });
  };

  const handleMigrateLegacyMember = (uid: string, userName: string) => {
    let migrationTags: string[] = [];
    modals.open({
      title: 'Migrer vers le nouveau systeme',
      centered: true,
      children: (
        <Stack gap="md">
          <Text size="sm">
            Etes-vous sur de vouloir migrer <strong>{userName}</strong> vers le nouveau systeme ?
          </Text>
          <TagsInput
            label="Tags a ajouter (optionnel)"
            placeholder="Selectionnez ou creez des tags"
            data={allTags}
            defaultValue={[]}
            onChange={(value) => { migrationTags = value; }}
            clearable
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => modals.closeAll()}>Annuler</Button>
            <Button color="blue" onClick={async () => {
              modals.closeAll();
              try {
                await migrateLegacyMember(uid, adminUserId, undefined, migrationTags);
                notifications.show({ title: 'Succes', message: 'Membre migre avec succes', color: 'green' });
                loadUsers();
              } catch (error: any) {
                notifications.show({ title: 'Erreur', message: error.message || 'Impossible de migrer', color: 'red' });
              }
            }}>Migrer</Button>
          </Group>
        </Stack>
      ),
    });
  };

  // Duplicate detection handlers
  const handleStartDuplicateCheck = async () => {
    setLoadingDuplicates(true);
    try {
      const groups = await findDuplicateUsers();
      if (groups.length === 0) {
        notifications.show({ title: 'Aucun doublon', message: 'Aucun utilisateur en double n\'a ete detecte', color: 'green' });
        return;
      }
      setDuplicateGroups(groups);
      setCurrentDuplicateIndex(0);
      setDuplicateReviewOpened(true);
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de detecter les doublons', color: 'red' });
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleSelectDuplicateGroup = (groupIndex: number) => {
    setCurrentDuplicateIndex(groupIndex);
    setDuplicateReviewOpened(false);
    setDuplicateModalOpened(true);
  };

  const handleMergeDuplicate = async (keepUserId: string, deleteUserId: string, mergeData: UserMergeData) => {
    try {
      await mergeUsers(keepUserId, deleteUserId, mergeData, adminUserId);
      notifications.show({ title: 'Fusion reussie', message: 'Les comptes ont ete fusionnes', color: 'green' });
      setDuplicateModalOpened(false);
      await loadUsers();
      const groups = await findDuplicateUsers();
      setDuplicateGroups(groups);
      if (groups.length > 0) {
        setDuplicateReviewOpened(true);
      } else {
        notifications.show({ title: 'Termine', message: 'Tous les doublons ont ete traites', color: 'green' });
      }
    } catch (error) {
      notifications.show({ title: 'Erreur', message: 'Impossible de fusionner les comptes', color: 'red' });
    }
  };

  const handleSkipDuplicate = () => {
    setDuplicateModalOpened(false);
    setDuplicateReviewOpened(true);
  };

  const handleCloseDuplicateMode = () => {
    setDuplicateModalOpened(false);
    setDuplicateReviewOpened(false);
    setDuplicateGroups([]);
    setCurrentDuplicateIndex(0);
  };

  // Mass send handlers
  const handleOpenMassiveSendModal = (mode: 'all' | 'force' | 'unsent') => {
    setForceResend(mode === 'force');
    setOnlyUnsent(mode === 'unsent');
    setSendMassiveCardsModalOpened(true);
  };

  // Selection handlers
  const handleSelectLegacyUser = (uid: string, checked: boolean) => {
    setSelectedLegacyUsers((prev) => {
      const newSet = new Set(prev);
      checked ? newSet.add(uid) : newSet.delete(uid);
      return newSet;
    });
  };

  const handleSelectAllLegacyUsers = (checked: boolean) => {
    setSelectedLegacyUsers((prev) => {
      const newSet = new Set(prev);
      paginatedLegacyMembers.forEach((m) => checked ? newSet.add(m.uid) : newSet.delete(m.uid));
      return newSet;
    });
  };

  const handleSelectUser = (uid: string, checked: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      checked ? newSet.add(uid) : newSet.delete(uid);
      return newSet;
    });
  };

  const handleSelectAllUsers = (checked: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      paginatedUsers.forEach((u) => checked ? newSet.add(u.uid) : newSet.delete(u.uid));
      return newSet;
    });
  };

  // Bulk operations
  const handleBulkAddTags = () => {
    if (selectedUsers.size === 0) return;
    let tagsToAdd: string[] = [];
    modals.open({
      title: 'Ajouter des tags',
      centered: true,
      size: 'lg',
      children: (
        <Stack gap="md">
          <Text size="sm">Vous allez ajouter des tags a <strong>{selectedUsers.size} utilisateur{selectedUsers.size > 1 ? 's' : ''}</strong>.</Text>
          <TagsInput
            label="Tags a ajouter"
            placeholder="Selectionnez ou creez des tags"
            data={allTags}
            defaultValue={[]}
            onChange={(value) => { tagsToAdd = value; }}
            clearable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => modals.closeAll()}>Annuler</Button>
            <Button color="blue" leftSection={<IconTags size={16} />} onClick={() => {
              if (tagsToAdd.length === 0) {
                notifications.show({ title: 'Attention', message: 'Veuillez selectionner au moins un tag', color: 'orange' });
                return;
              }
              modals.closeAll();
              handleStartBulkAddTags(tagsToAdd);
            }}>Ajouter les tags</Button>
          </Group>
        </Stack>
      ),
    });
  };

  const handleStartBulkAddTags = async (tags: string[]) => {
    setBulkAddTagsModalOpened(true);
    setAddingTags(true);
    try {
      const userIds = Array.from(selectedUsers);
      const result = await bulkAddTagsToUsers(userIds, tags, adminUserId);
      setAddingTags(false);
      notifications.show({
        title: result.success === result.total ? 'Succes' : 'Termine avec erreurs',
        message: `${result.success} succes, ${result.errors} erreurs`,
        color: result.success === result.total ? 'green' : 'orange',
      });
      await loadUsers();
      setSelectedUsers(new Set());
      setTimeout(() => setBulkAddTagsModalOpened(false), 2000);
    } catch (error: any) {
      setAddingTags(false);
      notifications.show({ title: 'Erreur', message: error.message || 'Impossible d\'ajouter les tags', color: 'red' });
    }
  };

  const handleBulkMigration = () => {
    if (selectedLegacyUsers.size === 0) return;
    let tagsToAdd: string[] = [];
    modals.open({
      title: 'Migration groupee',
      centered: true,
      size: 'lg',
      children: (
        <Stack gap="md">
          <Text size="sm">Vous allez migrer <strong>{selectedLegacyUsers.size} utilisateur{selectedLegacyUsers.size > 1 ? 's' : ''}</strong>.</Text>
          <TagsInput
            label="Tags a ajouter a tous (optionnel)"
            placeholder="Selectionnez ou creez des tags"
            data={allTags}
            defaultValue={[]}
            onChange={(value) => { tagsToAdd = value; }}
            clearable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => modals.closeAll()}>Annuler</Button>
            <Button color="blue" leftSection={<IconArrowRight size={16} />} onClick={() => {
              modals.closeAll();
              handleStartBulkMigration(tagsToAdd);
            }}>Lancer la migration</Button>
          </Group>
        </Stack>
      ),
    });
  };

  const handleStartBulkMigration = async (tags: string[]) => {
    setBulkMigrationModalOpened(true);
    setMigrationInProgress(true);
    const usersToMigrate = legacyMembers.filter((u) => selectedLegacyUsers.has(u.uid));

    const progressArray: MigrationProgress[] = usersToMigrate.map((user) => ({
      uid: user.uid,
      name: `${user.firstName} ${user.lastName}`,
      status: 'pending' as const,
    }));
    setMigrationProgress(progressArray);

    for (let i = 0; i < usersToMigrate.length; i++) {
      const user = usersToMigrate[i];
      setMigrationProgress((prev) => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' as const } : item));
      try {
        await migrateLegacyMember(user.uid, adminUserId, undefined, tags);
        setMigrationProgress((prev) => prev.map((item, idx) => idx === i ? { ...item, status: 'success' as const } : item));
      } catch (error: any) {
        setMigrationProgress((prev) => prev.map((item, idx) => idx === i ? { ...item, status: 'error' as const, error: error.message || 'Erreur inconnue' } : item));
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setMigrationInProgress(false);
    await loadUsers();
    setSelectedLegacyUsers(new Set());
  };

  const handleResetFilters = () => {
    setSearch('');
    setMembershipType(null);
    setMembershipStatus(null);
    setSelectedTags([]);
    setBlockedFilter(null);
    setSortBy('date_desc');
    setDateRangeStart(null);
    setDateRangeEnd(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      {/* Header */}
      <UsersPageHeader
        duplicateGroupsCount={duplicateGroups.length}
        loadingDuplicates={loadingDuplicates}
        unsentUsersCount={unsentUsersCount}
        totalUsersCount={users.length}
        onTagsManager={() => setTagsManagerOpened(true)}
        onPurchaseMigration={() => setPurchaseMigrationOpened(true)}
        onPaymentFix={() => setPaymentFixOpened(true)}
        onItemNormalization={() => setItemNormalizationOpened(true)}
        onContributionFix={() => setContributionFixOpened(true)}
        onDuplicateCheck={handleStartDuplicateCheck}
        onExport={() => setExportModalOpened(true)}
        onCsvImport={() => setCsvImportModalOpened(true)}
        onExordeChecker={() => setExordeCheckerOpened(true)}
        onQuickAdd={() => setQuickAddModalOpened(true)}
        onMassiveSend={handleOpenMassiveSendModal}
        onNewUser={handleNewUser}
      />

      {/* Stats */}
      <UsersStatsCards
        totalUsers={legacyMembers.length + users.length}
        legacyMembersCount={legacyMembers.length}
        activeSubscriptionsCount={activeSubscriptionsCount}
        blockedAccountsCount={blockedAccountsCount}
        emailsSentCount={emailsSentCount}
        emailsNotSentCount={unsentUsersCount}
      />

      {/* Filters */}
      <UsersFiltersPanel
        search={search}
        membershipType={membershipType}
        membershipStatus={membershipStatus}
        selectedTags={selectedTags}
        blockedFilter={blockedFilter}
        sortBy={sortBy}
        dateRangeStart={dateRangeStart}
        dateRangeEnd={dateRangeEnd}
        allTags={allTags}
        filteredLegacyCount={filteredLegacyMembers.length}
        filteredUsersCount={filteredUsers.length}
        onSearchChange={setSearch}
        onMembershipTypeChange={setMembershipType}
        onMembershipStatusChange={setMembershipStatus}
        onSelectedTagsChange={setSelectedTags}
        onBlockedFilterChange={setBlockedFilter}
        onSortByChange={setSortBy}
        onDateRangeStartChange={setDateRangeStart}
        onDateRangeEndChange={setDateRangeEnd}
        onResetFilters={handleResetFilters}
      />

      {/* Users Table */}
      <UsersTableSection
        users={filteredUsers}
        paginatedUsers={paginatedUsers}
        tagsConfig={tagsConfig}
        selectedUsers={selectedUsers}
        currentPage={usersPage}
        totalPages={usersTotalPages}
        itemsPerPage={itemsPerPage}
        loading={loading}
        onSelectUser={handleSelectUser}
        onSelectAllUsers={handleSelectAllUsers}
        onPageChange={setUsersPage}
        onBulkAddTags={handleBulkAddTags}
        onViewUser={handleViewUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        onSendEmail={handleSendEmail}
        onToggleAccountBlock={handleToggleAccountBlock}
        onToggleCardBlock={handleToggleCardBlock}
        onSendMembershipCard={handleSendMembershipCard}
        UserRowComponent={UserTableRow}
      />

      {/* Legacy Members Section */}
      <LegacyMembersSection
        legacyMembers={filteredLegacyMembers}
        paginatedLegacyMembers={paginatedLegacyMembers}
        tagsConfig={tagsConfig}
        selectedLegacyUsers={selectedLegacyUsers}
        currentPage={legacyPage}
        totalPages={legacyTotalPages}
        itemsPerPage={itemsPerPage}
        legacyDateRangeStart={legacyDateRangeStart}
        legacyDateRangeEnd={legacyDateRangeEnd}
        onLegacyDateRangeStartChange={setLegacyDateRangeStart}
        onLegacyDateRangeEndChange={setLegacyDateRangeEnd}
        onSelectLegacyUser={handleSelectLegacyUser}
        onSelectAllLegacyUsers={handleSelectAllLegacyUsers}
        onPageChange={setLegacyPage}
        onBulkMigration={handleBulkMigration}
        onSendEmail={handleSendEmail}
        onMigrateLegacyMember={handleMigrateLegacyMember}
        UserRowComponent={UserTableRow}
      />

      {/* ================================================================== */}
      {/* Modals */}
      {/* ================================================================== */}

      <CsvImportModal
        opened={csvImportModalOpened}
        onClose={() => setCsvImportModalOpened(false)}
        adminUserId={adminUserId}
        onImportComplete={loadUsers}
      />

      <QuickAddUserModal
        opened={quickAddModalOpened}
        onClose={() => setQuickAddModalOpened(false)}
        adminUserId={adminUserId}
        onAddComplete={loadUsers}
      />

      <SendMassiveCardsModal
        opened={sendMassiveCardsModalOpened}
        onClose={() => setSendMassiveCardsModalOpened(false)}
        onComplete={loadUsers}
        totalUsers={onlyUnsent ? unsentUsersCount : users.length}
        forceResend={forceResend}
        onlyUnsent={onlyUnsent}
      />

      <TagsManagerModal
        opened={tagsManagerOpened}
        onClose={() => setTagsManagerOpened(false)}
        onTagsUpdated={handleTagsUpdated}
        adminUserId={adminUserId}
      />

      <ExordeTagCheckerModal
        opened={exordeCheckerOpened}
        onClose={() => setExordeCheckerOpened(false)}
        adminUserId={adminUserId}
        onComplete={loadUsers}
      />

      <Modal
        opened={bulkAddTagsModalOpened}
        onClose={() => { if (!addingTags) setBulkAddTagsModalOpened(false); }}
        title={addingTags ? 'Ajout de tags en cours...' : 'Tags ajoutes avec succes'}
        centered
        size="md"
        closeOnClickOutside={!addingTags}
        closeOnEscape={!addingTags}
        withCloseButton={!addingTags}
      >
        <Stack gap="md">
          {addingTags ? (
            <>
              <Progress value={100} size="lg" animated />
              <Text size="sm" ta="center">Ajout des tags en cours...</Text>
            </>
          ) : (
            <>
              <Alert color="green" title="Succes">Les tags ont ete ajoutes avec succes.</Alert>
              <Button fullWidth onClick={() => setBulkAddTagsModalOpened(false)}>Fermer</Button>
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={bulkMigrationModalOpened}
        onClose={() => { if (!migrationInProgress) { setBulkMigrationModalOpened(false); setMigrationProgress([]); } }}
        title={migrationInProgress ? 'Migration en cours...' : 'Migration terminee'}
        centered
        size="lg"
        closeOnClickOutside={!migrationInProgress}
        closeOnEscape={!migrationInProgress}
        withCloseButton={!migrationInProgress}
      >
        <Stack gap="md">
          <div>
            <Group justify="space-between" mb={8}>
              <Text size="sm" fw={500}>Progression globale</Text>
              <Text size="sm" c="dimmed">{migrationProgress.filter((p) => p.status === 'success' || p.status === 'error').length} / {migrationProgress.length}</Text>
            </Group>
            <Progress
              value={migrationProgress.length > 0 ? (migrationProgress.filter((p) => p.status === 'success' || p.status === 'error').length / migrationProgress.length) * 100 : 0}
              size="lg"
              animated={migrationInProgress}
            />
          </div>

          <Stack gap="xs" mah={400} style={{ overflowY: 'auto' }}>
            {migrationProgress.map((progress, index) => (
              <Paper
                key={progress.uid}
                withBorder
                p="sm"
                radius="md"
                bg={progress.status === 'success' ? 'green.0' : progress.status === 'error' ? 'red.0' : progress.status === 'processing' ? 'blue.0' : undefined}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <Text size="sm" fw={500}>{index + 1}. {progress.name}</Text>
                  </Group>
                  {progress.status === 'pending' && <Badge variant="light" color="gray">En attente</Badge>}
                  {progress.status === 'processing' && <Badge variant="light" color="blue">En cours...</Badge>}
                  {progress.status === 'success' && <Badge variant="light" color="green" leftSection={<IconCheck size={12} />}>Migre</Badge>}
                  {progress.status === 'error' && <Badge variant="light" color="red" leftSection={<IconX size={12} />}>Erreur</Badge>}
                </Group>
                {progress.status === 'error' && progress.error && (
                  <Alert color="red" mt="xs" p="xs"><Text size="xs">{progress.error}</Text></Alert>
                )}
              </Paper>
            ))}
          </Stack>

          {!migrationInProgress && (
            <Paper withBorder p="md" radius="md" bg="blue.0" mt="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={500}>Migration terminee</Text>
                  <Text size="xs" c="dimmed">{migrationProgress.filter((p) => p.status === 'success').length} reussies, {migrationProgress.filter((p) => p.status === 'error').length} erreurs</Text>
                </div>
                <Button onClick={() => { setBulkMigrationModalOpened(false); setMigrationProgress([]); }}>Fermer</Button>
              </Group>
            </Paper>
          )}
        </Stack>
      </Modal>

      <UserExportModal opened={exportModalOpened} onClose={() => setExportModalOpened(false)} users={users} />
      <PurchaseMigrationModal opened={purchaseMigrationOpened} onClose={() => setPurchaseMigrationOpened(false)} />
      <PaymentFixModal opened={paymentFixOpened} onClose={() => setPaymentFixOpened(false)} />
      <ContributionFixModal opened={contributionFixOpened} onClose={() => setContributionFixOpened(false)} onComplete={loadUsers} />
      <ItemNormalizationModal opened={itemNormalizationOpened} onClose={() => setItemNormalizationOpened(false)} onComplete={loadUsers} />
      <DuplicateReviewModal opened={duplicateReviewOpened} onClose={handleCloseDuplicateMode} duplicateGroups={duplicateGroups} onSelectGroup={handleSelectDuplicateGroup} />

      {duplicateGroups.length > 0 && duplicateGroups[currentDuplicateIndex] && (
        <DuplicateUserModal
          opened={duplicateModalOpened}
          onClose={handleCloseDuplicateMode}
          userAId={duplicateGroups[currentDuplicateIndex].users[0]?.uid || ''}
          userBId={duplicateGroups[currentDuplicateIndex].users[1]?.uid || ''}
          email={duplicateGroups[currentDuplicateIndex].email}
          onMerge={handleMergeDuplicate}
          onSkip={handleSkipDuplicate}
          currentIndex={currentDuplicateIndex}
          totalCount={duplicateGroups.length}
        />
      )}
    </Container>
  );
}
