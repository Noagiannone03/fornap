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
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconQrcode,
  IconLock,
  IconLockOpen,
  IconCreditCard,
  IconCreditCardOff,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  getUserById,
  getUserStats,
  getUserActionHistory,
  getUserMembershipHistory,
  toggleAccountBlocked,
  toggleCardBlocked,
  regenerateQRCode,
} from '../../../shared/services/userService';
import type {
  User,
  UserStats,
  ActionHistory,
  MembershipHistory,
} from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
} from '../../../shared/types/user';

// Fonction utilitaire pour convertir les timestamps de manière sécurisée
function toDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
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
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }

  // Si c'est un nombre (timestamp en millisecondes)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  // Si c'est une string ISO
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  // Fallback
  return new Date();
}

export function UserDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistory[]>([]);
  const [, setMembershipHistory] = useState<MembershipHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uid) {
      loadUserData();
    }
  }, [uid]);

  const loadUserData = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const [userData, statsData, actionsData, membershipData] = await Promise.all([
        getUserById(uid),
        getUserStats(uid).catch(() => null),
        getUserActionHistory(uid, 20).catch(() => []),
        getUserMembershipHistory(uid).catch(() => []),
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

  const handleRegenerateQR = async () => {
    if (!uid) return;

    try {
      await regenerateQRCode(uid, 'current-admin-id');
      notifications.show({
        title: 'Succès',
        message: 'QR code régénéré avec succès',
        color: 'green',
      });
      loadUserData();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de régénérer le QR code',
        color: 'red',
      });
    }
  };

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
            variant="light"
            leftSection={<IconQrcode size={16} />}
            onClick={handleRegenerateQR}
          >
            Régénérer QR
          </Button>
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
                  <Text size="sm" c="dimmed">Date de naissance</Text>
                  <Text size="sm" fw={500}>
                    {user.birthDate
                      ? toDate(user.birthDate).toLocaleDateString('fr-FR')
                      : 'N/A'}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Membre depuis</Text>
                  <Text size="sm" fw={500}>
                    {toDate(user.createdAt).toLocaleDateString('fr-FR')}
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
                      {toDate(user.currentMembership.startDate).toLocaleDateString('fr-FR')}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Date de fin</Text>
                    <Text size="sm">
                      {user.currentMembership.expiryDate
                        ? toDate(user.currentMembership.expiryDate).toLocaleDateString('fr-FR')
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
              <Title order={3} mb="md">QR Code</Title>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Code</Text>
                  <Text size="lg" fw={500} ff="monospace">{user.qrCode?.code || 'N/A'}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Nombre de scans</Text>
                  <Text size="lg" fw={500}>{user.qrCode?.scanCount || 0}</Text>
                </div>
              </Group>
            </Paper>

            {/* Statistiques */}
            {stats && (
              <Paper withBorder p="md" radius="md">
                <Title order={3} mb="md">Statistiques</Title>
                <Grid>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Total scans</Text>
                    <Text size="lg" fw={500}>{stats.totalScans}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Événements</Text>
                    <Text size="lg" fw={500}>{stats.eventsAttended}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Points gagnés</Text>
                    <Text size="lg" fw={500} c="green">{stats.loyaltyPointsEarned}</Text>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Text size="sm" c="dimmed">Points dépensés</Text>
                    <Text size="lg" fw={500} c="red">{stats.loyaltyPointsSpent}</Text>
                  </Grid.Col>
                </Grid>
              </Paper>
            )}

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

            {/* Historique d'actions récentes */}
            <Paper withBorder p="md" radius="md">
              <Title order={3} mb="md">Activité Récente</Title>
              {actionHistory.length > 0 ? (
                <Timeline>
                  {actionHistory.slice(0, 10).map((action) => (
                    <Timeline.Item key={action.id} title={action.actionType}>
                      <Text size="sm" c="dimmed">
                        {action.details?.description || 'Aucune description'}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {toDate(action.timestamp).toLocaleString('fr-FR')}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Text c="dimmed" size="sm">Aucune activité</Text>
              )}
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
