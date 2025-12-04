import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Group,
  Button,
  Text,
  Stack,
  LoadingOverlay,
  Badge,
  Divider,
  Grid,
  Box,
  Progress,
  Table,
  Tabs,
  Card,
  SimpleGrid,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconX,
  IconMail,
  IconUsers,
  IconEye,
  IconClick,
  IconCheck,
  IconSend,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { Campaign, CampaignRecipient } from '../../../shared/types/campaign';
import {
  getCampaignById,
  getCampaignRecipients,
  cancelCampaign,
  estimateRecipients,
} from '../../../shared/services/campaignService';
import { Timestamp } from 'firebase/firestore';
import { SendCampaignModal } from '../../components/campaigns/SendCampaignModal';

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendModalOpened, setSendModalOpened] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
      loadRecipients();
    }
  }, [campaignId]);

  const loadCampaign = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const data = await getCampaignById(campaignId);
      if (data) {
        setCampaign(data);

        // Calculer le nombre estimé de destinataires
        const estimated = await estimateRecipients(
          data.targeting.mode,
          data.targeting.manualUserIds,
          data.targeting.filters
        );
        setEstimatedRecipients(estimated);
      } else {
        notifications.show({
          title: 'Erreur',
          message: 'Campagne introuvable',
          color: 'red',
        });
        navigate('/admin/campaigns');
      }
    } catch (error: any) {
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

  const loadRecipients = async () => {
    if (!campaignId) return;

    try {
      const data = await getCampaignRecipients(campaignId);
      setRecipients(data);
    } catch (error: any) {
      console.error('Error loading recipients:', error);
    }
  };

  const handleCancel = async () => {
    if (!campaign || !campaignId) return;

    const reason = prompt(`Pourquoi annulez-vous la campagne "${campaign.name}" ?`);
    if (!reason) return;

    try {
      await cancelCampaign(campaignId, 'admin-id', reason); // TODO: Get real admin ID
      notifications.show({
        title: 'Succès',
        message: 'Campagne annulée avec succès',
        color: 'green',
      });
      loadCampaign();
    } catch (error: any) {
      console.error('Error cancelling campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'annuler la campagne',
        color: 'red',
      });
    }
  };

  const handleSendNow = () => {
    if (!campaign || !campaignId) return;
    // Ouvrir le modal d'envoi
    setSendModalOpened(true);
  };

  const handleSendComplete = async () => {
    // Recharger la campagne après l'envoi
    await loadCampaign();
    await loadRecipients();
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'gray' },
      scheduled: { label: 'Planifiée', color: 'blue' },
      sending: { label: 'En cours', color: 'orange' },
      sent: { label: 'Envoyée', color: 'green' },
      cancelled: { label: 'Annulée', color: 'red' },
    };

    const config = statusConfig[status];
    return <Badge color={config.color} size="lg">{config.label}</Badge>;
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

  const getRecipientStatusBadge = (status: CampaignRecipient['status']) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'gray' },
      sent: { label: 'Envoyé', color: 'blue' },
      failed: { label: 'Échec', color: 'red' },
      opened: { label: 'Ouvert', color: 'green' },
      clicked: { label: 'Cliqué', color: 'teal' },
      bounced: { label: 'Rebond', color: 'orange' },
    };

    const config = statusConfig[status];
    return <Badge color={config.color} size="sm">{config.label}</Badge>;
  };

  if (!campaign) {
    return <LoadingOverlay visible={loading} />;
  }

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={18} />}
                onClick={() => navigate('/admin/campaigns')}
              >
                Retour
              </Button>
            </Group>
            <Group mt="xs" align="center">
              <Title order={1}>{campaign.name}</Title>
              {getStatusBadge(campaign.status)}
            </Group>
            {campaign.description && (
              <Text c="dimmed" size="sm" mt="xs">
                {campaign.description}
              </Text>
            )}
          </div>
          <Group>
            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
              <>
                <Button
                  leftSection={<IconSend size={18} />}
                  color="green"
                  onClick={handleSendNow}
                  disabled={estimatedRecipients === 0}
                >
                  Envoyer maintenant
                </Button>
                <Button
                  leftSection={<IconEdit size={18} />}
                  variant="light"
                  onClick={() => navigate(`/admin/campaigns/${campaignId}/edit`)}
                >
                  Modifier
                </Button>
              </>
            )}
            {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
              <Button
                leftSection={<IconX size={18} />}
                color="red"
                variant="light"
                onClick={handleCancel}
              >
                Annuler
              </Button>
            )}
          </Group>
        </Group>

        {/* Statistiques principales */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <Card shadow="sm" padding="lg">
            <Stack gap="xs">
              <Group gap="xs">
                <IconUsers size={20} color="blue" />
                <Text size="sm" c="dimmed">Destinataires</Text>
              </Group>
              <Text size="xl" fw={700}>{campaign.stats.totalRecipients}</Text>
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg">
            <Stack gap="xs">
              <Group gap="xs">
                <IconCheck size={20} color="green" />
                <Text size="sm" c="dimmed">Envoyés</Text>
              </Group>
              <Text size="xl" fw={700}>{campaign.stats.sent}</Text>
              <Progress value={(campaign.stats.sent / campaign.stats.totalRecipients) * 100} color="green" size="sm" />
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg">
            <Stack gap="xs">
              <Group gap="xs">
                <IconEye size={20} color="blue" />
                <Text size="sm" c="dimmed">Taux d'ouverture</Text>
              </Group>
              <Text size="xl" fw={700}>{campaign.stats.openRate.toFixed(1)}%</Text>
              <Progress value={campaign.stats.openRate} color="blue" size="sm" />
            </Stack>
          </Card>

          <Card shadow="sm" padding="lg">
            <Stack gap="xs">
              <Group gap="xs">
                <IconClick size={20} color="teal" />
                <Text size="sm" c="dimmed">Taux de clic</Text>
              </Group>
              <Text size="xl" fw={700}>{campaign.stats.clickRate.toFixed(1)}%</Text>
              <Progress value={campaign.stats.clickRate} color="teal" size="sm" />
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Détails */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" shadow="sm">
              <Stack gap="md">
                <Text fw={600} size="lg">Informations de la campagne</Text>
                <Divider />

                <Box>
                  <Text size="sm" c="dimmed">Sujet</Text>
                  <Text fw={500}>{campaign.content.subject}</Text>
                </Box>

                {campaign.content.preheader && (
                  <Box>
                    <Text size="sm" c="dimmed">Préheader</Text>
                    <Text fw={500}>{campaign.content.preheader}</Text>
                  </Box>
                )}

                <Box>
                  <Text size="sm" c="dimmed">Expéditeur</Text>
                  <Text fw={500}>
                    {campaign.content.fromName} &lt;{campaign.content.fromEmail}&gt;
                  </Text>
                </Box>

                {campaign.content.replyTo && (
                  <Box>
                    <Text size="sm" c="dimmed">Répondre à</Text>
                    <Text fw={500}>{campaign.content.replyTo}</Text>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Text size="sm" c="dimmed">Créée le</Text>
                  <Text fw={500}>{formatDate(campaign.createdAt)}</Text>
                </Box>

                {campaign.scheduledAt && (
                  <Box>
                    <Text size="sm" c="dimmed">Planifiée pour le</Text>
                    <Text fw={500}>{formatDate(campaign.scheduledAt)}</Text>
                  </Box>
                )}

                {campaign.sentAt && (
                  <Box>
                    <Text size="sm" c="dimmed">Envoyée le</Text>
                    <Text fw={500}>{formatDate(campaign.sentAt)}</Text>
                  </Box>
                )}

                {campaign.cancelledAt && (
                  <Box>
                    <Text size="sm" c="dimmed">Annulée le</Text>
                    <Text fw={500}>{formatDate(campaign.cancelledAt)}</Text>
                    {campaign.cancellationReason && (
                      <Text size="sm" mt="xs" c="dimmed">
                        Raison : {campaign.cancellationReason}
                      </Text>
                    )}
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper p="md" shadow="sm">
              <Stack gap="md">
                <Text fw={600} size="lg">Ciblage</Text>
                <Divider />

                <Box>
                  <Text size="sm" c="dimmed">Mode de ciblage</Text>
                  <Text fw={500}>
                    {campaign.targeting.mode === 'all' && 'Tous les utilisateurs actifs'}
                    {campaign.targeting.mode === 'filtered' && 'Filtré par critères'}
                    {campaign.targeting.mode === 'manual' && 'Sélection manuelle'}
                  </Text>
                </Box>

                <Box>
                  <Text size="sm" c="dimmed">Nombre de destinataires estimés</Text>
                  <Badge size="lg">{campaign.targeting.estimatedRecipients} personnes</Badge>
                </Box>

                {campaign.targeting.filters && (
                  <Box>
                    <Text size="sm" c="dimmed" mb="xs">Filtres appliqués</Text>
                    <Stack gap="xs">
                      {campaign.targeting.filters.membershipTypes && (
                        <Text size="sm">• Types : {campaign.targeting.filters.membershipTypes.join(', ')}</Text>
                      )}
                      {campaign.targeting.filters.membershipStatus && (
                        <Text size="sm">• Statuts : {campaign.targeting.filters.membershipStatus.join(', ')}</Text>
                      )}
                      {campaign.targeting.filters.ageRange && (
                        <Text size="sm">
                          • Âge : {campaign.targeting.filters.ageRange.min || 0} - {campaign.targeting.filters.ageRange.max || '∞'}
                        </Text>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Statistiques détaillées */}
        {campaign.status === 'sent' && (
          <Paper shadow="sm">
            <Tabs defaultValue="stats">
              <Tabs.List>
                <Tabs.Tab value="stats" leftSection={<IconEye size={16} />}>
                  Statistiques
                </Tabs.Tab>
                <Tabs.Tab value="recipients" leftSection={<IconUsers size={16} />}>
                  Destinataires ({recipients.length})
                </Tabs.Tab>
                <Tabs.Tab value="preview" leftSection={<IconMail size={16} />}>
                  Aperçu de l'email
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="stats" p="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Stack gap="xs">
                      <Text fw={500}>Détails d'envoi</Text>
                      <Text size="sm">✅ Envoyés : {campaign.stats.sent}</Text>
                      <Text size="sm">⏳ En attente : {campaign.stats.pending}</Text>
                      <Text size="sm">❌ Échecs : {campaign.stats.failed}</Text>
                      <Text size="sm">⚠️ Rebonds : {campaign.stats.bounced}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Stack gap="xs">
                      <Text fw={500}>Engagement</Text>
                      <Text size="sm">👁️ Ouvertures : {campaign.stats.opened} ({campaign.stats.openRate.toFixed(1)}%)</Text>
                      <Text size="sm">🖱️ Clics : {campaign.stats.clicked} ({campaign.stats.clickRate.toFixed(1)}%)</Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Tabs.Panel>

              <Tabs.Panel value="recipients" p="md">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Destinataire</Table.Th>
                      <Table.Th>Email</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th>Envoyé le</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recipients.map((recipient) => (
                      <Table.Tr key={recipient.id}>
                        <Table.Td>
                          {recipient.firstName} {recipient.lastName}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{recipient.email}</Text>
                        </Table.Td>
                        <Table.Td>{getRecipientStatusBadge(recipient.status)}</Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(recipient.sentAt)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Tabs.Panel>

              <Tabs.Panel value="preview" p="md">
                <Paper withBorder p="md">
                  <div dangerouslySetInnerHTML={{ __html: campaign.content.html }} />
                </Paper>
              </Tabs.Panel>
            </Tabs>
          </Paper>
        )}
      </Stack>

      {/* Modal d'envoi de campagne */}
      {campaign && campaignId && (
        <SendCampaignModal
          opened={sendModalOpened}
          onClose={() => setSendModalOpened(false)}
          onComplete={handleSendComplete}
          campaignId={campaignId}
          campaignName={campaign.name}
          totalRecipients={estimatedRecipients}
        />
      )}
    </div>
  );
}
