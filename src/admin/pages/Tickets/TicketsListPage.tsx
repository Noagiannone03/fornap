import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Badge,
  Button,
  Table,
  ActionIcon,
  Loader,
  Center,
  ThemeIcon,
  TextInput,
  Select,
  MultiSelect,
  Menu,
  Tooltip,
  Box,
  Grid,
  Card,
} from '@mantine/core';
import {
  IconEye,
  IconTicket,
  IconSearch,
  IconFilter,
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
  IconMessage,
  IconRefresh,
  IconChevronDown,
  IconTrash,
  IconUserCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import {
  getAllTickets,
  getTicketStats,
  deleteTicket,
} from '../../../shared/services/ticketService';
import type { Ticket, TicketStats, TicketFilters } from '../../../shared/types/ticket';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_COLORS,
  TICKET_TYPE_COLORS,
  TicketStatus,
  TicketType,
  TicketPriority,
} from '../../../shared/types/ticket';
import { AdminPermission, ROLE_PERMISSIONS } from '../../../shared/types/admin';

export function TicketsListPage() {
  const navigate = useNavigate();
  const { adminUser, checkPermission } = useAdminAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

  const canChangeStatus = checkPermission(AdminPermission.TICKETS_CHANGE_STATUS);
  const canDelete = checkPermission(AdminPermission.TICKETS_DELETE);
  const canRespond = checkPermission(AdminPermission.TICKETS_RESPOND);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, priorityFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const filters: TicketFilters = {};
      if (statusFilter.length > 0) filters.status = statusFilter as TicketStatus[];
      if (typeFilter.length > 0) filters.type = typeFilter as TicketType[];
      if (priorityFilter.length > 0) filters.priority = priorityFilter as TicketPriority[];

      const [ticketsData, statsData] = await Promise.all([
        getAllTickets(filters),
        getTicketStats(),
      ]);

      setTickets(ticketsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors du chargement des tickets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (ticket: Ticket) => {
    if (!canDelete) return;
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le ticket ${ticket.ticketNumber} ?`)) return;

    try {
      await deleteTicket(ticket.id);
      notifications.show({
        title: 'Ticket supprimé',
        message: `Le ticket ${ticket.ticketNumber} a été supprimé`,
        color: 'green',
      });
      loadData();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <IconAlertCircle size={14} />;
      case 'in_progress':
        return <IconClock size={14} />;
      case 'waiting_for_user':
        return <IconMessage size={14} />;
      case 'resolved':
      case 'closed':
        return <IconCircleCheck size={14} />;
      default:
        return <IconTicket size={14} />;
    }
  };

  // Filtrer par recherche côté client
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      ticket.ticketNumber.toLowerCase().includes(search) ||
      ticket.subject.toLowerCase().includes(search) ||
      ticket.userName.toLowerCase().includes(search) ||
      ticket.userEmail.toLowerCase().includes(search)
    );
  });

  const statusOptions = Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const typeOptions = Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} size={28} fw={900}>
              Tickets de Support
            </Title>
            <Text c="dimmed" size="md" mt={4}>
              Gérez les demandes de support des utilisateurs
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="outline"
            onClick={loadData}
            loading={loading}
          >
            Actualiser
          </Button>
        </Group>

        {/* Stats Cards */}
        {stats && (
          <Grid>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Card padding="md" radius="md" withBorder>
                <Group>
                  <ThemeIcon size={40} radius="md" color="blue" variant="light">
                    <IconTicket size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xl" fw={700}>{stats.total}</Text>
                    <Text size="xs" c="dimmed">Total tickets</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Card padding="md" radius="md" withBorder>
                <Group>
                  <ThemeIcon size={40} radius="md" color="orange" variant="light">
                    <IconClock size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xl" fw={700}>{stats.openTickets}</Text>
                    <Text size="xs" c="dimmed">En cours</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Card padding="md" radius="md" withBorder>
                <Group>
                  <ThemeIcon size={40} radius="md" color="red" variant="light">
                    <IconMessage size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xl" fw={700}>{stats.unreadCount}</Text>
                    <Text size="xs" c="dimmed">Non lus</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 6, sm: 3 }}>
              <Card padding="md" radius="md" withBorder>
                <Group>
                  <ThemeIcon size={40} radius="md" color="green" variant="light">
                    <IconCircleCheck size={20} />
                  </ThemeIcon>
                  <div>
                    <Text size="xl" fw={700}>{stats.resolvedThisWeek}</Text>
                    <Text size="xs" c="dimmed">Résolus (7j)</Text>
                  </div>
                </Group>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Filters */}
        <Paper p="md" withBorder radius="md">
          <Group gap="md" wrap="wrap">
            <TextInput
              placeholder="Rechercher..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <MultiSelect
              placeholder="Statut"
              data={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              style={{ minWidth: 180 }}
            />
            <MultiSelect
              placeholder="Type"
              data={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              clearable
              style={{ minWidth: 180 }}
            />
            <MultiSelect
              placeholder="Priorité"
              data={priorityOptions}
              value={priorityFilter}
              onChange={setPriorityFilter}
              clearable
              style={{ minWidth: 150 }}
            />
          </Group>
        </Paper>

        {/* Table */}
        <Paper p="md" withBorder radius="md">
          {loading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : filteredTickets.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconTicket size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  Aucun ticket trouvé
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  {searchQuery || statusFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0
                    ? 'Essayez de modifier vos filtres'
                    : 'Aucune demande de support pour le moment'}
                </Text>
              </Stack>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Ticket</Table.Th>
                    <Table.Th>Utilisateur</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Priorité</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Messages</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th ta="right">Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredTickets.map((ticket) => (
                    <Table.Tr
                      key={ticket.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                    >
                      <Table.Td>
                        <Group gap="xs">
                          {ticket.hasUnreadForAdmin && (
                            <Box
                              w={8}
                              h={8}
                              style={{ borderRadius: '50%', backgroundColor: '#ff4757' }}
                            />
                          )}
                          <div>
                            <Text size="sm" fw={600}>
                              {ticket.ticketNumber}
                            </Text>
                            <Text size="xs" c="dimmed" lineClamp={1} maw={200}>
                              {ticket.subject}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>
                            {ticket.userName}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {ticket.userEmail}
                          </Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={TICKET_TYPE_COLORS[ticket.type]}
                          variant="light"
                          size="sm"
                        >
                          {TICKET_TYPE_LABELS[ticket.type]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={TICKET_PRIORITY_COLORS[ticket.priority]}
                          variant="light"
                          size="sm"
                        >
                          {TICKET_PRIORITY_LABELS[ticket.priority]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={TICKET_STATUS_COLORS[ticket.status]}
                          variant="light"
                          size="sm"
                          leftSection={getStatusIcon(ticket.status)}
                        >
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{ticket.messageCount}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {formatDate(ticket.createdAt)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" onClick={(e) => e.stopPropagation()}>
                          <Tooltip label="Voir le ticket">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          {canDelete && (
                            <Tooltip label="Supprimer">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => handleDelete(ticket)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
