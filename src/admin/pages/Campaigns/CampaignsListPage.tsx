import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  LoadingOverlay,
  Menu,
  Pagination,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconChartBar,
  IconCopy,
  IconDots,
  IconEdit,
  IconEye,
  IconMail,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Timestamp } from 'firebase/firestore';
import type { Campaign, CampaignStatus } from '../../../shared/types/campaign';
import {
  cancelCampaign,
  deleteCampaign,
  getFilteredCampaigns,
} from '../../../shared/services/campaignService';

export function CampaignsListPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        const filters: { status?: CampaignStatus[]; searchTerm?: string } = {};
        if (statusFilter) {
          filters.status = [statusFilter as CampaignStatus];
        }
        if (appliedSearchTerm.trim()) {
          filters.searchTerm = appliedSearchTerm.trim();
        }

        const result = await getFilteredCampaigns(filters, {
          page: currentPage,
          limit: itemsPerPage,
          orderBy: 'createdAt',
          orderDirection: 'desc',
        });

        setCampaigns(result.campaigns);
        setTotalPages(result.totalPages);
        setTotalResults(result.total);
      } catch (error) {
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

    void run();
  }, [appliedSearchTerm, currentPage, statusFilter]);

  const loadCampaigns = async (searchValue = appliedSearchTerm) => {
    try {
      setLoading(true);

      const filters: { status?: CampaignStatus[]; searchTerm?: string } = {};
      if (statusFilter) {
        filters.status = [statusFilter as CampaignStatus];
      }
      if (searchValue.trim()) {
        filters.searchTerm = searchValue.trim();
      }

      const result = await getFilteredCampaigns(filters, {
        page: currentPage,
        limit: itemsPerPage,
        orderBy: 'createdAt',
        orderDirection: 'desc',
      });

      setCampaigns(result.campaigns);
      setTotalPages(result.totalPages);
      setTotalResults(result.total);
    } catch (error) {
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
    const nextSearchTerm = searchTerm.trim();

    if (currentPage !== 1) {
      setAppliedSearchTerm(nextSearchTerm);
      setCurrentPage(1);
      return;
    }

    if (nextSearchTerm !== appliedSearchTerm) {
      setAppliedSearchTerm(nextSearchTerm);
      return;
    }

    void loadCampaigns(nextSearchTerm);
  };

  const handleDelete = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Supprimer la campagne "${campaignName}" ?`)) {
      return;
    }

    try {
      await deleteCampaign(campaignId);
      notifications.show({
        title: 'Succes',
        message: 'Campagne supprimee',
        color: 'green',
      });
      await loadCampaigns();
    } catch (error) {
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
      await cancelCampaign(campaignId, 'admin-id', reason);
      notifications.show({
        title: 'Succes',
        message: 'Campagne annulee',
        color: 'green',
      });
      await loadCampaigns();
    } catch (error) {
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
      scheduled: { label: 'Planifiee', color: 'blue' },
      sending: { label: 'En cours', color: 'orange' },
      sent: { label: 'Envoyee', color: 'green' },
      cancelled: { label: 'Annulee', color: 'red' },
    };

    const config = statusConfig[status];
    return (
      <Badge color={config.color} variant="light" size="sm" fw={600}>
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

  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} />

      <Stack gap="xl">
        <Group justify="space-between" align="center" wrap="wrap">
          <Box>
            <Title order={1} size="h2" mb={4}>Campagnes Email</Title>
            <Text c="dimmed" size="sm">Gerez vos communications et analysez leurs performances</Text>
          </Box>
          <Button
            leftSection={<IconPlus size={18} />}
            onClick={() => navigate('/admin/campaigns/create')}
            radius="md"
          >
            Créer une campagne
          </Button>
        </Group>

        {/* Global KPIs (Current Page Context) */}
        <SimpleGrid cols={{ base: 1, sm: 1, lg: 1 }} spacing="md">
          <Paper withBorder p="md" radius="md" shadow="sm">
            <Group align="flex-start" justify="space-between">
              <div>
                <Text c="dimmed" size="xs" tt="uppercase" fw={700}>Total Campagnes</Text>
                <Text fw={700} size="xl">{totalResults}</Text>
              </div>
              <ThemeIcon variant="light" color="blue" size="lg" radius="md">
                <IconChartBar size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Search & Filters */}
        <Paper withBorder p="md" radius="md" shadow="sm">
          <Flex gap="md" wrap="wrap" align="center">
            <TextInput
              placeholder="Rechercher une campagne..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              style={{ flex: 1, minWidth: 260 }}
              radius="md"
            />
            <Select
              placeholder="Filtrer par statut"
              data={[
                { value: '', label: 'Tous les statuts' },
                { value: 'draft', label: 'Brouillon' },
                { value: 'scheduled', label: 'Planifiée' },
                { value: 'sending', label: 'En cours' },
                { value: 'sent', label: 'Envoyée' },
                { value: 'cancelled', label: 'Annulée' },
              ]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value || '');
                setCurrentPage(1);
              }}
              clearable
              radius="md"
              style={{ width: 200 }}
            />
            <Button variant="light" onClick={handleSearch} radius="md">
              Rechercher
            </Button>
          </Flex>
        </Paper>

        {/* Table View */}
        <Paper withBorder radius="md" shadow="sm" style={{ overflow: 'hidden' }}>
          {campaigns.length > 0 ? (
            <Table.ScrollContainer minWidth={800}>
              <Table verticalSpacing="sm" horizontalSpacing="md" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nom de la campagne</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Audience</Table.Th>
                    <Table.Th>Livraison</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {campaigns.map((campaign) => {
                    const audience =
                      campaign.stats.totalRecipients || campaign.targeting.estimatedRecipients || 0;
                    const deliveryProgress = audience > 0 ? (campaign.stats.sent / audience) * 100 : 0;

                    return (
                      <Table.Tr 
                        key={campaign.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                      >
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">{campaign.name}</Text>
                            <Text size="xs" c="dimmed" lineClamp={1} title={campaign.content.subject}>
                              {campaign.content.subject}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          {getStatusBadge(campaign.status)}
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={500} size="sm">{audience.toLocaleString('fr-FR')}</Text>
                            <Text size="xs" c="dimmed">{campaign.stats.sent.toLocaleString('fr-FR')} envoyés</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Box w={140}>
                            <Group justify="space-between" mb={4}>
                              <Text size="xs" fw={500}>
                                {campaign.status === 'sent' ? '100% env.' : 'En attente'}
                              </Text>
                            </Group>
                            <Progress 
                              value={campaign.status === 'sent' || campaign.status === 'sending' ? deliveryProgress : 0} 
                              color={campaign.status === 'sent' ? 'green' : 'blue'}
                              size="xs" 
                              radius="xl" 
                            />
                          </Box>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(campaign.sentAt || campaign.scheduledAt || campaign.createdAt)}</Text>
                        </Table.Td>
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <Group gap="xs" justify="flex-end">
                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                               <Button
                                size="xs"
                                variant="light"
                                color="blue"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/campaigns/${campaign.id}`);
                                }}
                              >
                                Ouvrir pour envoyer
                              </Button>
                            )}

                            {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                              <ActionIcon
                                variant="subtle"
                                color="yellow"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/campaigns/${campaign.id}/edit`);
                                }}
                                title="Modifier"
                              >
                                <IconEdit size={18} />
                              </ActionIcon>
                            )}

                            <Menu position="bottom-end" shadow="md">
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
                                  <IconDots size={18} />
                                </ActionIcon>
                              </Menu.Target>

                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconEye size={16} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/campaigns/${campaign.id}`);
                                  }}
                                >
                                  Voir les détails
                                </Menu.Item>

                                {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                                  <>
                                    <Menu.Item
                                      leftSection={<IconEdit size={16} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/admin/campaigns/${campaign.id}/edit`);
                                      }}
                                    >
                                      Modifier
                                    </Menu.Item>
                                    <Menu.Item
                                      leftSection={<IconCopy size={16} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        notifications.show({
                                          title: 'Info',
                                          message: 'Duplication à venir',
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancel(campaign.id, campaign.name);
                                    }}
                                  >
                                    Annuler l'envoi
                                  </Menu.Item>
                                )}

                                {campaign.status === 'draft' && (
                                  <>
                                    <Menu.Divider />
                                    <Menu.Item
                                      leftSection={<IconTrash size={16} />}
                                      color="red"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(campaign.id, campaign.name);
                                      }}
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
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Stack align="center" py={50} gap="md">
              <ThemeIcon size={72} radius="100%" variant="light" color="gray">
                <IconMail size={34} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                {searchTerm || statusFilter ? 'Aucune campagne trouvée' : 'Aucune campagne pour le moment'}
              </Text>
              <Text c="dimmed" size="sm" ta="center" maw={400}>
                Commencez par créer votre première campagne email pour toucher votre audience.
              </Text>
            </Stack>
          )}
        </Paper>

        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
              radius="md"
              withEdges
            />
          </Group>
        )}
      </Stack>
    </Box>
  );
}
