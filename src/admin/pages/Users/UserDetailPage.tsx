import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Stack,
  Text,
  Badge,
  Grid,
  LoadingOverlay,
  Divider,
  Avatar,
  Timeline,
  Box,
  Center,
  Modal,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconCreditCard,
  IconCreditCardOff,
  IconQrcode,
  IconTicket,
  IconStar,
  IconGift,
  IconRefresh,
  IconX,
  IconSparkles,
  IconMapPin,
  IconUser,
  IconClock,
  IconShoppingCart,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { QRCodeDisplay } from '../../../app/components/common/QRCodeDisplay';
import {
  getUserById,
  getUserStats,
  getUserActionHistory,
  getUserMembershipHistory,
  getUserPurchases,
  toggleAccountBlocked,
  toggleCardBlocked,
} from '../../../shared/services/userService';
import type {
  User,
  UserStats,
  ActionHistory,
  MembershipHistory,
  Purchase,
} from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  REGISTRATION_SOURCE_LABELS,
} from '../../../shared/types/user';
import { cancelPurchase } from '../../../shared/services/purchaseCancellationService';

// Fonction utilitaire pour convertir les timestamps de manière sécurisée
// Retourne null si la conversion échoue (au lieu de la date du jour)
function toDate(timestamp: any): Date | null {
  if (!timestamp) {
    return null;
  }

  // Si c'est déjà une Date
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Si c'est un Timestamp Firestore avec la méthode toDate()
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Si c'est un objet avec seconds (format Firestore après sérialisation)
  // Utiliser 'in' pour gérer le cas où seconds === 0 (qui est falsy)
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    const seconds = timestamp.seconds ?? timestamp._seconds ?? 0;
    const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
    return new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
  }

  // Si c'est un nombre (timestamp en millisecondes ou secondes)
  if (typeof timestamp === 'number') {
    // Si le nombre est petit, c'est probablement en secondes
    if (timestamp < 10000000000) {
      return new Date(timestamp * 1000);
    }
    return new Date(timestamp);
  }

  // Si c'est une string ISO
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Fallback: retourner null au lieu de la date du jour
  return null;
}

