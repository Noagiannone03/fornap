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
  TagsInput,
  LoadingOverlay,
  Tooltip,
} from '@mantine/core';
import {
  IconSearch,
  IconDownload,
  IconUpload,
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
  IconMailCheck,
  IconMailX,
  IconSend,
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
import { TagsManagerModal, type TagConfig } from '../../components/TagsManagerModal';
import { BulkDeleteModal } from '../../components/users/BulkDeleteModal';
import {
  getTagsConfig,
  saveTagsConfig,
  getTagColor,
  mergeTagsWithConfig,
} from '../../../shared/utils/tagsConfig';

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

// Composant pour rendre une ligne de tableau
function UserTableRow({
  user,
  isLegacy,
  tagsConfig,
  onView,
  onEdit,
  onDelete,
  onSendEmail,
  onToggleAccountBlock,
  onToggleCardBlock,
  onMigrate,
  onSendMembershipCard,
}: {
  user: UserListItem;
  isLegacy: boolean;
  tagsConfig: TagConfig[];
  onView?: (uid: string) => void;
  onEdit?: (uid: string) => void;
  onDelete?: (uid: string, name: string) => void;
  onSendEmail?: (email: string) => void;
  onToggleAccountBlock?: (uid: string, current: boolean) => void;
  onToggleCardBlock?: (uid: string, current: boolean) => void;
  onMigrate?: (uid: string, name: string) => void;
  onSendMembershipCard?: (uid: string, userName: string, isResend: boolean) => void;
}) {
  const hasDataAnomaly = user.tags.includes('DATA_ANOMALY');
  const emailSent = user.emailStatus?.membershipCardSent || false;
  const emailSentCount = user.emailStatus?.membershipCardSentCount || 0;

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
            {!isLegacy && (
              <Group gap={4} mt={4}>
                {emailSent ? (
                  <Tooltip label={`Email envoyé ${emailSentCount} fois - Dernière fois: ${user.emailStatus?.membershipCardSentAt?.toDate().toLocaleDateString('fr-FR') || 'N/A'}`}>
                    <Badge size="xs" variant="light" color="green" leftSection={<IconMailCheck size={12} />}>
                      Email envoyé {emailSentCount > 1 ? `(x${emailSentCount})` : ''}
                    </Badge>
                  </Tooltip>
                ) : (
                  <Tooltip label="Email de carte d'adhérent non envoyé">
                    <Badge size="xs" variant="light" color="red" leftSection={<IconMailX size={12} />}>
                      Email non envoyé
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
                    leftSection={<IconSend size={14} />}
                    color={emailSent ? 'blue' : 'green'}
                    onClick={() => onSendMembershipCard?.(user.uid, `${user.firstName} ${user.lastName}`, emailSent)}
                  >
                    {emailSent ? 'Renvoyer' : 'Envoyer'} la carte d'adhérent
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
  const { currentUser } = useAdminAuth();
  const [legacyMembers, setLegacyMembers] = useState<UserListItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredLegacyMembers, setFilteredLegacyMembers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvImportModalOpened, setCsvImportModalOpened] = useState(false);
  const [sendMassiveCardsModalOpened, setSendMassiveCardsModalOpened] = useState(false);
  const [forceResend, setForceResend] = useState(false);
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [allTags, setAllTags] = useState<string[]>(AVAILABLE_TAGS);
  const [tagsConfig, setTagsConfig] = useState<TagConfig[]>([]);
  const [tagsManagerOpened, setTagsManagerOpened] = useState(false);
  const [bulkDeleteModalOpened, setBulkDeleteModalOpened] = useState(false);

  const adminUserId = currentUser?.uid || 'system';

  // Calculer le nombre d'utilisateurs qui n'ont pas reçu leur email
  const unsentUsersCount = users.filter(
    (u) => !u.emailStatus || !u.emailStatus.membershipCardSent
  ).length;

  // Filtres
  const [search, setSearch] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipType | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [blockedFilter, setBlockedFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Pagination
  const [legacyPage, setLegacyPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadUsers();
    loadAllTags();
    loadTagsConfig();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsersForListSeparated();

      // Logs pour debug - afficher les données brutes récupérées
      console.log('=== DONNÉES BRUTES RÉCUPÉRÉES ===');
      console.log('Nombre de legacy members:', data.legacyMembers.length);
      console.log('Nombre d\'utilisateurs:', data.users.length);

      // Afficher TOUS les utilisateurs créés AUJOURD'HUI (5 décembre 2025)
      const todayStart = new Date('2025-12-05T00:00:00').getTime();
      const todayEnd = new Date('2025-12-05T23:59:59').getTime();

      const todayUsers = data.users.filter(u => {
        const timestamp = u.createdAt?.seconds ? u.createdAt.seconds * 1000 : 0;
        return timestamp >= todayStart && timestamp <= todayEnd;
      });

      if (todayUsers.length > 0) {
        console.log(`\n=== ${todayUsers.length} UTILISATEURS CRÉÉS AUJOURD'HUI (05/12/2025) ===`);
        todayUsers.forEach((user, i) => {
          const date = user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000) : new Date(0);
          console.log(`${i + 1}. ${user.firstName} ${user.lastName} - Timestamp: ${user.createdAt?.seconds || 0} - Date: ${date.toLocaleString('fr-FR')} - Source: ${user.registrationSource}`);
        });
      }

      // Afficher les 10 premiers utilisateurs (peu importe la date)
      const usersToLog = Math.min(10, data.users.length);
      if (usersToLog > 0) {
        console.log(`\n=== ${usersToLog} PREMIERS UTILISATEURS (ordre brut de Firestore) ===`);
        for (let i = 0; i < usersToLog; i++) {
          const user = data.users[i];
          const date = user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000) : new Date(0);
          console.log(`${i + 1}. ${user.firstName} ${user.lastName} - Timestamp: ${user.createdAt?.seconds || 0} - Date: ${date.toLocaleString('fr-FR')}`);
        }
      }

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

  const loadTagsConfig = () => {
    const config = getTagsConfig();
    setTagsConfig(config);
  };

  const loadAllTags = async () => {
    try {
      const uniqueTags = await getAllUniqueTags();
      // Fusionner les tags prédéfinis avec les tags existants, sans doublons
      const mergedTags = Array.from(new Set([...AVAILABLE_TAGS, ...uniqueTags]));
      setAllTags(mergedTags.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading tags:', error);
      // En cas d'erreur, garder les tags par défaut
      setAllTags(AVAILABLE_TAGS);
    }
  };

  const handleSaveTagsConfig = (tags: TagConfig[]) => {
    saveTagsConfig(tags);
    setTagsConfig(tags);
    // Fusionner avec les tags existants
    const mergedConfig = mergeTagsWithConfig(allTags, tags);
    saveTagsConfig(mergedConfig);
    setTagsConfig(mergedConfig);
    notifications.show({
      title: 'Succès',
      message: 'Configuration des tags enregistrée',
      color: 'green',
    });
  };

  // Appliquer les filtres et le tri
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
          sorted.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateA.getTime() - dateB.getTime();
          });
          break;
        case 'date_desc':
          console.log('\n=== TRI PAR DATE (PLUS RÉCENT EN HAUT) ===');
          sorted.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
          // Afficher les 10 premiers utilisateurs triés avec leurs dates
          console.log('10 premiers utilisateurs après tri par date (desc):');
          sorted.slice(0, 10).forEach((user, index) => {
            const date = user.createdAt?.toDate?.() || new Date(0);
            console.log(`${index + 1}. ${user.firstName} ${user.lastName} - Date: ${date.toLocaleString('fr-FR')} - Timestamp: ${date.getTime()}`);
            console.log(`   createdAt brut:`, user.createdAt);
          });
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
        default:
          break;
      }

      return sorted;
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

    // Appliquer le tri
    filteredUsersData = applySorting(filteredUsersData);
    const filteredLegacyData = applySorting(applyFilters(legacyMembers));

    setFilteredLegacyMembers(filteredLegacyData);
    setFilteredUsers(filteredUsersData);
    setLegacyPage(1);
    setUsersPage(1);
  }, [search, membershipType, membershipStatus, selectedTags, blockedFilter, sortBy, legacyMembers, users]);

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
          await deleteUser(uid, adminUserId);
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
        adminUserId
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
        adminUserId
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

  const handleSendMembershipCard = (uid: string, userName: string, isResend: boolean) => {
    modals.openConfirmModal({
      title: isResend ? 'Renvoyer la carte d\'adhérent' : 'Envoyer la carte d\'adhérent',
      centered: true,
      children: (
        <Stack gap="xs">
          {isResend ? (
            <>
              <Text size="sm">
                Êtes-vous sûr de vouloir <strong>renvoyer</strong> la carte d'adhérent à <strong>{userName}</strong> ?
              </Text>
              <Text size="sm">
                L'email a déjà été envoyé précédemment. Cette action enverra un nouvel email avec la carte.
              </Text>
            </>
          ) : (
            <>
              <Text size="sm">
                Êtes-vous sûr de vouloir envoyer la carte d'adhérent à <strong>{userName}</strong> ?
              </Text>
              <Text size="sm">
                L'utilisateur recevra un email avec :
              </Text>
              <div style={{ paddingLeft: '20px' }}>
                <Text size="sm">• Sa carte d'adhérent personnalisée</Text>
                <Text size="sm">• Son QR code unique</Text>
                <Text size="sm">• Les informations sur son abonnement</Text>
              </div>
            </>
          )}
        </Stack>
      ),
      labels: { confirm: isResend ? 'Renvoyer' : 'Envoyer', cancel: 'Annuler' },
      confirmProps: { color: isResend ? 'blue' : 'green', loading: false },
      onConfirm: async () => {
        try {
          const result = await sendMembershipCard(uid, isResend);
          
          if (result.success) {
            notifications.show({
              title: 'Succès',
              message: result.message || 'Carte d\'adhérent envoyée avec succès',
              color: 'green',
            });
            loadUsers(); // Recharger pour mettre à jour l'indicateur
          } else {
            notifications.show({
              title: 'Erreur',
              message: result.error || 'Impossible d\'envoyer la carte d\'adhérent',
              color: 'red',
            });
          }
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Une erreur est survenue lors de l\'envoi',
            color: 'red',
          });
        }
      },
    });
  };

  const handleMigrateLegacyMember = (uid: string, userName: string) => {
    let migrationTags: string[] = [];

    modals.open({
      title: 'Migrer vers le nouveau système',
      centered: true,
      children: (
        <Stack gap="md">
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
          <TagsInput
            label="Tags à ajouter (optionnel)"
            placeholder="Sélectionnez ou créez des tags"
            data={allTags}
            defaultValue={[]}
            onChange={(value) => { migrationTags = value; }}
            clearable
            description="Des tags automatiques seront ajoutés (MIGRATED_FROM_LEGACY, etc.)"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => modals.closeAll()}>
              Annuler
            </Button>
            <Button
              color="blue"
              onClick={async () => {
                modals.closeAll();
                try {
                  await migrateLegacyMember(uid, adminUserId, undefined, migrationTags);
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
              }}
            >
              Migrer
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  const handleExport = () => {
    notifications.show({
      title: 'Fonction à venir',
      message: "L'export sera disponible prochainement",
      color: 'blue',
    });
  };

  const handleOpenMassiveSendModal = (mode: 'all' | 'force' | 'unsent') => {
    setForceResend(mode === 'force');
    setOnlyUnsent(mode === 'unsent');
    setSendMassiveCardsModalOpened(true);
  };

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Utilisateurs</Title>
        <Group>
          <Button
            leftSection={<IconTags size={16} />}
            variant="light"
            color="grape"
            onClick={() => setTagsManagerOpened(true)}
          >
            Gérer les tags
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="red"
            onClick={() => setBulkDeleteModalOpened(true)}
          >
            Suppression en masse
          </Button>
          <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleExport}>
            Exporter
          </Button>
          <Button
            leftSection={<IconUpload size={16} />}
            variant="light"
            color="blue"
            onClick={() => setCsvImportModalOpened(true)}
          >
            Importer CSV
          </Button>
          <Menu shadow="md" width={300}>
            <Menu.Target>
              <Button
                leftSection={<IconSend size={16} />}
                variant="light"
                color="green"
              >
                Envoyer cartes
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Envoi massif de cartes d'adhérent</Menu.Label>
              <Menu.Item
                leftSection={<IconSend size={14} />}
                color="orange"
                onClick={() => handleOpenMassiveSendModal('unsent')}
              >
                Envoyer aux non-destinataires ({unsentUsersCount})
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconSend size={14} />}
                color="green"
                onClick={() => handleOpenMassiveSendModal('all')}
              >
                Envoyer à tous ({users.length})
              </Menu.Item>
              <Menu.Item
                leftSection={<IconSend size={14} />}
                color="blue"
                onClick={() => handleOpenMassiveSendModal('force')}
              >
                Renvoyer à tous (force) ({users.length})
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
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

            <TagsInput
              placeholder="Filtrer par tags"
              data={allTags}
              value={selectedTags}
              onChange={setSelectedTags}
              clearable
              style={{ flex: 1 }}
              description={`${allTags.length} tags disponibles`}
            />
          </Group>

          <Group>
            <Select
              label="Trier par"
              data={[
                { value: 'date_desc', label: 'Date d\'inscription (plus récent)' },
                { value: 'date_asc', label: 'Date d\'inscription (plus ancien)' },
                { value: 'name_asc', label: 'Nom (A-Z)' },
                { value: 'name_desc', label: 'Nom (Z-A)' },
                { value: 'points_desc', label: 'Points de fidélité (plus élevé)' },
                { value: 'points_asc', label: 'Points de fidélité (plus bas)' },
                { value: 'tags_count', label: 'Nombre de tags' },
              ]}
              value={sortBy}
              onChange={(value) => setSortBy(value || 'date_desc')}
              style={{ flex: 1 }}
            />
          </Group>

          {(search ||
            membershipType ||
            membershipStatus ||
            selectedTags.length > 0 ||
            blockedFilter) && (
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
                  setSortBy('date_desc');
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
                  <Table.Th>Tags</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Inscription</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedUsers.map((user) => (
                  <UserTableRow
                    key={user.uid}
                    user={user}
                    isLegacy={false}
                    tagsConfig={tagsConfig}
                    onView={handleViewUser}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                    onSendEmail={handleSendEmail}
                    onToggleAccountBlock={handleToggleAccountBlock}
                    onToggleCardBlock={handleToggleCardBlock}
                    onSendMembershipCard={handleSendMembershipCard}
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
                    <Table.Th>Tags</Table.Th>
                    <Table.Th>Source</Table.Th>
                    <Table.Th>Inscription</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedLegacyMembers.map((member) => (
                    <UserTableRow
                      key={member.uid}
                      user={member}
                      isLegacy={true}
                      tagsConfig={tagsConfig}
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

      {/* Modal d'import CSV */}
      <CsvImportModal
        opened={csvImportModalOpened}
        onClose={() => setCsvImportModalOpened(false)}
        adminUserId={adminUserId}
        onImportComplete={loadUsers}
      />

      {/* Modal d'envoi massif des cartes */}
      <SendMassiveCardsModal
        opened={sendMassiveCardsModalOpened}
        onClose={() => setSendMassiveCardsModalOpened(false)}
        onComplete={loadUsers}
        totalUsers={onlyUnsent ? unsentUsersCount : users.length}
        forceResend={forceResend}
        onlyUnsent={onlyUnsent}
      />

      {/* Modal de gestion des tags */}
      <TagsManagerModal
        opened={tagsManagerOpened}
        onClose={() => setTagsManagerOpened(false)}
        onSave={handleSaveTagsConfig}
        initialTags={tagsConfig}
      />

      {/* Modal de suppression en masse par emails */}
      <BulkDeleteModal
        opened={bulkDeleteModalOpened}
        onClose={() => setBulkDeleteModalOpened(false)}
        adminUserId={adminUserId}
        onDeleteComplete={loadUsers}
      />
    </Container>
  );
}
