import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Button,
  Select,
  Badge,
  Text,
  Card,
  Avatar,
  Divider,
  Grid,
  LoadingOverlay,
  Switch,
  Modal,
  Table,
  ScrollArea,
  Alert,
  Box,
  Progress,
  ActionIcon,
} from '@mantine/core';
import {
  IconQrcode,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconUser,
  IconCalendar,
  IconTicket,
  IconChartBar,
  IconRefresh,
  IconVolume,
  IconVolumeOff,
  IconClock,
  IconShield,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { QRCodeScanner } from '../../../app/components/common/QRCodeScanner';
import {
  performScan,
  calculateEventScanStatistics,
} from '../../../shared/services/scanService';
import { getAllEventsForList } from '../../../shared/services/eventService';
import {
  ScanMode,
  ScanResultStatus,
} from '../../../shared/types/scan';
import type {
  ScanResult,
  ScannerConfig,
  EventScanStatistics,
} from '../../../shared/types/scan';
import type { Event } from '../../../shared/types/event';
import { Timestamp } from 'firebase/firestore';

export function EventScannerPage() {
  const { adminProfile } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [currentStats, setCurrentStats] = useState<EventScanStatistics | null>(null);

  // Configuration du scanner
  const [config, setConfig] = useState<ScannerConfig>({
    mode: ScanMode.SUBSCRIPTION_ONLY,
    enableSound: true,
    enableVibration: true,
    scanCooldown: 2000,
  });

  // Audio refs pour les sons
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadEvents();
    initializeSounds();
  }, []);

  const loadEvents = async () => {
    try {
      const eventsData = await getAllEventsForList();
      // Filtrer uniquement les événements publiés et actifs
      const activeEvents = eventsData.filter(
        (e) => e.status === 'published' && e.isActive
      );
      setEvents(activeEvents);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les événements',
        color: 'red',
      });
    }
  };

  const initializeSounds = () => {
    // Sons de feedback (peuvent être remplacés par de vrais fichiers audio)
    // Pour l'instant on utilisera l'API Web Audio pour générer des bips
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();

    // Son de succès (bip aigu)
    const createSuccessSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    };

    // Son d'erreur (bip grave)
    const createErrorSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    successSoundRef.current = { play: createSuccessSound } as any;
    errorSoundRef.current = { play: createErrorSound } as any;
  };

  const playFeedbackSound = (isSuccess: boolean) => {
    if (!config.enableSound) return;

    try {
      if (isSuccess) {
        successSoundRef.current?.play();
      } else {
        errorSoundRef.current?.play();
      }
    } catch (error) {
      console.error('Erreur lecture son:', error);
    }
  };

  const vibrateFeedback = (isSuccess: boolean) => {
    if (!config.enableVibration) return;
    if (!navigator.vibrate) return;

    if (isSuccess) {
      navigator.vibrate(200); // Vibration courte
    } else {
      navigator.vibrate([100, 50, 100]); // Deux vibrations
    }
  };

  const handleScan = async (qrCode: string) => {
    if (!adminProfile) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      // Effectuer le scan
      const result = await performScan(qrCode, config, adminProfile.uid);

      // Ajouter aux scans récents (max 10)
      setRecentScans((prev) => [result, ...prev].slice(0, 10));

      // Feedback sonore et visuel
      const isSuccess = result.status === ScanResultStatus.SUCCESS;
      playFeedbackSound(isSuccess);
      vibrateFeedback(isSuccess);

      // Notification
      if (isSuccess) {
        notifications.show({
          title: '✅ Scan réussi',
          message: result.message,
          color: 'green',
          autoClose: 3000,
        });
      } else {
        notifications.show({
          title: '❌ Scan refusé',
          message: result.message,
          color: 'red',
          autoClose: 5000,
        });
      }
    } catch (error) {
      console.error('Erreur scan:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors du scan',
        color: 'red',
      });
      playFeedbackSound(false);
      vibrateFeedback(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadStats = async () => {
    if (!config.eventId) {
      notifications.show({
        title: 'Erreur',
        message: 'Sélectionnez un événement',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const stats = await calculateEventScanStatistics(config.eventId);
      setCurrentStats(stats);
      setStatsModalOpen(true);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les statistiques',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: ScanResultStatus) => {
    switch (status) {
      case ScanResultStatus.SUCCESS:
        return <IconCheck size={20} color="green" />;
      case ScanResultStatus.SUBSCRIPTION_INACTIVE:
      case ScanResultStatus.NO_TICKET:
      case ScanResultStatus.BLOCKED:
        return <IconX size={20} color="red" />;
      case ScanResultStatus.ALREADY_SCANNED:
        return <IconAlertCircle size={20} color="orange" />;
      default:
        return <IconX size={20} color="gray" />;
    }
  };

  const getStatusColor = (status: ScanResultStatus): string => {
    switch (status) {
      case ScanResultStatus.SUCCESS:
        return 'green';
      case ScanResultStatus.SUBSCRIPTION_INACTIVE:
      case ScanResultStatus.NO_TICKET:
      case ScanResultStatus.BLOCKED:
        return 'red';
      case ScanResultStatus.ALREADY_SCANNED:
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getModeLabel = (mode: ScanMode): string => {
    switch (mode) {
      case ScanMode.SUBSCRIPTION_ONLY:
        return 'Abonnement uniquement';
      case ScanMode.EVENT_ATTENDANCE:
        return 'Présence événement';
      case ScanMode.EVENT_WITH_TICKET:
        return 'Événement + Billet';
      default:
        return mode;
    }
  };

  const modeNeedsEvent = config.mode !== ScanMode.SUBSCRIPTION_ONLY;
  const canScan = !loading && (!modeNeedsEvent || config.eventId);

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Paper p="xl" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <IconQrcode size={32} />
              <div>
                <Title order={2}>Scanner QR Code</Title>
                <Text size="sm" c="dimmed">
                  Vérification aux événements
                </Text>
              </div>
            </Group>
            <Group>
              <ActionIcon
                variant="light"
                color={config.enableSound ? 'blue' : 'gray'}
                size="lg"
                onClick={() =>
                  setConfig((prev) => ({ ...prev, enableSound: !prev.enableSound }))
                }
              >
                {config.enableSound ? <IconVolume size={20} /> : <IconVolumeOff size={20} />}
              </ActionIcon>
            </Group>
          </Group>

          <Divider mb="md" />

          {/* Configuration */}
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Select
                label="Mode de scan"
                placeholder="Sélectionnez un mode"
                value={config.mode}
                onChange={(value) =>
                  setConfig((prev) => ({ ...prev, mode: value as ScanMode }))
                }
                data={[
                  {
                    value: ScanMode.SUBSCRIPTION_ONLY,
                    label: 'Abonnement uniquement',
                  },
                  {
                    value: ScanMode.EVENT_ATTENDANCE,
                    label: 'Présence événement (sans billet)',
                  },
                  {
                    value: ScanMode.EVENT_WITH_TICKET,
                    label: 'Événement + Billet',
                  },
                ]}
                styles={{
                  input: {
                    borderRadius: '8px',
                    fontWeight: 600,
                  },
                }}
              />
            </Grid.Col>

            {modeNeedsEvent && (
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Select
                  label="Événement"
                  placeholder="Sélectionnez un événement"
                  value={config.eventId}
                  onChange={(value) =>
                    setConfig((prev) => ({ ...prev, eventId: value || undefined }))
                  }
                  data={events.map((e) => ({
                    value: e.id,
                    label: e.title,
                  }))}
                  searchable
                  required
                  styles={{
                    input: {
                      borderRadius: '8px',
                    },
                  }}
                />
              </Grid.Col>
            )}
          </Grid>

          {/* Info mode actuel */}
          <Alert
            icon={<IconShield size={18} />}
            title={`Mode: ${getModeLabel(config.mode)}`}
            color="blue"
            mt="md"
            styles={{
              root: {
                borderRadius: '8px',
              },
            }}
          >
            {config.mode === ScanMode.SUBSCRIPTION_ONLY &&
              'Vérifie uniquement si l\'abonnement est actif'}
            {config.mode === ScanMode.EVENT_ATTENDANCE &&
              'Comptabilise la présence sans vérifier le billet'}
            {config.mode === ScanMode.EVENT_WITH_TICKET &&
              'Vérifie l\'abonnement ET le billet'}
          </Alert>

          {/* Bouton stats */}
          {config.eventId && (
            <Button
              leftSection={<IconChartBar size={18} />}
              variant="light"
              fullWidth
              mt="md"
              onClick={handleLoadStats}
              styles={{
                root: {
                  borderRadius: '8px',
                },
              }}
            >
              Voir les statistiques
            </Button>
          )}
        </Paper>

        {/* Scanner */}
        <Paper p="xl" radius="md" withBorder>
          <LoadingOverlay visible={loading} />

          <Stack gap="lg">
            <Group justify="center">
              <Badge
                size="xl"
                color={canScan ? 'green' : 'red'}
                variant="filled"
                styles={{
                  root: {
                    borderRadius: '20px',
                    padding: '12px 20px',
                  },
                }}
              >
                {canScan ? '✓ Prêt à scanner' : '⚠ Configuration incomplète'}
              </Badge>
            </Group>

            {canScan ? (
              <QRCodeScanner
                onScan={(qrCode) => handleScan(qrCode)}
                onError={(error) => {
                  notifications.show({
                    title: 'Erreur',
                    message: error,
                    color: 'red',
                  });
                }}
              />
            ) : (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="Configuration incomplète"
                color="orange"
                styles={{
                  root: {
                    borderRadius: '8px',
                  },
                }}
              >
                Veuillez sélectionner un événement pour ce mode de scan
              </Alert>
            )}
          </Stack>
        </Paper>

        {/* Scans récents */}
        {recentScans.length > 0 && (
          <Paper p="xl" radius="md" withBorder>
            <Group justify="space-between" mb="lg">
              <Title order={3}>Scans récents</Title>
              <Badge size="lg" variant="light">
                {recentScans.length}
              </Badge>
            </Group>

            <Stack gap="md">
              {recentScans.map((scan, index) => (
                <Card
                  key={index}
                  padding="md"
                  radius="md"
                  withBorder
                  style={{
                    borderColor:
                      scan.status === ScanResultStatus.SUCCESS
                        ? 'var(--mantine-color-green-3)'
                        : 'var(--mantine-color-red-3)',
                    borderWidth: '2px',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group wrap="nowrap">
                      {getStatusIcon(scan.status)}
                      <div>
                        <Text fw={600}>
                          {scan.user
                            ? `${scan.user.firstName} ${scan.user.lastName}`
                            : 'Utilisateur inconnu'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {scan.message}
                        </Text>
                        {scan.user?.membershipType && (
                          <Badge
                            size="xs"
                            variant="light"
                            mt={4}
                            color={scan.user.isLegacyAccount ? 'orange' : 'blue'}
                          >
                            {scan.user.membershipType}
                            {scan.user.isLegacyAccount && ' (ancien)'}
                          </Badge>
                        )}
                      </div>
                    </Group>
                    <Badge color={getStatusColor(scan.status)} variant="light">
                      {scan.scannedAt.toDate().toLocaleTimeString('fr-FR')}
                    </Badge>
                  </Group>
                </Card>
              ))}
            </Stack>

            <Button
              variant="subtle"
              fullWidth
              mt="md"
              onClick={() => setRecentScans([])}
              leftSection={<IconRefresh size={16} />}
            >
              Effacer l'historique
            </Button>
          </Paper>
        )}
      </Stack>

      {/* Modal statistiques */}
      <Modal
        opened={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        title="Statistiques de scan"
        size="xl"
        styles={{
          title: {
            fontWeight: 700,
            fontSize: '1.5rem',
          },
        }}
      >
        {currentStats && (
          <Stack gap="lg">
            {/* KPIs */}
            <Grid>
              <Grid.Col span={6}>
                <Card padding="md" radius="md" withBorder>
                  <Stack gap="xs">
                    <Text size="xs" c="dimmed" tt="uppercase">
                      Total scans
                    </Text>
                    <Text size="xl" fw={700}>
                      {currentStats.totalScans}
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card padding="md" radius="md" withBorder>
                  <Stack gap="xs">
                    <Text size="xs" c="dimmed" tt="uppercase">
                      Taux succès
                    </Text>
                    <Text size="xl" fw={700} c="green">
                      {currentStats.totalScans > 0
                        ? Math.round(
                            (currentStats.successfulScans / currentStats.totalScans) * 100
                          )
                        : 0}
                      %
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>

            {/* Distribution par type */}
            <div>
              <Text fw={600} mb="xs">
                Par type d'abonnement
              </Text>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm">Mensuel</Text>
                  <Badge>{currentStats.byMembershipType.monthly}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Annuel</Text>
                  <Badge>{currentStats.byMembershipType.annual}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">À vie</Text>
                  <Badge>{currentStats.byMembershipType.lifetime}</Badge>
                </Group>
              </Stack>
            </div>

            {/* Heure de pointe */}
            {currentStats.peakHour && (
              <Alert
                icon={<IconClock size={18} />}
                title="Heure de pointe"
                color="blue"
                styles={{
                  root: {
                    borderRadius: '8px',
                  },
                }}
              >
                {currentStats.peakHour.hour}h - {currentStats.peakHour.count} scans
              </Alert>
            )}

            {/* Comptes anciens */}
            {currentStats.legacyAccountScans > 0 && (
              <Alert
                icon={<IconAlertCircle size={18} />}
                title="Anciens comptes"
                color="orange"
                styles={{
                  root: {
                    borderRadius: '8px',
                  },
                }}
              >
                {currentStats.legacyAccountScans} scans avec ancien compte détectés
              </Alert>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
