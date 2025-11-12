import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Stack,
  Group,
  Select,
  Badge,
  Text,
  Card,
  LoadingOverlay,
  Alert,
  ActionIcon,
  Center,
  UnstyledButton,
  SimpleGrid,
  Title,
  ScrollArea,
} from '@mantine/core';
import {
  IconQrcode,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconChartBar,
  IconVolume,
  IconVolumeOff,
  IconClock,
  IconArrowLeft,
  IconTicket,
  IconRefresh,
  IconShield,
  IconUser,
  IconSettings,
  IconArrowRight,
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

type TabType = 'scanner' | 'history' | 'stats';
type ScannerStep = 'selectMode' | 'selectEvent' | 'scanning';

export function EventScannerPage() {
  const { adminProfile } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('scanner');
  const [scannerStep, setScannerStep] = useState<ScannerStep>('selectMode');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
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

  // Charger les stats quand on change de mode/événement ou qu'on active l'onglet stats
  useEffect(() => {
    if (activeTab === 'stats') {
      loadStatistics();
    }
  }, [activeTab, config.mode, config.eventId]);

  const loadEvents = async () => {
    try {
      const eventsData = await getAllEventsForList();
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

    // Vérifier que la config est complète
    const modeNeedsEvent = config.mode !== ScanMode.SUBSCRIPTION_ONLY;
    if (modeNeedsEvent && !config.eventId) {
      notifications.show({
        title: 'Configuration incomplète',
        message: 'Veuillez sélectionner un événement avant de scanner',
        color: 'orange',
      });
      return;
    }

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

      // Ajouter aux scans récents (en premier)
      setRecentScans((prev) => [result, ...prev].slice(0, 50));

      // Notification visuelle
      notifications.show({
        title: result.status === ScanResultStatus.SUCCESS ? 'Scan réussi ✓' : 'Scan échoué ✗',
        message: result.message,
        color: result.status === ScanResultStatus.SUCCESS ? 'green' : 'red',
        autoClose: 3000,
      });

      // Recharger les stats si on est sur l'onglet stats
      if (activeTab === 'stats') {
        loadStatistics();
      }
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

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const stats = await calculateEventScanStatistics(config.eventId || 'global');
      setCurrentStats(stats);
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
        return <IconCheck size={20} color="var(--mantine-color-green-6)" />;
      case ScanResultStatus.SUBSCRIPTION_INACTIVE:
      case ScanResultStatus.NO_TICKET:
      case ScanResultStatus.BLOCKED:
        return <IconX size={20} color="var(--mantine-color-red-6)" />;
      case ScanResultStatus.ALREADY_SCANNED:
        return <IconAlertCircle size={20} color="var(--mantine-color-orange-6)" />;
      default:
        return <IconX size={20} color="var(--mantine-color-gray-6)" />;
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
        return 'Abonnement';
      case ScanMode.EVENT_ATTENDANCE:
        return 'Présence événement';
      case ScanMode.EVENT_WITH_TICKET:
        return 'Événement + Billet';
      default:
        return mode;
    }
  };

  const latestScan = recentScans[0];

  // Gestionnaires d'étapes
  const handleSelectMode = (mode: ScanMode) => {
    setConfig((prev) => ({ ...prev, mode, eventId: undefined }));

    // Si le mode nécessite un événement, aller à l'étape de sélection d'événement
    if (mode !== ScanMode.SUBSCRIPTION_ONLY) {
      setScannerStep('selectEvent');
    } else {
      // Sinon, aller directement au scanner
      setScannerStep('scanning');
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setConfig((prev) => ({ ...prev, eventId }));
    setScannerStep('scanning');
  };

  const handleBackToConfig = () => {
    setScannerStep('selectMode');
  };

  // Rendu des différents onglets
  const renderScannerTab = () => {
    // ÉTAPE 1: Sélection du mode
    if (scannerStep === 'selectMode') {
      return (
        <Stack gap="md" p="md">
          <Paper p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Group gap="xs">
                <IconSettings size={20} color="var(--mantine-color-indigo-6)" />
                <Text size="sm" fw={600} c="dimmed">Étape 1/2</Text>
              </Group>
              <Text size="xl" fw={700}>Choisissez le mode de scan</Text>
              <Text size="sm" c="dimmed">Sélectionnez le type de vérification que vous souhaitez effectuer</Text>
            </Stack>
          </Paper>

          <Stack gap="md">
            {/* Carte Mode Abonnement */}
            <Paper
              p="xl"
              radius="md"
              withBorder
              shadow="sm"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid var(--mantine-color-gray-3)',
              }}
              onClick={() => handleSelectMode(ScanMode.SUBSCRIPTION_ONLY)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-indigo-5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="md">
                    <Box
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--mantine-color-indigo-5), var(--mantine-color-indigo-7))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconShield size={32} color="white" />
                    </Box>
                    <div>
                      <Text size="xl" fw={700}>Abonnement seul</Text>
                      <Text size="sm" c="dimmed">Vérification d'abonnement</Text>
                    </div>
                  </Group>
                  <Text size="sm">
                    Vérifiez uniquement si le membre possède un abonnement actif. Idéal pour les vérifications rapides à l'entrée.
                  </Text>
                </Stack>
                <IconArrowRight size={24} color="var(--mantine-color-gray-5)" />
              </Group>
            </Paper>

            {/* Carte Mode Présence Événement */}
            <Paper
              p="xl"
              radius="md"
              withBorder
              shadow="sm"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid var(--mantine-color-gray-3)',
              }}
              onClick={() => handleSelectMode(ScanMode.EVENT_ATTENDANCE)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-teal-5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="md">
                    <Box
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-teal-7))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconUser size={32} color="white" />
                    </Box>
                    <div>
                      <Text size="xl" fw={700}>Présence événement</Text>
                      <Text size="sm" c="dimmed">Comptage sans billet</Text>
                    </div>
                  </Group>
                  <Text size="sm">
                    Comptabilisez la présence à un événement sans vérifier les billets. Pour les événements gratuits ou sans réservation.
                  </Text>
                </Stack>
                <IconArrowRight size={24} color="var(--mantine-color-gray-5)" />
              </Group>
            </Paper>

            {/* Carte Mode Événement + Billet */}
            <Paper
              p="xl"
              radius="md"
              withBorder
              shadow="sm"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '2px solid var(--mantine-color-gray-3)',
              }}
              onClick={() => handleSelectMode(ScanMode.EVENT_WITH_TICKET)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-violet-5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="md">
                    <Box
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--mantine-color-violet-5), var(--mantine-color-violet-7))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconTicket size={32} color="white" />
                    </Box>
                    <div>
                      <Text size="xl" fw={700}>Événement + Billet</Text>
                      <Text size="sm" c="dimmed">Vérification complète</Text>
                    </div>
                  </Group>
                  <Text size="sm">
                    Vérifiez l'abonnement ET la possession d'un billet valide pour l'événement. Pour les événements payants avec réservation.
                  </Text>
                </Stack>
                <IconArrowRight size={24} color="var(--mantine-color-gray-5)" />
              </Group>
            </Paper>
          </Stack>
        </Stack>
      );
    }

    // ÉTAPE 2: Sélection d'événement (si mode événement)
    if (scannerStep === 'selectEvent') {
      return (
        <Stack gap="md" p="md">
          <Paper p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Group gap="xs">
                <IconTicket size={20} color="var(--mantine-color-indigo-6)" />
                <Text size="sm" fw={600} c="dimmed">Étape 2/2</Text>
              </Group>
              <Text size="xl" fw={700}>Sélectionnez l'événement</Text>
              <Text size="sm" c="dimmed">
                Mode: <strong>{getModeLabel(config.mode)}</strong>
              </Text>
            </Stack>
          </Paper>

          <Paper p="xl" radius="md" withBorder shadow="sm">
            <Stack gap="lg">
              <Select
                label="Événement"
                placeholder="Choisir un événement"
                value={config.eventId}
                onChange={(value) => value && handleSelectEvent(value)}
                data={events.map((e) => ({
                  value: e.id,
                  label: `${e.title} - ${new Date(e.startDate.toMillis()).toLocaleDateString('fr-FR')}`,
                }))}
                searchable
                size="lg"
                rightSection={
                  <ActionIcon
                    variant="subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEvents();
                    }}
                  >
                    <IconRefresh size={18} />
                  </ActionIcon>
                }
                error={events.length === 0 ? "Aucun événement disponible" : undefined}
                styles={{
                  input: { fontWeight: 500, fontSize: '16px' },
                }}
              />

              {events.length === 0 && (
                <Alert icon={<IconAlertCircle size={20} />} color="orange" variant="light">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Aucun événement disponible</Text>
                    <Text size="sm">
                      Aucun événement n'a été trouvé dans la base de données. Créez un événement dans le panel admin avant de scanner.
                    </Text>
                  </Stack>
                </Alert>
              )}

              <Group>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  onClick={handleBackToConfig}
                >
                  <IconArrowLeft size={20} />
                </ActionIcon>
                <Text size="sm" c="dimmed">Retour au choix du mode</Text>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      );
    }

    // ÉTAPE 3: Scanner actif
    return (
      <Stack gap="md" p="md">
        {/* Bouton retour config */}
        <Paper p="sm" radius="md" withBorder>
          <Group justify="space-between">
            <Stack gap={4}>
              <Text size="sm" fw={600}>{getModeLabel(config.mode)}</Text>
              {config.eventId && (
                <Text size="xs" c="dimmed">
                  {events.find(e => e.id === config.eventId)?.title}
                </Text>
              )}
            </Stack>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleBackToConfig}
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Group>
        </Paper>

        {/* Scanner - Key based on tab to force remount when switching */}
        <Paper p="md" radius="md" withBorder shadow="sm">
          <QRCodeScanner
            key={`scanner-${activeTab}-${scannerStep}`}
            onScan={handleScan}
            onError={(error) => {
              console.error('Erreur scanner:', error);
              notifications.show({
                title: 'Erreur caméra',
                message: error,
                color: 'red',
              });
            }}
          />
        </Paper>

        {/* Dernier scan - Grande carte visible */}
        {latestScan && (
          <Paper
            p="lg"
            radius="md"
            withBorder
            shadow="sm"
            style={{
              backgroundColor: latestScan.status === ScanResultStatus.SUCCESS
                ? 'var(--mantine-color-green-0)'
                : 'var(--mantine-color-red-0)',
              borderColor: latestScan.status === ScanResultStatus.SUCCESS
                ? 'var(--mantine-color-green-3)'
                : 'var(--mantine-color-red-3)',
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="xs">
                  {getStatusIcon(latestScan.status)}
                  <Text size="sm" fw={600} c="dimmed">Dernier scan</Text>
                </Group>
                <Badge
                  size="lg"
                  color={getStatusColor(latestScan.status)}
                  variant="filled"
                >
                  {latestScan.status === ScanResultStatus.SUCCESS ? '✓ VALIDE' : '✗ REFUSÉ'}
                </Badge>
              </Group>

              {latestScan.user && (
                <div>
                  <Text size="xl" fw={700}>
                    {latestScan.user.firstName} {latestScan.user.lastName}
                  </Text>
                  <Text size="sm" c="dimmed">{latestScan.user.email}</Text>
                </div>
              )}

              <Text size="sm" fw={500}>
                {latestScan.message}
              </Text>

              <Text size="xs" c="dimmed">
                {new Date(latestScan.scannedAt.toMillis()).toLocaleString('fr-FR')}
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    );
  };

  const renderHistoryTab = () => (
    <ScrollArea h="calc(100vh - 140px)" p="md">
      <Stack gap="sm">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconClock size={20} color="var(--mantine-color-indigo-6)" />
            <Text size="lg" fw={600}>Historique</Text>
          </Group>
          <Badge size="lg" variant="light">{recentScans.length} scans</Badge>
        </Group>

        {recentScans.length === 0 ? (
          <Center py="xl">
            <Stack gap="md" align="center">
              <IconClock size={48} color="var(--mantine-color-gray-4)" />
              <Text c="dimmed" size="sm">Aucun scan effectué</Text>
            </Stack>
          </Center>
        ) : (
          recentScans.map((scan, index) => (
            <Card key={index} p="md" withBorder shadow="xs" radius="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                  {getStatusIcon(scan.status)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {scan.user ? (
                      <>
                        <Text size="sm" fw={600} truncate>
                          {scan.user.firstName} {scan.user.lastName}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {scan.user.email}
                        </Text>
                      </>
                    ) : (
                      <Text size="sm" c="dimmed">Utilisateur inconnu</Text>
                    )}
                    <Text size="xs" mt={4}>{scan.message}</Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {new Date(scan.scannedAt.toMillis()).toLocaleString('fr-FR')}
                    </Text>
                  </div>
                </Group>
                <Badge color={getStatusColor(scan.status)} variant="light">
                  {scan.status === ScanResultStatus.SUCCESS ? 'OK' : 'KO'}
                </Badge>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </ScrollArea>
  );

  const renderStatsTab = () => (
    <ScrollArea h="calc(100vh - 140px)" p="md">
      <Stack gap="md">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <IconChartBar size={20} color="var(--mantine-color-indigo-6)" />
            <Text size="lg" fw={600}>Statistiques</Text>
          </Group>
          <ActionIcon variant="light" onClick={loadStatistics} loading={loading}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>

        {currentStats ? (
          <Stack gap="md">
            {/* Cartes principales */}
            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
              <Card withBorder p="md" radius="md" shadow="sm">
                <Stack gap={4} align="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total</Text>
                  <Title order={2} c="indigo">{currentStats.totalScans}</Title>
                  <Text size="xs" c="dimmed">scans</Text>
                </Stack>
              </Card>

              <Card withBorder p="md" radius="md" shadow="sm">
                <Stack gap={4} align="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Succès</Text>
                  <Title order={2} c="green">{currentStats.successfulScans}</Title>
                  <Text size="xs" c="dimmed">validés</Text>
                </Stack>
              </Card>

              <Card withBorder p="md" radius="md" shadow="sm">
                <Stack gap={4} align="center">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Taux</Text>
                  <Title order={2} c="blue">
                    {currentStats.totalScans > 0
                      ? ((currentStats.successfulScans / currentStats.totalScans) * 100).toFixed(1)
                      : '0'}%
                  </Title>
                  <Text size="xs" c="dimmed">réussite</Text>
                </Stack>
              </Card>
            </SimpleGrid>

            {/* Détails des échecs */}
            {currentStats.totalScans > 0 && (
              <Paper p="md" withBorder radius="md">
                <Text size="sm" fw={600} mb="sm">Détails</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconX size={16} color="var(--mantine-color-red-6)" />
                      <Text size="sm">Abonnements refusés</Text>
                    </Group>
                    <Badge color="red" variant="light">
                      {currentStats.rejectedSubscription}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconTicket size={16} color="var(--mantine-color-orange-6)" />
                      <Text size="sm">Billets refusés</Text>
                    </Group>
                    <Badge color="orange" variant="light">
                      {currentStats.rejectedNoTicket}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconCheck size={16} color="var(--mantine-color-green-6)" />
                      <Text size="sm">Avec abonnement actif</Text>
                    </Group>
                    <Badge color="green" variant="light">
                      {currentStats.scansWithActiveSubscription}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconTicket size={16} color="var(--mantine-color-blue-6)" />
                      <Text size="sm">Avec billet valide</Text>
                    </Group>
                    <Badge color="blue" variant="light">
                      {currentStats.scansWithValidTicket}
                    </Badge>
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Alerte comptes legacy */}
            {currentStats.legacyAccountScans > 0 && (
              <Alert icon={<IconAlertCircle size={18} />} color="orange" variant="light">
                <Text size="sm" fw={500}>
                  {currentStats.legacyAccountScans} scan(s) avec ancien compte détecté(s)
                </Text>
              </Alert>
            )}

            {/* Message si aucun scan */}
            {currentStats.totalScans === 0 && (
              <Center py="xl">
                <Stack gap="md" align="center">
                  <IconChartBar size={48} color="var(--mantine-color-gray-4)" />
                  <Text c="dimmed" size="sm">Aucune statistique disponible</Text>
                  <Text c="dimmed" size="xs">Scannez des QR codes pour voir les stats</Text>
                </Stack>
              </Center>
            )}
          </Stack>
        ) : (
          <Center py="xl">
            <Stack gap="md" align="center">
              <IconChartBar size={48} color="var(--mantine-color-gray-4)" />
              <Text c="dimmed" size="sm">Chargement des statistiques...</Text>
            </Stack>
          </Center>
        )}
      </Stack>
    </ScrollArea>
  );

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--mantine-color-gray-0)' }}>
      <LoadingOverlay visible={loading} />

      {/* Header fixe */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: 'white',
          borderBottom: '1px solid var(--mantine-color-gray-3)',
        }}
      >
        <Group justify="space-between" p="md" wrap="nowrap">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => navigate('/admin/dashboard')}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>

          <div style={{ flex: 1, textAlign: 'center' }}>
            <Text size="lg" fw={700}>Scanner QR</Text>
            <Text size="xs" c="dimmed">{getModeLabel(config.mode)}</Text>
          </div>

          <ActionIcon
            variant={config.enableSound ? 'filled' : 'subtle'}
            color={config.enableSound ? 'indigo' : 'gray'}
            size="lg"
            onClick={() =>
              setConfig((prev) => ({ ...prev, enableSound: !prev.enableSound }))
            }
          >
            {config.enableSound ? <IconVolume size={20} /> : <IconVolumeOff size={20} />}
          </ActionIcon>
        </Group>
      </Box>

      {/* Contenu principal - avec padding pour header et bottom nav */}
      <Box style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        {activeTab === 'scanner' && renderScannerTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'stats' && renderStatsTab()}
      </Box>

      {/* Bottom Navigation fixe */}
      <Paper
        shadow="lg"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 0,
        }}
      >
        <Group grow gap={0}>
          <UnstyledButton
            onClick={() => setActiveTab('scanner')}
            style={{
              padding: '12px 8px',
              backgroundColor: activeTab === 'scanner' ? 'var(--mantine-color-indigo-0)' : 'transparent',
              borderTop: activeTab === 'scanner' ? '3px solid var(--mantine-color-indigo-6)' : '3px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <Stack gap={4} align="center">
              <IconQrcode
                size={24}
                color={activeTab === 'scanner' ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-gray-6)'}
              />
              <Text
                size="xs"
                fw={activeTab === 'scanner' ? 600 : 400}
                c={activeTab === 'scanner' ? 'indigo' : 'dimmed'}
              >
                Scanner
              </Text>
            </Stack>
          </UnstyledButton>

          <UnstyledButton
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 8px',
              backgroundColor: activeTab === 'history' ? 'var(--mantine-color-indigo-0)' : 'transparent',
              borderTop: activeTab === 'history' ? '3px solid var(--mantine-color-indigo-6)' : '3px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <Stack gap={4} align="center">
              <IconClock
                size={24}
                color={activeTab === 'history' ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-gray-6)'}
              />
              <Text
                size="xs"
                fw={activeTab === 'history' ? 600 : 400}
                c={activeTab === 'history' ? 'indigo' : 'dimmed'}
              >
                Historique
              </Text>
              {recentScans.length > 0 && (
                <Badge
                  size="xs"
                  variant="filled"
                  color="indigo"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '20%',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                  }}
                >
                  {recentScans.length}
                </Badge>
              )}
            </Stack>
          </UnstyledButton>

          <UnstyledButton
            onClick={() => setActiveTab('stats')}
            style={{
              padding: '12px 8px',
              backgroundColor: activeTab === 'stats' ? 'var(--mantine-color-indigo-0)' : 'transparent',
              borderTop: activeTab === 'stats' ? '3px solid var(--mantine-color-indigo-6)' : '3px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <Stack gap={4} align="center">
              <IconChartBar
                size={24}
                color={activeTab === 'stats' ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-gray-6)'}
              />
              <Text
                size="xs"
                fw={activeTab === 'stats' ? 600 : 400}
                c={activeTab === 'stats' ? 'indigo' : 'dimmed'}
              >
                Stats
              </Text>
            </Stack>
          </UnstyledButton>
        </Group>
      </Paper>
    </Box>
  );
}
