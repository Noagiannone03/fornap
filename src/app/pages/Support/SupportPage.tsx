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
  Box,
  Tooltip,
} from '@mantine/core';
import {
  IconPlus,
  IconEye,
  IconTicket,
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
  IconMessage,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getUserTickets } from '../../../shared/services/ticketService';
import type { Ticket } from '../../../shared/types/ticket';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_COLORS,
  TICKET_TYPE_COLORS,
} from '../../../shared/types/ticket';

export function SupportPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      if (!currentUser?.uid) return;
      try {
        const userTickets = await getUserTickets(currentUser.uid);
        setTickets(userTickets);
      } catch (error) {
        console.error('Error loading tickets:', error);
      } finally {
        setLoading(false);
      }
    }
    loadTickets();
  }, [currentUser?.uid]);

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
        return <IconAlertCircle size={16} />;
      case 'in_progress':
        return <IconClock size={16} />;
      case 'waiting_for_user':
        return <IconMessage size={16} />;
      case 'resolved':
      case 'closed':
        return <IconCircleCheck size={16} />;
      default:
        return <IconTicket size={16} />;
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" py={40}>
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} size={32} fw={900}>
              Support
            </Title>
            <Text c="dimmed" size="lg" mt={4}>
              Gérez vos demandes de support et suivez leur avancement
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            size="md"
            color="dark"
            onClick={() => navigate('/dashboard/support/new')}
            styles={{
              root: {
                borderRadius: '12px',
                fontWeight: 700,
              },
            }}
          >
            Nouvelle demande
          </Button>
        </Group>

        {/* Statistiques rapides */}
        <Group gap="md">
          <Paper p="md" withBorder style={{ borderRadius: '12px', flex: 1 }}>
            <Group>
              <ThemeIcon size={40} radius="md" color="blue" variant="light">
                <IconTicket size={20} />
              </ThemeIcon>
              <div>
                <Text size="xl" fw={700}>
                  {tickets.length}
                </Text>
                <Text size="sm" c="dimmed">
                  Total tickets
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper p="md" withBorder style={{ borderRadius: '12px', flex: 1 }}>
            <Group>
              <ThemeIcon size={40} radius="md" color="orange" variant="light">
                <IconClock size={20} />
              </ThemeIcon>
              <div>
                <Text size="xl" fw={700}>
                  {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
                </Text>
                <Text size="sm" c="dimmed">
                  En cours
                </Text>
              </div>
            </Group>
          </Paper>
          <Paper p="md" withBorder style={{ borderRadius: '12px', flex: 1 }}>
            <Group>
              <ThemeIcon size={40} radius="md" color="red" variant="light">
                <IconMessage size={20} />
              </ThemeIcon>
              <div>
                <Text size="xl" fw={700}>
                  {tickets.filter(t => t.hasUnreadForUser).length}
                </Text>
                <Text size="sm" c="dimmed">
                  Non lus
                </Text>
              </div>
            </Group>
          </Paper>
        </Group>

        {/* Liste des tickets */}
        <Paper p="xl" withBorder style={{ borderRadius: '16px' }}>
          {tickets.length === 0 ? (
            <Center py={60}>
              <Stack align="center" gap="md">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconTicket size={30} />
                </ThemeIcon>
                <Text size="lg" fw={500} c="dimmed">
                  Aucune demande de support
                </Text>
                <Text size="sm" c="dimmed" ta="center" maw={400}>
                  Vous n'avez pas encore créé de demande de support.
                  Cliquez sur "Nouvelle demande" pour en créer une.
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  mt="md"
                  color="dark"
                  onClick={() => navigate('/dashboard/support/new')}
                >
                  Créer ma première demande
                </Button>
              </Stack>
            </Center>
          ) : (
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Ticket</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Priorité</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tickets.map((ticket) => (
                  <Table.Tr
                    key={ticket.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/support/${ticket.id}`)}
                  >
                    <Table.Td>
                      <Group gap="xs">
                        {ticket.hasUnreadForUser && (
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
                          <Text size="xs" c="dimmed" lineClamp={1} maw={250}>
                            {ticket.subject}
                          </Text>
                        </div>
                      </Group>
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
                      <Text size="sm" c="dimmed">
                        {formatDate(ticket.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end">
                        <Tooltip label="Voir le ticket">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/support/${ticket.id}`);
                            }}
                          >
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