export function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([]);
  const [, setMembershipHistory] = useState<MembershipHistory[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // State pour annulation d'achat
  const [cancelModalOpened, setCancelModalOpened] = useState(false);
  const [purchaseToCancel, setPurchaseToCancel] = useState<Purchase | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (uid) {
      loadUserData();
    }
  }, [uid]);

  const loadUserData = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const [userData, statsData, actionsData, membershipData, purchasesData] = await Promise.all([
        getUserById(uid),
        getUserStats(uid).catch(() => null),
        getUserActionHistory(uid, 20).catch(() => []),
        getUserMembershipHistory(uid).catch(() => []),
        getUserPurchases(uid, 50).catch(() => []),
      ]);

      if (!userData) {
        notifications.show({
          title: 'Erreur',
          message: 'Utilisateur introuvable',
          color: 'red',
        });
        navigate('/admin/users');
        return;
      }

      setUser(userData);
      setStats(statsData);
      setActionHistory(actionsData);
      setMembershipHistory(membershipData);
      setPurchases(purchasesData);
    } catch (error) {
      console.error('Error loading user data:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les données de l\'utilisateur',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccountBlock = async () => {
    if (!user || !uid) return;

    try {
      await toggleAccountBlocked(
        uid,
        !user.status.isAccountBlocked,
        user.status.isAccountBlocked ? '' : 'Bloqué via interface admin',
        'current-admin-id' // TODO: Utiliser l'ID de l'admin connecté
      );
      notifications.show({
        title: 'Succès',
        message: `Compte ${!user.status.isAccountBlocked ? 'bloqué' : 'débloqué'}`,
        color: 'green',
      });
      loadUserData();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de modifier le statut du compte',
        color: 'red',
      });
    }
  };

  const handleToggleCardBlock = async () => {
    if (!user || !uid) return;

    try {
      await toggleCardBlocked(
        uid,
        !user.status.isCardBlocked,
        user.status.isCardBlocked ? '' : 'Carte bloquée via interface admin',
        'current-admin-id' // TODO: Utiliser l'ID de l'admin connecté
      );
      notifications.show({
        title: 'Succès',
        message: `Carte ${!user.status.isCardBlocked ? 'bloquée' : 'débloquée'}`,
        color: 'green',
      });
      loadUserData();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de modifier le statut de la carte',
        color: 'red',
      });
    }
  };

  // Ouvre le modal de confirmation d'annulation
  const openCancelModal = (purchase: Purchase) => {
    setPurchaseToCancel(purchase);
    setCancelReason('');
    setCancelModalOpened(true);
  };

  // Annule un achat
  const handleCancelPurchase = async () => {
    if (!purchaseToCancel || !uid) return;

    setCancelling(true);
    try {
      const result = await cancelPurchase(
        uid,
        purchaseToCancel.id,
        'current-admin-id', // TODO: Utiliser l'ID de l'admin connecte
        cancelReason || 'Annule par admin'
      );

      if (result.success) {
        notifications.show({
          title: 'Achat annule',
          message: result.contributionDeleted
            ? 'Achat annule et stock libere'
            : 'Achat annule (pas de contribution liee)',
          color: 'green',
        });
        setCancelModalOpened(false);
        setPurchaseToCancel(null);
        loadUserData(); // Recharger les donnees
      } else {
        notifications.show({
          title: 'Erreur',
          message: result.error || 'Impossible d\'annuler l\'achat',
          color: 'red',
        });
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de l\'annulation',
        color: 'red',
      });
    } finally {
      setCancelling(false);
    }
  };

  // Note: La regeneration du QR code n'est plus necessaire car le QR code
  // est maintenant base directement sur l'UID de l'utilisateur, qui ne change jamais.

  if (loading || !user) {
    return (
      <Container size="xl" pos="relative">
        <LoadingOverlay visible={loading} />
      </Container>
    );
  }

  // Vérifier si l'utilisateur a des données manquantes
  const hasDataIssue = !user.currentMembership || !user.status;

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/admin/users')}
          >
            Retour
          </Button>
          <Title order={1}>Détail Utilisateur</Title>
        </Group>
        <Group>
          <Button
            leftSection={<IconEdit size={16} />}
            onClick={() => navigate(`/admin/users/${uid}/edit`)}
          >
            Modifier
          </Button>
        </Group>
      </Group>

      {hasDataIssue && (
        <Paper withBorder p="md" mb="md" bg="red.0">
          <Group>
            <Badge color="red" size="lg">⚠️ ANOMALIE DÉTECTÉE</Badge>
            <Text c="red" size="sm">
              Cet utilisateur a des données manquantes ou incomplètes. Veuillez vérifier et corriger.
            </Text>
          </Group>
        </Paper>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder p="md" radius="md">
            <Stack align="center" gap="md">
              <Avatar size={120} color="indigo" radius={120}>
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </Avatar>
              <div style={{ textAlign: 'center' }}>
                <Title order={2}>
                  {user.firstName} {user.lastName}
                </Title>
                <Text c="dimmed" size="sm">
                  {user.email}
                </Text>
              </div>

              <Divider style={{ width: '100%' }} />

              <Stack gap="xs" style={{ width: '100%' }}>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Téléphone</Text>
                  <Text size="sm" fw={500}>{user.phone || 'N/A'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Code Postal</Text>
                  <Text size="sm" fw={500}>{user.postalCode || 'N/A'}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Membre depuis</Text>
                  <Text size="sm" fw={500}>
                    {toDate(user.createdAt)?.toLocaleDateString('fr-FR') ?? 'N/A'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Points de fidélité</Text>
                  <Badge size="lg" color="indigo">{user.loyaltyPoints}</Badge>
                </Group>
              </Stack>

              <Divider style={{ width: '100%' }} />

              <Stack gap="xs" style={{ width: '100%' }}>
                <Button
                  fullWidth
                  variant="light"
                  color={user.status?.isAccountBlocked ? 'green' : 'red'}
                  leftSection={user.status?.isAccountBlocked ? <IconLockOpen size={16} /> : <IconLock size={16} />}
                  onClick={handleToggleAccountBlock}
                >
                  {user.status?.isAccountBlocked ? 'Débloquer' : 'Bloquer'} le compte
                </Button>
                <Button
                  fullWidth
                  variant="light"
                  color={user.status?.isCardBlocked ? 'green' : 'orange'}
                  leftSection={user.status?.isCardBlocked ? <IconCreditCard size={16} /> : <IconCreditCardOff size={16} />}
                  onClick={handleToggleCardBlock}
                >
                  {user.status?.isCardBlocked ? 'Débloquer' : 'Bloquer'} la carte
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            {/* Abonnement actuel */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Abonnement Actuel</Title>
              {user.currentMembership ? (
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Plan</Text>
                    <Text size="lg" fw={500}>{user.currentMembership.planName}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Type</Text>
                    <Badge color="blue">
                      {MEMBERSHIP_TYPE_LABELS[user.currentMembership.planType]}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Statut</Text>
                    <Badge color={user.currentMembership.status === 'active' ? 'green' : 'orange'}>
                      {MEMBERSHIP_STATUS_LABELS[user.currentMembership.status]}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Prix</Text>
                    <Text size="lg" fw={500}>{user.currentMembership.price}€</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Date de début</Text>
                    <Text size="sm">
                      {toDate(user.currentMembership.startDate)?.toLocaleDateString('fr-FR') ?? 'N/A'}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Date de fin</Text>
                    <Text size="sm">
                      {user.currentMembership.expiryDate
                        ? toDate(user.currentMembership.expiryDate)?.toLocaleDateString('fr-FR') ?? 'N/A'
                        : 'Illimité'}
                    </Text>
                  </Grid.Col>
                </Grid>
              ) : (
                <Text c="red">⚠️ Aucune donnée d'abonnement</Text>
              )}
            </Paper>

            {/* QR Code */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>QR Code Membre</Title>
              </Group>

              <Center mb="md">
                <QRCodeDisplay
                  uid={user.uid}
                  firstName={user.firstName || ''}
                  lastName={user.lastName || ''}
                  size={200}
                  showDownloadButton={true}
                  showUserInfo={false}
                />
              </Center>

              <Divider my="md" />

              <Grid gutter="xs">
                <Grid.Col span={12}>
                  <Text size="xs" c="dimmed">Code de l'utilisateur</Text>
                  <Text size="sm" fw={500} ff="monospace" style={{ wordBreak: 'break-all' }}>
                    {user.uid.substring(0, 7)}
                  </Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">Nombre de scans</Text>
                  <Text size="lg" fw={700} c="indigo">{user.scanCount || 0}</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed">Dernier scan</Text>
                  <Text size="sm" fw={500}>
                    {user.lastScannedAt && toDate(user.lastScannedAt)
                      ? toDate(user.lastScannedAt)!.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                      : 'Jamais'}
                  </Text>
                </Grid.Col>
              </Grid>
            </Paper>

            {/* Statistiques */}
            {stats && (
              <Paper withBorder p="md" radius="md">
                <Title order={3} mb="md">Statistiques</Title>
                <Stack gap="md">
                  {/* Stats de scan */}
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">Activité QR Code</Text>
                    <Grid>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Total scans</Text>
                        <Text size="xl" fw={700} c="indigo">{stats.totalScans || 0}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Événements assistés</Text>
                        <Text size="xl" fw={700} c="blue">{stats.eventsAttended || 0}</Text>
                      </Grid.Col>
                    </Grid>
                  </Box>

                  <Divider />

                  {/* Stats de fidélité */}
                  <Box>
                    <Text size="sm" fw={600} c="dimmed" mb="xs">Points de Fidélité</Text>
                    <Grid>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Points gagnés</Text>
                        <Text size="xl" fw={700} c="green">+{stats.loyaltyPointsEarned || 0}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="sm" c="dimmed">Points dépensés</Text>
                        <Text size="xl" fw={700} c="red">-{stats.loyaltyPointsSpent || 0}</Text>
                      </Grid.Col>
                    </Grid>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Source d'inscription */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Source d'inscription</Title>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Source</Text>
                  <Badge
                    color={
                      user.registration.source === 'platform'
                        ? 'blue'
                        : user.registration.source === 'admin'
                          ? 'violet'
                          : user.registration.source === 'crowdfunding'
                            ? 'pink'
                            : 'orange'
                    }
                    variant="light"
                  >
                    {REGISTRATION_SOURCE_LABELS[user.registration.source]}
                  </Badge>
                </Group>
                {user.registration.createdBy && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Créé par</Text>
                    <Text size="sm" fw={500}>{user.registration.createdBy}</Text>
                  </Group>
                )}
                {user.registration.transferredFrom && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Transféré depuis</Text>
                    <Text size="sm" fw={500}>{user.registration.transferredFrom}</Text>
                  </Group>
                )}
                {user.registration.legacyMemberType && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Type legacy</Text>
                    <Text size="sm" fw={500}>{user.registration.legacyMemberType}</Text>
                  </Group>
                )}
                {user.registration.legacyTicketType && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Type de ticket legacy</Text>
                    <Text size="sm" fw={500}>{user.registration.legacyTicketType}</Text>
                  </Group>
                )}
              </Stack>
            </Paper>

            {/* Tags */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Tags</Title>
              <Group gap="xs">
                {user.status?.tags && user.status.tags.length > 0 ? (
                  user.status.tags.map((tag) => (
                    <Badge
                      key={tag}
                      color={tag === 'DATA_ANOMALY' ? 'red' : 'blue'}
                      variant={tag === 'DATA_ANOMALY' ? 'filled' : 'light'}
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">Aucun tag</Text>
                )}
              </Group>
            </Paper>

            {/* Historique des Achats */}
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Title order={3}>Historique des Achats</Title>
                {purchases.length > 0 && (
                  <Badge color="green" size="lg">
                    {purchases.reduce((sum, p) => p.paymentStatus === 'completed' ? sum + p.amount : sum, 0)}€ total
                  </Badge>
                )}
              </Group>
              {purchases.length > 0 ? (
                <Stack gap="xs">
                  {purchases.map((purchase) => {
                    // Determine badge color and text based on status
                    const getStatusConfig = () => {
                      switch (purchase.paymentStatus) {
                        case 'completed':
                          return { color: 'green', text: 'Paye' };
                        case 'pending':
                          return { color: 'yellow', text: 'En attente' };
                        case 'cancelled':
                          return { color: 'red', text: 'Annule' };
                        case 'refunded':
                          return { color: 'orange', text: 'Rembourse' };
                        default:
                          return { color: 'gray', text: 'Echoue' };
                      }
                    };
                    const statusConfig = getStatusConfig();
                    const canCancel = purchase.paymentStatus !== 'cancelled' && purchase.paymentStatus !== 'refunded';

                    return (
                      <Paper key={purchase.id} withBorder p="sm" radius="sm" bg={purchase.paymentStatus === 'cancelled' ? 'red.0' : 'gray.0'}>
                        <Group justify="space-between">
                          <Group gap="sm">
                            <IconShoppingCart size={20} color={purchase.paymentStatus === 'cancelled' ? '#ef4444' : '#228be6'} />
                            <div>
                              <Text size="sm" fw={600} td={purchase.paymentStatus === 'cancelled' ? 'line-through' : undefined}>
                                {purchase.itemName}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {purchase.source} - {toDate(purchase.purchasedAt)?.toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) ?? 'Date inconnue'}
                              </Text>
                              {purchase.cancellationReason && (
                                <Text size="xs" c="red">Raison: {purchase.cancellationReason}</Text>
                              )}
                            </div>
                          </Group>
                          <Group gap="xs">
                            <Badge color={statusConfig.color} variant="light">
                              {statusConfig.text}
                            </Badge>
                            <Text fw={700} size="lg" td={purchase.paymentStatus === 'cancelled' ? 'line-through' : undefined}>
                              {purchase.amount}€
                            </Text>
                            {canCancel && (
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size="sm"
                                onClick={() => openCancelModal(purchase)}
                                title="Annuler cet achat"
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            )}
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              ) : (
                <Text c="dimmed" size="sm">Aucun achat enregistre</Text>
              )}
            </Paper>

            {/* Historique d'actions récentes */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Activité Récente</Title>
              {actionHistory.length > 0 ? (
                <Timeline>
                  {actionHistory.slice(0, 10).map((action) => {
                    // Définir la couleur selon le type d'action
                    const getActionColor = (type: string) => {
                      switch (type) {
                        case 'scan':
                        case 'event_checkin':
                          return 'indigo';
                        case 'transaction':
                          return 'green';
                        case 'loyalty_earned':
                          return 'teal';
                        case 'loyalty_spent':
                          return 'orange';
                        case 'card_blocked':
                          return 'red';
                        case 'card_unblocked':
                          return 'green';
                        default:
                          return 'gray';
                      }
                    };

                    // Définir l'icône et le label selon le type d'action
                    const getActionIcon = (type: string) => {
                      switch (type) {
                        case 'scan':
                          return <IconQrcode size={20} />;
                        case 'event_checkin':
                          return <IconTicket size={20} />;
                        case 'transaction':
                          return <IconCreditCard size={20} />;
                        case 'loyalty_earned':
                          return <IconStar size={20} />;
                        case 'loyalty_spent':
                          return <IconGift size={20} />;
                        case 'card_blocked':
                          return <IconLock size={20} />;
                        case 'card_unblocked':
                          return <IconLockOpen size={20} />;
                        case 'profile_update':
                          return <IconEdit size={20} />;
                        case 'membership_created':
                          return <IconSparkles size={20} />;
                        case 'membership_renewed':
                          return <IconRefresh size={20} />;
                        case 'membership_cancelled':
                          return <IconX size={20} />;
                        default:
                          return null;
                      }
                    };

                    const getActionLabel = (type: string) => {
                      switch (type) {
                        case 'scan':
                          return 'Scan QR';
                        case 'event_checkin':
                          return 'Check-in événement';
                        case 'transaction':
                          return 'Transaction';
                        case 'loyalty_earned':
                          return 'Points gagnés';
                        case 'loyalty_spent':
                          return 'Points dépensés';
                        case 'card_blocked':
                          return 'Carte bloquée';
                        case 'card_unblocked':
                          return 'Carte débloquée';
                        case 'profile_update':
                          return 'Profil mis à jour';
                        case 'membership_created':
                          return 'Abonnement créé';
                        case 'membership_renewed':
                          return 'Abonnement renouvelé';
                        case 'membership_cancelled':
                          return 'Abonnement annulé';
                        default:
                          return type;
                      }
                    };

                    return (
                      <Timeline.Item
                        key={action.id}
                        bullet={getActionIcon(action.actionType)}
                        title={
                          <Group gap="xs">
                            <Text size="sm" fw={600}>{getActionLabel(action.actionType)}</Text>
                          </Group>
                        }
                        color={getActionColor(action.actionType)}
                      >
                        <Text size="sm" c="dimmed">
                          {action.details?.description || 'Aucune description'}
                        </Text>
                        {action.details?.eventName && (
                          <Group gap={4} mt="xs">
                            <IconMapPin size={14} />
                            <Text size="xs" fw={500} c="blue">
                              {action.details.eventName}
                            </Text>
                          </Group>
                        )}
                        {action.details?.scannedBy && (
                          <Group gap={4} mt={4}>
                            <IconUser size={14} />
                            <Text size="xs" c="dimmed">
                              Scanné par: {action.details.scannedBy}
                            </Text>
                          </Group>
                        )}
                        <Group gap={4} mt="xs">
                          <IconClock size={14} />
                          <Text size="xs" c="dimmed">
                            {toDate(action.timestamp)?.toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) ?? 'Date inconnue'}
                          </Text>
                        </Group>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              ) : (
                <Text c="dimmed" size="sm">Aucune activité</Text>
              )}
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Modal de confirmation d'annulation */}
      <Modal
        opened={cancelModalOpened}
        onClose={() => setCancelModalOpened(false)}
        title="Annuler cet achat"
        centered
      >
        {purchaseToCancel && (
          <Stack gap="md">
            <Text size="sm">
              Vous allez annuler l'achat suivant:
            </Text>
            <Paper withBorder p="sm" bg="red.0">
              <Text fw={700}>{purchaseToCancel.itemName}</Text>
              <Text size="sm" c="dimmed">{purchaseToCancel.amount}€</Text>
            </Paper>
            <Text size="sm" c="red" fw={500}>
              ⚠️ Cette action va:
            </Text>
            <Text size="xs" c="dimmed">
              • Marquer l'achat comme annule{'\n'}
              • Supprimer la contribution correspondante{'\n'}
              • Liberer le stock si applicable
            </Text>
            <TextInput
              label="Raison de l'annulation (optionnel)"
              placeholder="Ex: Demande client, erreur..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => setCancelModalOpened(false)}
              >
                Annuler
              </Button>
              <Button
                color="red"
                onClick={handleCancelPurchase}
                loading={cancelling}
              >
                Confirmer l'annulation
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
