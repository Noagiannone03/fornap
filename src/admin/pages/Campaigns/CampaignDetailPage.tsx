import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  RingProgress,
  ActionIcon,
  Flex,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconFilter,
  IconMail,
  IconRefresh,
  IconSearch,
  IconSend,
  IconTrash,
  IconUsers,
  IconX,
  IconChartPie,
  IconDeviceDesktopAnalytics,
  IconFlask,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Timestamp } from 'firebase/firestore';
import type { Campaign, CampaignRecipient, TargetingFilters } from '../../../shared/types/campaign';
import {
  cancelCampaign,
  deleteCampaign,
  estimateRecipients,
  getCampaignById,
  getCampaignRecipients,
  loadCampaignHtml,
} from '../../../shared/services/campaignService';
import { SendCampaignModal } from '../../components/campaigns/SendCampaignModal';
import { RetryCampaignModal } from '../../components/campaigns/RetryCampaignModal';

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendModalOpened, setSendModalOpened] = useState(false);
  const [retryModalOpened, setRetryModalOpened] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [previewHtml, setPreviewHtml] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');

  useEffect(() => {
    if (!campaignId) return;

    const run = async () => {
      try {
        setLoading(true);

        const [campaignData, recipientsData] = await Promise.all([
          getCampaignById(campaignId),
          getCampaignRecipients(campaignId),
        ]);

        if (!campaignData) {
          notifications.show({
            title: 'Erreur',
            message: 'Campagne introuvable',
            color: 'red',
          });
          navigate('/admin/campaigns');
          return;
        }

        setCampaign(campaignData);
        setRecipients(recipientsData);

        if (campaignData.content.htmlInStorage) {
          const html = await loadCampaignHtml(campaignId);
          setPreviewHtml(html || campaignData.content.html || '');
        } else {
          setPreviewHtml(campaignData.content.html || '');
        }

        const estimated = await estimateRecipients(
          campaignData.targeting.mode,
          campaignData.targeting.manualUserIds,
          campaignData.targeting.filters
        );
        setEstimatedRecipients(estimated);
      } catch (error) {
        console.error('Error loading campaign:', error);
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger la campagne',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [campaignId, navigate]);

  useEffect(() => {
    if (!campaignId || !campaign || campaign.status !== 'sent') return;

    const interval = setInterval(async () => {
      try {
        const [campaignData, recipientsData] = await Promise.all([
          getCampaignById(campaignId),
          getCampaignRecipients(campaignId),
        ]);

        if (campaignData) {
          setCampaign(campaignData);
          setRecipients(recipientsData);
        }
      } catch (error) {
        console.error('Error refreshing campaign:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [campaignId, campaign]);

  const refreshData = async () => {
    if (!campaignId) return;

    try {
      setRefreshing(true);

      const [campaignData, recipientsData] = await Promise.all([
        getCampaignById(campaignId),
        getCampaignRecipients(campaignId),
      ]);

      if (campaignData) {
        setCampaign(campaignData);
        setRecipients(recipientsData);
      }

      notifications.show({
        title: 'Rafraichi',
        message: 'Statistiques mises a jour',
        color: 'green',
        autoClose: 2000,
      });
    } catch (error) {
      console.error('Error refreshing campaign:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (!campaign || !campaignId) return;

    const reason = prompt(`Pourquoi annulez-vous la campagne "${campaign.name}" ?`);
    if (!reason) return;

    try {
      await cancelCampaign(campaignId, 'admin-id', reason);
      notifications.show({
        title: 'Succes',
        message: 'Campagne annulee',
        color: 'green',
      });
      await refreshData();
    } catch (error) {
      console.error('Error cancelling campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'annuler la campagne',
        color: 'red',
      });
    }
  };

  const handleDelete = async () => {
    if (!campaign || !campaignId) return;

    const confirmed = window.confirm(
      `Supprimer definitivement "${campaign.name}" ? Cette action est irreversible.`
    );
    if (!confirmed) return;

    try {
      await deleteCampaign(campaignId);
      notifications.show({
        title: 'Succes',
        message: 'Campagne supprimee',
        color: 'green',
      });
      navigate('/admin/campaigns');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de supprimer la campagne',
        color: 'red',
      });
    }
  };

  const handleRetryComplete = async () => {
    await refreshData();
  };

  const handleSendComplete = async () => {
    await refreshData();
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'gray' },
      scheduled: { label: 'Planifiee', color: 'blue' },
      sending: { label: 'En cours', color: 'orange' },
      sent: { label: 'Envoyee', color: 'green' },
      cancelled: { label: 'Annulee', color: 'red' },
    };

    const config = statusConfig[status];
    return (
      <Badge color={config.color} variant="light" size="lg" fw={600}>
        {config.label}
      </Badge>
    );
  };

  const getRecipientStatusBadge = (status: CampaignRecipient['status']) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'gray' },
      sent: { label: 'Envoye', color: 'blue' },
      failed: { label: 'Echec', color: 'red' },
      opened: { label: 'Ouvert', color: 'green' },
      clicked: { label: 'Clique', color: 'teal' },
      bounced: { label: 'Rebond', color: 'orange' },
    };

    const config = statusConfig[status];
    return (
      <Badge color={config.color} variant="light" size="sm">
        {config.label}
      </Badge>
    );
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRate = (value: number, total: number) => {
    if (!total) return 0;
    return Math.min(100, Math.max(0, (value / total) * 100));
  };

  const getTargetingModeLabel = (mode: Campaign['targeting']['mode']) => {
    if (mode === 'all') return 'Tous les membres';
    if (mode === 'manual') return 'Selection manuelle';
    return 'Audience filtree';
  };

  const getActiveFilters = (filters?: TargetingFilters) => {
    if (!filters) return [];

    const items: Array<{ label: string; color: string }> = [];

    if (filters.membershipTypes?.length) {
      items.push({ label: filters.membershipTypes.join(', '), color: 'blue' });
    }
    if (filters.membershipStatus?.length) {
      items.push({ label: filters.membershipStatus.join(', '), color: 'teal' });
    }
    if (filters.includeTags?.length) {
      items.push({ label: `Tags: ${filters.includeTags.join(', ')}`, color: 'grape' });
    }
    if (filters.ageRange) {
      items.push({
        label: `Age ${filters.ageRange.min ?? 0}-${filters.ageRange.max ?? 'max'}`,
        color: 'orange',
      });
    }
    if (filters.cities?.length) {
      items.push({ label: filters.cities.join(', '), color: 'cyan' });
    }
    if (filters.emailWhitelist?.length) {
      items.push({ label: `${filters.emailWhitelist.length} emails`, color: 'lime' });
    }

    return items;
  };

  if (!campaign) {
    return (
      <Box pos="relative" mih={320}>
        <LoadingOverlay visible={loading} />
      </Box>
    );
  }

  const audienceCount =
    campaign.stats.totalRecipients ||
    campaign.targeting.estimatedRecipients ||
    estimatedRecipients ||
    0;
  const sentCount = campaign.stats.sent || 0;
  const failedCount = campaign.stats.failed || 0;
  const bouncedCount = campaign.stats.bounced || 0;
  const deliveryRate = getRate(sentCount, audienceCount);
  const filters = getActiveFilters(campaign.targeting.filters);
  const filteredRecipients = recipients.filter((recipient) => {
    const query = recipientSearch.trim().toLowerCase();
    if (!query) return true;

    const text = `${recipient.firstName} ${recipient.lastName} ${recipient.email} ${recipient.status}`.toLowerCase();
    return text.includes(query);
  });

  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} />

      <Stack gap="xl">
        {/* Page Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="sm" align="center">
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              onClick={() => navigate('/admin/campaigns')}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Box>
              <Group gap="sm" mb={4}>
                <Title order={1} size="h2">{campaign.name}</Title>
                {getStatusBadge(campaign.status)}
              </Group>
              {campaign.description && (
                <Text c="dimmed" size="sm">
                  {campaign.description}
                </Text>
              )}
            </Box>
          </Group>

          <Group gap="sm">
            {campaign.status === 'sent' && (
              <>
                <Button
                  variant="default"
                  leftSection={<IconRefresh size={18} />}
                  onClick={refreshData}
                  loading={refreshing}
                >
                  Rafraichir
                </Button>
                {failedCount > 0 && (
                  <Button
                    variant="light"
                    color="orange"
                    leftSection={<IconMail size={18} />}
                    onClick={() => setRetryModalOpened(true)}
                  >
                    Renvoyer ({failedCount})
                  </Button>
                )}
              </>
            )}

            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
              <>
                <Button
                  variant="default"
                  leftSection={<IconEdit size={18} />}
                  onClick={() => navigate(`/admin/campaigns/${campaignId}/edit`)}
                >
                  Modifier
                </Button>
                <Button
                  color="blue"
                  leftSection={<IconSend size={18} />}
                  onClick={() => setSendModalOpened(true)}
                  disabled={estimatedRecipients === 0}
                >
                  Envoyer la campagne
                </Button>
              </>
            )}

            {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconX size={18} />}
                onClick={handleCancel}
              >
                Annuler l'envoi
              </Button>
            )}

            {(campaign.status === 'draft' || campaign.status === 'cancelled') && (
              <Button
                variant="light"
                color="red"
                leftSection={<IconTrash size={18} />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            )}
          </Group>
        </Group>

        {/* Main Content Layout */}
        <Grid gutter="xl" align="flex-start">
          {/* Left Column : Email Client View */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Paper withBorder radius="md" shadow="sm" style={{ overflow: 'hidden' }}>
              {/* Fake Email Header */}
              <Box bg="gray.0" p="xl" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Title order={2} size="h3" style={{ flex: 1 }}>
                      {campaign.content.subject}
                    </Title>
                    {campaign.content.preheader && (
                      <Badge variant="outline" color="gray" size="sm" mt={4}>
                        Préheader: {campaign.content.preheader}
                      </Badge>
                    )}
                  </Group>

                  <Grid gutter="md">
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Expéditeur</Text>
                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon color="blue" variant="light" radius="xl" size="md">
                          <IconMail size={14} />
                        </ThemeIcon>
                        <Box>
                          <Text size="sm" fw={600}>{campaign.content.fromName}</Text>
                          <Text size="xs" c="dimmed">&lt;{campaign.content.fromEmail}&gt;</Text>
                        </Box>
                      </Group>
                    </Grid.Col>
                    
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb={4}>Informations</Text>
                      <Stack gap={2}>
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="xs" c="dimmed">Création:</Text>
                          <Text size="xs" fw={500}>{formatDate(campaign.createdAt)}</Text>
                        </Group>
                        {campaign.sentAt && (
                           <Group justify="space-between" wrap="nowrap">
                            <Text size="xs" c="green.7">Envoi:</Text>
                            <Text size="xs" fw={500} c="green.9">{formatDate(campaign.sentAt)}</Text>
                          </Group>
                        )}
                        {campaign.content.replyTo && (
                          <Group justify="space-between" wrap="nowrap">
                            <Text size="xs" c="dimmed">Réponse:</Text>
                            <Text size="xs" fw={500}>{campaign.content.replyTo}</Text>
                          </Group>
                        )}
                        {campaign.lastTestSentAt && (
                          <Group justify="space-between" wrap="nowrap">
                            <Text size="xs" c="dimmed">Dernier test:</Text>
                            <Text size="xs" fw={500}>
                              {campaign.lastTestSentTo || 'adresse inconnue'} · {formatDate(campaign.lastTestSentAt)}
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    </Grid.Col>
                  </Grid>
                </Stack>
              </Box>

              {/* Email Content */}
              <Box bg="white" style={{ minHeight: 400, maxHeight: 800, overflow: 'auto' }}>
                {previewHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ margin: 0, padding: 0 }} />
                ) : (
                  <Stack align="center" justify="center" h={400} gap="md">
                    <ThemeIcon size={72} radius="xl" variant="light" color="gray">
                      <IconDeviceDesktopAnalytics size={34} />
                    </ThemeIcon>
                    <Text fw={600} size="lg">Aperçu du mail indisponible</Text>
                    <Text c="dimmed" size="sm">L'aperçu HTML n'a pas pu être chargé.</Text>
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid.Col>

          {/* Right Column : Analytics & Targeting */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="xl">
              {/* Analytics Card */}
              <Paper withBorder p="md" radius="md" shadow="sm">
                {campaign.lastTestSentAt && (
                  <Alert icon={<IconFlask size={16} />} color="green" variant="light" mb="lg">
                    <Text size="sm" fw={600}>
                      Test déjà validé
                    </Text>
                    <Text size="xs" mt="xs">
                      Envoyé à {campaign.lastTestSentTo || 'adresse inconnue'} le {formatDate(campaign.lastTestSentAt)}.
                    </Text>
                  </Alert>
                )}

                <Group gap="sm" mb="lg">
                  <IconChartPie size={20} color="var(--mantine-color-blue-6)" />
                  <Title order={3} size="h5">Performances</Title>
                </Group>

                <Stack gap="lg">
                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Audience Ciblée</Text>
                      <Text fw={700} size="xl">{audienceCount}</Text>
                    </div>
                    <ThemeIcon variant="light" color="gray" size="xl" radius="md">
                      <IconUsers size={24} />
                    </ThemeIcon>
                  </Group>

                  <Group justify="space-between" wrap="nowrap">
                    <div>
                      <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Emails Envoyés</Text>
                      <Group align="flex-end" gap="xs">
                        <Text fw={700} size="xl">{sentCount}</Text>
                      </Group>
                    </div>
                    <RingProgress
                      size={64}
                      thickness={6}
                      roundCaps
                      sections={[{ value: deliveryRate, color: 'blue' }]}
                      label={
                        <Text size="xs" ta="center" fw={700}>
                          {Math.round(deliveryRate)}%
                        </Text>
                      }
                    />
                  </Group>

                  {campaign.status === 'sent' && (
                    <Box mt="sm" p="md" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm">Livrés avec succès</Text>
                          <Text size="sm" fw={600} c="green">{sentCount}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm">Échecs d'envoi</Text>
                          <Text size="sm" fw={600} c="red">{failedCount}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm">Rebonds</Text>
                          <Text size="sm" fw={600} c="orange">{bouncedCount}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm">En attente</Text>
                          <Text size="sm" fw={600} c="gray">{campaign.stats.pending || 0}</Text>
                        </Group>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Paper>

              {/* Targeting Card */}
              <Paper withBorder p="md" radius="md" shadow="sm">
                <Group gap="sm" mb="lg">
                  <IconFilter size={20} color="var(--mantine-color-violet-6)" />
                  <Title order={3} size="h5">Ciblage de l'audience</Title>
                </Group>

                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Text size="sm" fw={600}>Mode de sélection</Text>
                    <Badge variant="dot" color="violet">{getTargetingModeLabel(campaign.targeting.mode)}</Badge>
                  </Group>

                  {filters.length > 0 && (
                    <Box>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb="xs">
                        Critères actifs
                      </Text>
                      <Flex gap="xs" wrap="wrap">
                        {filters.map((filter) => (
                          <Badge
                            key={filter.label}
                            variant="light"
                            color={filter.color}
                            style={{ textTransform: 'none' }}
                          >
                            {filter.label}
                          </Badge>
                        ))}
                      </Flex>
                    </Box>
                  )}

                  {campaign.cancellationReason && (
                    <Box mt="sm" p="sm" bg="red.0" style={{ borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-red-2)' }}>
                       <Text size="xs" c="red.9" fw={700} tt="uppercase" mb={4}>
                        Raison d'annulation
                      </Text>
                      <Text size="sm" c="red.9">{campaign.cancellationReason}</Text>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Bottom Section : Recipients Table */}
        <Paper withBorder radius="md" shadow="sm" p="md">
          <Stack gap="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="sm">
                <IconUsers size={24} color="var(--mantine-color-gray-6)" />
                <Title order={3} size="h4">Destinataires de la campagne</Title>
                <Badge variant="light" color="gray" size="lg">{recipients.length}</Badge>
              </Group>
              <TextInput
                placeholder="Rechercher par nom ou email..."
                leftSection={<IconSearch size={16} />}
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.currentTarget.value)}
                style={{ width: '100%', maxWidth: 350 }}
                radius="md"
              />
            </Group>

            <Table.ScrollContainer minWidth={800}>
              <Table verticalSpacing="sm" striped highlightOnHover>
                <Table.Thead bg="gray.0">
                  <Table.Tr>
                    <Table.Th>Utilisateur</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Statut d'envoi</Table.Th>
                    <Table.Th>Date d'envoi</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRecipients.length > 0 ? (
                    filteredRecipients.map((recipient) => (
                      <Table.Tr key={recipient.id}>
                        <Table.Td>
                          <Text fw={500} size="sm">
                            {recipient.firstName} {recipient.lastName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {recipient.email}
                          </Text>
                        </Table.Td>
                        <Table.Td>{getRecipientStatusBadge(recipient.status)}</Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(recipient.sentAt)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Stack align="center" py={50} gap="sm">
                          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                            <IconUsers size={30} />
                          </ThemeIcon>
                          <Text fw={600} size="lg">Aucun destinataire trouvé</Text>
                          <Text c="dimmed" size="sm">La recherche n'a donné aucun résultat ou la campagne n'a pas de cible.</Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Stack>
        </Paper>
      </Stack>

      <SendCampaignModal
        opened={sendModalOpened}
        onClose={() => setSendModalOpened(false)}
        onComplete={handleSendComplete}
        campaignId={campaignId || ''}
        campaignName={campaign.name}
        totalRecipients={estimatedRecipients}
        lastTestSentAt={campaign.lastTestSentAt}
        lastTestSentTo={campaign.lastTestSentTo}
      />

      <RetryCampaignModal
        opened={retryModalOpened}
        onClose={() => setRetryModalOpened(false)}
        onComplete={handleRetryComplete}
        campaignId={campaignId || ''}
        campaignName={campaign.name}
        totalFailed={failedCount}
      />
    </Box>
  );
}
