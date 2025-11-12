import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box

  Paper,
  Stack,
  Group,
  Button,
  Select,
  Badge,
  Text,
  Card,

  LoadingOverlay,
  Modal,
  Alert,
  ActionIcon,
} from '@mantine/core';
import {
  IconQrcode,
  IconCheck,
  IconX,
  IconAlertCircle,
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
import type { EventListItem } from '../../../shared/types/event';


export function EventScannerPage() {
  const { adminProfile } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventListItem[]>([]);
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
      console.log('Événements chargés:', eventsData);
      // Ne pas filtrer trop strictement - montrer tous les événements
      setEvents(eventsData);

      if (eventsData.length === 0) {
        notifications.show({
          title: 'Aucun événement',
          message: 'Aucun événement trouvé dans la base de données',
          color: 'orange',
        });
      }
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
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const audioContext = new AudioContext();

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

  const handleScan = async (uid: string) => {
    if (!adminProfile) return;

    try {
      setLoading(true);

      const result = await performScan(
        `FORNAP-MEMBER:${uid}`,
        config,
        adminProfile.uid
      );

      // Feedback audio
      if (config.enableSound) {
        if (result.status === ScanResultStatus.SUCCESS) {
          successSoundRef.current?.play();
        } else {
          errorSoundRef.current?.play();
        }
      }

      // Feedback vibration
      if (config.enableVibration && navigator.vibrate) {
        if (result.status === ScanResultStatus.SUCCESS) {
          navigator.vibrate(200);
        } else {
          navigator.vibrate([100, 50, 100]);
        }
      }

      // Ajouter aux scans récents
      setRecentScans((prev) => [result, ...prev].slice(0, 10));

      // Notification
      notifications.show({
        title: result.status === ScanResultStatus.SUCCESS ? 'Succès' : 'Erreur',
        message: result.message,
        color: result.status === ScanResultStatus.SUCCESS ? 'green' : 'red',
      });
    } catch (error: any) {
      console.error('Erreur scan:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du scan',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadStatistics = async () => {
    if (!config.eventId && config.mode !== ScanMode.SUBSCRIPTION_ONLY) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner un événement',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const stats = await calculateEventScanStatistics(config.eventId || 'global');
      setCurrentStats(stats);
      setStatsModalOpen(true);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
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

  return (
    <Box style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Container size="sm" p="xs">
        <LoadingOverlay visible={loading} />

        <Stack gap="xs">
          {/* Header compact */}
          <Paper p="sm" radius="md" withBorder>
            <Group justify="space-between">
              <Group gap="xs">
                <IconQrcode size={24} />
                <div>
                  <Text size="lg" fw={700}>Scanner QR</Text>
                  <Text size="xs" c="dimmed">Mode: {getModeLabel(config.mode)}</Text>
                </div>
              </Group>
              <Group gap="xs">
                <ActionIcon
                  variant="light"
                  color={config.enableSound ? 'blue' : 'gray'}
                  size="md"
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, enableSound: !prev.enableSound }))
                  }
                >
                  {config.enableSound ? <IconVolume size={16} /> : <IconVolumeOff size={16} />}
                </ActionIcon>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconShield size={14} />}
                  onClick={() => navigate('/admin/dashboard')}
                >
                  Admin
                </Button>
              </Group>
            </Group>
          </Paper>

          {/* Scanner en priorité - toujours visible */}
          <Paper p="md" radius="md" withBorder>
            <QRCodeScanner
              onScan={handleScan}
              onError={(error) => {
                console.error('Erreur scanner:', error);
                notifications.show({
                  title: 'Erreur',
                  message: error,
                  color: 'red',
                });
              }}
            />
          </Paper>

          {/* Configuration compacte */}
          <Paper p="sm" radius="md" withBorder>
            <Stack gap="xs">
              <Select
                label="Mode"
                size="sm"
                value={config.mode}
                onChange={(value) =>
                  setConfig((prev) => ({ ...prev, mode: value as ScanMode, eventId: undefined }))
                }
                data={[
                  { value: ScanMode.SUBSCRIPTION_ONLY, label: 'Abonnement seul' },
                  { value: ScanMode.EVENT_ATTENDANCE, label: 'Événement (sans billet)' },
                  { value: ScanMode.EVENT_WITH_TICKET, label: 'Événement + Billet' },
                ]}
              />

              {modeNeedsEvent && (
                <Select
                  label="Événement"
                  size="sm"
                  placeholder="Choisir un événement"
                  value={config.eventId}
                  onChange={(value) =>
                    setConfig((prev) => ({ ...prev, eventId: value || undefined }))
                  }
                  data={events.length > 0 ? events.map((e) => ({
                    value: e.id,
                    label: `${e.title} - ${new Date(e.startDate.toMillis()).toLocaleDateString()}`,
                  })) : []}
                  searchable
                  required
                  error={events.length === 0 ? "Aucun événement disponible" : undefined}
                />
              )}

              {modeNeedsEvent && !config.eventId && (
                <Alert icon={<IconAlertCircle size={16} />} color="orange" p="xs">
                  <Text size="xs">Sélectionnez un événement pour scanner</Text>
                </Alert>
              )}
            </Stack>
          </Paper>

          {/* Actions */}
          <Group grow>
            <Button
              leftSection={<IconRefresh size={16} />}
              onClick={loadEvents}
              variant="light"
              size="sm"
            >
              Actualiser
            </Button>
            <Button
              leftSection={<IconChartBar size={16} />}
              onClick={handleLoadStatistics}
              variant="light"
              size="sm"
              disabled={modeNeedsEvent && !config.eventId}
            >
              Statistiques
            </Button>
          </Group>

          {/* Scans récents - compact */}
          {recentScans.length > 0 && (
            <Paper p="sm" radius="md" withBorder>
              <Text size="sm" fw={600} mb="xs">Derniers scans</Text>
              <Stack gap={4}>
                {recentScans.slice(0, 5).map((scan, index) => (
                  <Card key={index} p="xs" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        {getStatusIcon(scan.status)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" fw={500} truncate>
                            {scan.user ? `${scan.user.firstName} ${scan.user.lastName}` : 'Inconnu'}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>{scan.message}</Text>
                        </div>
                      </Group>
                      <Badge size="xs" color={getStatusColor(scan.status)}>
                        {scan.status === ScanResultStatus.SUCCESS ? 'OK' : 'KO'}
                      </Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>

      {/* Modal Statistiques */}
      <Modal
        opened={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        title="Statistiques"
        size="lg"
      >
        {currentStats && (
          <Stack gap="md">
            <Group grow>
              <Card withBorder p="md">
                <Text size="xs" c="dimmed">Total scans</Text>
                <Text size="xl" fw={700}>{currentStats.totalScans}</Text>
              </Card>
              <Card withBorder p="md">
                <Text size="xs" c="dimmed">Succès</Text>
                <Text size="xl" fw={700} c="green">{currentStats.successfulScans}</Text>
              </Card>
              <Card withBorder p="md">
                <Text size="xs" c="dimmed">Taux</Text>
                <Text size="xl" fw={700}>{((currentStats.successfulScans / currentStats.totalScans) * 100).toFixed(1)}%</Text>
              </Card>
            </Group>

            {currentStats.legacyAccountScans > 0 && (
              <Alert icon={<IconClock size={18} />} color="orange">
                {currentStats.legacyAccountScans} scans avec ancien compte détectés
              </Alert>
            )}
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
