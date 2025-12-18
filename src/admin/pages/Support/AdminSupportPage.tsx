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
    IconRefresh,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { getAdminTickets } from '../../../shared/services/ticketService';
import type { Ticket } from '../../../shared/types/ticket';
import {
    TICKET_TYPE_LABELS,
    TICKET_STATUS_LABELS,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUS_COLORS,
    TICKET_PRIORITY_COLORS,
    TICKET_TYPE_COLORS,
} from '../../../shared/types/ticket';

/**
 * Page pour que les admins puissent voir leurs propres tickets de support
 * et en créer de nouveaux pour signaler des problèmes avec le panel admin
 */
export function AdminSupportPage() {
    const navigate = useNavigate();
    const { adminProfile } = useAdminAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTickets();
    }, [adminProfile?.uid]);

    async function loadTickets() {
        if (!adminProfile?.uid) return;
        setLoading(true);
        try {
            const adminTickets = await getAdminTickets(adminProfile.uid);
            setTickets(adminTickets);
        } catch (error) {
            console.error('Error loading admin tickets:', error);
        } finally {
            setLoading(false);
        }
    }

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
        <Container size="xl" py="xl">
            <Stack gap="xl">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Title order={1} size={28} fw={900}>
                            Mes Demandes de Support
                        </Title>
                        <Text c="dimmed" size="md" mt={4}>
                            Signalez des problèmes ou demandez de l'aide concernant le panel admin
                        </Text>
                    </div>
                    <Group>
                        <Button
                            leftSection={<IconRefresh size={16} />}
                            variant="outline"
                            onClick={loadTickets}
                            loading={loading}
                        >
                            Actualiser
                        </Button>
                        <Button
                            leftSection={<IconPlus size={18} />}
                            size="md"
                            color="indigo"
                            onClick={() => navigate('/admin/support/new')}
                        >
                            Nouvelle demande
                        </Button>
                    </Group>
                </Group>

                {/* Stats rapides */}
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
                                    Total demandes
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
                                    Nouvelles réponses
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
                                    Cliquez sur "Nouvelle demande" si vous rencontrez un problème avec le panel admin.
                                </Text>
                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    mt="md"
                                    color="indigo"
                                    onClick={() => navigate('/admin/support/new')}
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
                                        onClick={() => navigate(`/admin/support/${ticket.id}`)}
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
                                                            navigate(`/admin/support/${ticket.id}`);
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
