import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Badge,
  ActionIcon,
  Menu,
  Avatar,
  Text,
  Pagination,
  LoadingOverlay,
  Stack,
  Grid,
  Card,
} from '@mantine/core';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconEye,
  IconCopy,
  IconCalendar,
  IconMapPin,
  IconTicket,
  IconCurrencyEuro,
  IconCheck,
  IconX,
  IconStar,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  getAllEventsForList,
  deleteEvent,
  cancelEvent,
  toggleEventActive,
  toggleEventFeatured,
  duplicateEvent,
} from '../../../shared/services/eventService';
import type { EventListItem, EventStatus } from '../../../shared/types/event';
import {
  EVENT_TYPE_LABELS,
  EVENT_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
} from '../../../shared/types/event';

export function EventsListPage() {
  const navigate = useNavigate();

  // Data
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Load events
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllEventsForList();
      setEvents(data);
      setFilteredEvents(data);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les événements',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...events];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((event) => event.title.toLowerCase().includes(searchLower));
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((event) => event.type === typeFilter);
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((event) => event.status === statusFilter);
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter((event) => event.isActive);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter((event) => !event.isActive);
    }

    setFilteredEvents(filtered);
    setPage(1);
  }, [search, typeFilter, statusFilter, activeFilter, events]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Actions
  const handleCreateEvent = () => {
    navigate('/admin/events/create');
  };

  const handleViewEvent = (eventId: string) => {
    navigate(`/admin/events/${eventId}`);
  };

  const handleEditEvent = (eventId: string) => {
    navigate(`/admin/events/${eventId}/edit`);
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    modals.openConfirmModal({
      title: 'Supprimer l\'événement',
      children: (
        <Text size="sm">
          Êtes-vous sûr de vouloir supprimer l'événement "{title}" ? Cette action est irréversible.
        </Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteEvent(eventId);
          notifications.show({
            title: 'Succès',
            message: 'Événement supprimé avec succès',
            color: 'green',
          });
          loadEvents();
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Impossible de supprimer l\'événement',
            color: 'red',
          });
        }
      },
    });
  };

  const handleCancelEvent = (eventId: string, title: string) => {
    modals.openConfirmModal({
      title: 'Annuler l\'événement',
      children: (
        <Stack>
          <Text size="sm">
            Êtes-vous sûr de vouloir annuler l'événement "{title}" ?
          </Text>
          <TextInput
            label="Raison de l'annulation"
            placeholder="Ex: Conditions météo défavorables"
            id="cancellation-reason"
          />
        </Stack>
      ),
      labels: { confirm: 'Annuler l\'événement', cancel: 'Retour' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const reason =
          (document.getElementById('cancellation-reason') as HTMLInputElement)?.value ||
          'Non spécifié';
        try {
          await cancelEvent(eventId, reason, 'admin');
          notifications.show({
            title: 'Succès',
            message: 'Événement annulé avec succès',
            color: 'green',
          });
          loadEvents();
        } catch (error) {
          notifications.show({
            title: 'Erreur',
            message: 'Impossible d\'annuler l\'événement',
            color: 'red',
          });
        }
      },
    });
  };

  const handleToggleActive = async (eventId: string, isActive: boolean) => {
    try {
      await toggleEventActive(eventId, !isActive);
      notifications.show({
        title: 'Succès',
        message: `Événement ${!isActive ? 'activé' : 'désactivé'} avec succès`,
        color: 'green',
      });
      loadEvents();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de modifier le statut de l\'événement',
        color: 'red',
      });
    }
  };

  const handleToggleFeatured = async (eventId: string, isFeatured: boolean) => {
    try {
      await toggleEventFeatured(eventId, !isFeatured);
      notifications.show({
        title: 'Succès',
        message: `Événement ${!isFeatured ? 'mis en avant' : 'retiré de la mise en avant'}`,
        color: 'green',
      });
      loadEvents();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de modifier la mise en avant',
        color: 'red',
      });
    }
  };

  const handleDuplicateEvent = async (eventId: string, title: string) => {
    try {
      const newEventId = await duplicateEvent(eventId, 'admin');
      notifications.show({
        title: 'Succès',
        message: `Événement "${title}" dupliqué avec succès`,
        color: 'green',
      });
      loadEvents();
      navigate(`/admin/events/${newEventId}/edit`);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de dupliquer l\'événement',
        color: 'red',
      });
    }
  };

  // Status colors
  const getStatusColor = (status: EventStatus): string => {
    const colors: Record<EventStatus, string> = {
      draft: 'gray',
      published: 'blue',
      ongoing: 'green',
      completed: 'teal',
      cancelled: 'red',
    };
    return colors[status] || 'gray';
  };

  // Stats
  const stats = {
    total: events.length,
    active: events.filter((e) => e.isActive && e.status === 'published').length,
    upcoming: events.filter(
      (e) => e.status === 'published' && e.startDate.toDate() > new Date()
    ).length,
    draft: events.filter((e) => e.status === 'draft').length,
    totalRevenue: events.reduce((sum, e) => sum + e.totalRevenue, 0),
    totalSold: events.reduce((sum, e) => sum + e.totalSold, 0),
  };

  return (
    <Container size="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Événements</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreateEvent}>
          Créer un événement
        </Button>
      </Group>

      {/* Stats Cards */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Total événements
                </Text>
                <Text size="xl" fw={700}>
                  {stats.total}
                </Text>
              </div>
              <IconCalendar size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Billets vendus
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalSold}
                </Text>
              </div>
              <IconTicket size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Revenus totaux
                </Text>
                <Text size="xl" fw={700}>
                  {stats.totalRevenue.toLocaleString()}€
                </Text>
              </div>
              <IconCurrencyEuro size={32} opacity={0.5} />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filters */}
      <Paper p="md" radius="md" withBorder mb="md">
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <TextInput
              placeholder="Rechercher un événement..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="Type"
              clearable
              data={Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="Statut"
              clearable
              data={Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              placeholder="État"
              clearable
              data={[
                { value: 'active', label: 'Actifs' },
                { value: 'inactive', label: 'Inactifs' },
              ]}
              value={activeFilter}
              onChange={setActiveFilter}
            />
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper p="md" radius="md" withBorder style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Événement</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Lieu</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th>Billets</Table.Th>
              <Table.Th>Revenus</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedEvents.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text ta="center" c="dimmed">
                    Aucun événement trouvé
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              paginatedEvents.map((event) => (
                <Table.Tr key={event.id}>
                  <Table.Td>
                    <Group gap="sm">
                      {event.coverImage && (
                        <Avatar src={event.coverImage} radius="sm" size="md" />
                      )}
                      <div>
                        <Group gap={4}>
                          <Text size="sm" fw={500}>
                            {event.title}
                          </Text>
                          {event.isFeatured && (
                            <IconStar size={14} style={{ color: 'gold' }} />
                          )}
                        </Group>
                        {!event.isActive && (
                          <Badge size="xs" color="gray">
                            Inactif
                          </Badge>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{EVENT_TYPE_LABELS[event.type]}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{event.startDate.toDate().toLocaleDateString('fr-FR')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <IconMapPin size={14} opacity={0.5} />
                      <Text size="sm">
                        {event.location.city || LOCATION_TYPE_LABELS[event.location.type]}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getStatusColor(event.status)}>
                      {EVENT_STATUS_LABELS[event.status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {event.totalSold} / {event.totalCapacity}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {event.totalCapacity > 0
                        ? `${Math.round((event.totalSold / event.totalCapacity) * 100)}%`
                        : '0%'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {event.totalRevenue.toLocaleString()}€
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleViewEvent(event.id)}
                      >
                        <IconEye size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => handleEditEvent(event.id)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <Menu>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconCopy size={14} />}
                            onClick={() => handleDuplicateEvent(event.id, event.title)}
                          >
                            Dupliquer
                          </Menu.Item>
                          <Menu.Item
                            leftSection={event.isActive ? <IconX size={14} /> : <IconCheck size={14} />}
                            onClick={() => handleToggleActive(event.id, event.isActive)}
                          >
                            {event.isActive ? 'Désactiver' : 'Activer'}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconStar size={14} />}
                            onClick={() => handleToggleFeatured(event.id, event.isFeatured)}
                          >
                            {event.isFeatured ? 'Retirer de la mise en avant' : 'Mettre en avant'}
                          </Menu.Item>
                          {event.status !== 'cancelled' && event.status !== 'completed' && (
                            <Menu.Item
                              color="orange"
                              leftSection={<IconX size={14} />}
                              onClick={() => handleCancelEvent(event.id, event.title)}
                            >
                              Annuler l'événement
                            </Menu.Item>
                          )}
                          <Menu.Divider />
                          <Menu.Item
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                          >
                            Supprimer
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination value={page} onChange={setPage} total={totalPages} />
          </Group>
        )}
      </Paper>
    </Container>
  );
}
