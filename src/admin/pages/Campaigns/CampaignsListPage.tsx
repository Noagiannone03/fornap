import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Group,
  Button,
  Text,
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Menu,
  TextInput,
  Select,
  LoadingOverlay,
  Pagination,
  Stack,
  Flex,
  Box,
  Progress,
} from '@mantine/core';
import {
  IconPlus,
  IconSearch,
  IconEye,
  IconEdit,
  IconTrash,
  IconDots,
  IconX,
  IconCopy,
  IconMail,
  IconBug,
} from '@tabler/icons-react';
import { ThemeIcon } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { Campaign, CampaignStatus } from '../../../shared/types/campaign';
import {
  getFilteredCampaigns,
  deleteCampaign,
  cancelCampaign,
} from '../../../shared/services/campaignService';
import { Timestamp } from 'firebase/firestore';

export function CampaignsListPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCampaigns();
  }, [currentPage, statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);

      const filters: any = {};
      if (statusFilter) {
        filters.status = [statusFilter as CampaignStatus];
      }
      if (searchTerm) {
        filters.searchTerm = searchTerm;
      }

      const result = await getFilteredCampaigns(filters, {
        page: currentPage,
        limit: itemsPerPage,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      setCampaigns(result.campaigns);
      setTotalPages(result.totalPages);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les campagnes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCampaigns();
  };

  const handleDelete = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la campagne "${campaignName}" ?`)) {
      return;
    }

    try {
      await deleteCampaign(campaignId);
      notifications.show({
        title: 'Succès',
        message: 'Campagne supprimée avec succès',
        color: 'green',
      });
      loadCampaigns();
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de supprimer la campagne',
        color: 'red',
      });
    }
  };

  const handleCancel = async (campaignId: string, campaignName: string) => {
    const reason = prompt(`Pourquoi annulez-vous la campagne "${campaignName}" ?`);
    if (!reason) return;

    try {
      await cancelCampaign(campaignId, 'admin-id', reason); // TODO: Get real admin ID
      notifications.show({
        title: 'Succès',
        message: 'Campagne annulée avec succès',
        color: 'green',
      });
      loadCampaigns();
    } catch (error: any) {
      console.error('Error cancelling campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'annuler la campagne',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'gray' },
      scheduled: { label: 'Planifiée', color: 'blue' },
      sending: { label: 'En cours', color: 'orange' },
      sent: { label: 'Envoyée', color: 'green' },
      cancelled: { label: 'Annulée', color: 'red' },
    };

    const config = statusConfig[status];
    return <Badge color={config.color}>{config.label}</Badge>;
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

  const rows = campaigns.map((campaign) => (
    <Table.Tr key={campaign.id}>
      <Table.Td>
        <Stack gap="xs">
          <Text fw={600}>{campaign.name}</Text>
          {campaign.description && (
            <Text size="sm" c="dimmed" lineClamp={1}>
              {campaign.description}
            </Text>
          )}
        </Stack>
      </Table.Td>
      <Table.Td>{getStatusBadge(campaign.status)}</Table.Td>
      <Table.Td>
        <Stack gap="xs">
          <Text size="sm">{campaign.stats.totalRecipients} destinataires</Text>
          {campaign.status === 'sent' && (
            <Box>
              <Text size="xs" c="dimmed" mb={4}>
                Ouvertures : {campaign.stats.openRate.toFixed(1)}%
              </Text>
              <Progress
                value={campaign.stats.openRate}
                color="blue"
                size="sm"
              />
            </Box>
          )}
        </Stack>
      </Table.Td>
      <Table.Td>
        <Stack gap={4}>
          <Text size="sm">{formatDate(campaign.createdAt)}</Text>
          {campaign.scheduledAt && (
            <Text size="xs" c="dimmed">
              📅 {formatDate(campaign.scheduledAt)}
            </Text>
          )}
        </Stack>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <Tooltip label="Voir les détails">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
            >
              <IconEye size={18} />
            </ActionIcon>
          </Tooltip>

          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <Tooltip label="Modifier">
              <ActionIcon
                variant="light"
                color="yellow"
                onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit`)}
              >
                <IconEdit size={18} />
              </ActionIcon>
            </Tooltip>
          )}

          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="light" color="gray">
                <IconDots size={18} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconEye size={16} />}
                onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
              >
                Voir les détails
              </Menu.Item>

              {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                <>
                  <Menu.Item
                    leftSection={<IconEdit size={16} />}
                    onClick={() => navigate(`/admin/campaigns/${campaign.id}/edit`)}
                  >
                    Modifier
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconCopy size={16} />}
                    onClick={() => {
                      notifications.show({
                        title: 'Info',
                        message: 'Fonctionnalité de duplication à venir',
                        color: 'blue',
                      });
                    }}
                  >
                    Dupliquer
                  </Menu.Item>
                </>
              )}

              {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
                <Menu.Item
                  leftSection={<IconX size={16} />}
                  color="orange"
                  onClick={() => handleCancel(campaign.id, campaign.name)}
                >
                  Annuler l'envoi
                </Menu.Item>
              )}

              {campaign.status === 'draft' && (
                <Menu.Divider />
              )}

              {campaign.status === 'draft' && (
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={() => handleDelete(campaign.id, campaign.name)}
                >
                  Supprimer
                </Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Campagnes Email</Title>
            <Text c="dimmed" size="sm">
              Gérez vos campagnes d'emailing et suivez leurs performances
            </Text>
          </div>
          <Group>
            <Button
              variant="light"
              leftSection={<IconBug size={18} />}
              onClick={() => navigate('/admin/campaigns/diagnostics')}
            >
              Diagnostics
            </Button>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => navigate('/admin/campaigns/create')}
            >
              Nouvelle campagne
            </Button>
          </Group>
        </Group>

        {/* Filters */}
        <Paper p="md" shadow="sm">
          <Flex gap="md" wrap="wrap">
            <TextInput
              placeholder="Rechercher par nom..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, minWidth: 250 }}
            />
            <Select
              placeholder="Tous les statuts"
              data={[
                { value: '', label: 'Tous les statuts' },
                { value: 'draft', label: 'Brouillon' },
                { value: 'scheduled', label: 'Planifiée' },
                { value: 'sending', label: 'En cours' },
                { value: 'sent', label: 'Envoyée' },
                { value: 'cancelled', label: 'Annulée' },
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value || '')}
              style={{ minWidth: 200 }}
              clearable
            />
            <Button onClick={handleSearch} variant="light">
              Rechercher
            </Button>
          </Flex>
        </Paper>

        {/* Table */}
        <Paper shadow="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Campagne</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th>Statistiques</Table.Th>
                <Table.Th>Dates</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Stack align="center" py="xl" gap="md">
                      <ThemeIcon size={80} radius="xl" variant="light" color="gray">
                        <IconMail size={40} />
                      </ThemeIcon>
                      <div style={{ textAlign: 'center' }}>
                        <Text fw={600} size="lg" mb="xs">
                          {searchTerm || statusFilter
                            ? 'Aucune campagne trouvée'
                            : 'Aucune campagne créée'}
                        </Text>
                        <Text c="dimmed" size="sm" maw={400} mx="auto">
                          {searchTerm || statusFilter
                            ? 'Essayez de modifier vos filtres de recherche pour trouver ce que vous cherchez'
                            : 'Commencez à communiquer avec vos membres en créant votre première campagne d\'emailing'}
                        </Text>
                      </div>
                      {!searchTerm && !statusFilter && (
                        <Button
                          size="md"
                          leftSection={<IconPlus size={18} />}
                          onClick={() => navigate('/admin/campaigns/create')}
                        >
                          Créer ma première campagne
                        </Button>
                      )}
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          {totalPages > 1 && (
            <Flex justify="center" p="md">
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={totalPages}
              />
            </Flex>
          )}
        </Paper>
      </Stack>
    </div>
  );
}
