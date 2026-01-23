import {
    Table,
    Text,
    Badge,
    Group,
    Avatar,
    ActionIcon,
    Tooltip,
    Paper,
    Center,
    Stack,
    ThemeIcon,
    Box,
} from '@mantine/core';
import {
    IconEye,
    IconTrash,
    IconTicket,
    IconAlertCircle,
    IconClock,
    IconMessage,
    IconCircleCheck,
} from '@tabler/icons-react';
import {
    TICKET_TYPE_LABELS,
    TICKET_STATUS_LABELS,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUS_COLORS,
    TICKET_PRIORITY_COLORS,
    TICKET_TYPE_COLORS,
} from '../../../../shared/types/ticket';
import type { Ticket } from '../../../../shared/types/ticket';

interface TicketsTableProps {
    tickets: Ticket[];
    loading: boolean;
    onView: (id: string) => void;
    onDelete?: (ticket: Ticket) => void;
}

export function TicketsTable({ tickets, loading, onView, onDelete }: TicketsTableProps) {

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <IconAlertCircle size={14} />;
            case 'in_progress': return <IconClock size={14} />;
            case 'waiting_for_user': return <IconMessage size={14} />;
            case 'resolved':
            case 'closed': return <IconCircleCheck size={14} />;
            default: return <IconTicket size={14} />;
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        // Handle Firestore Timestamp or Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <Paper p="xl" withBorder radius="md">
                <Center>Loading...</Center> {/* Placeholder, parent usually handles loader overlay */}
            </Paper>
        );
    }

    if (tickets.length === 0) {
        return (
            <Paper p="xl" withBorder radius="md" bg="gray.0">
                <Center py={40}>
                    <Stack align="center" gap="md">
                        <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                            <IconTicket size={30} />
                        </ThemeIcon>
                        <Text size="lg" fw={500} c="dimmed">
                            Aucun ticket trouvé
                        </Text>
                        <Text size="sm" c="dimmed">
                            Modifiez vos filtres ou attendez de nouvelles demandes.
                        </Text>
                    </Stack>
                </Center>
            </Paper>
        );
    }

    return (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            <Table.ScrollContainer minWidth={900}>
                <Table highlightOnHover verticalSpacing="sm" striped>
                    <Table.Thead bg="gray.0">
                        <Table.Tr>
                            <Table.Th style={{ width: 100 }}>ID</Table.Th>
                            <Table.Th>Sujet</Table.Th>
                            <Table.Th>Demandeur</Table.Th>
                            <Table.Th>État</Table.Th>
                            <Table.Th>Détails</Table.Th>
                            <Table.Th ta="right">Mise à jour</Table.Th>
                            <Table.Th style={{ width: 80 }}></Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {tickets.map((ticket) => (
                            <Table.Tr
                                key={ticket.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => onView(ticket.id)}
                            >
                                <Table.Td>
                                    <Group gap="xs">
                                        {ticket.hasUnreadForAdmin && (
                                            <Tooltip label="Nouveau message">
                                                <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: 'var(--mantine-color-red-6)' }} />
                                            </Tooltip>
                                        )}
                                        <Text size="xs" fw={700} c="dimmed">#{ticket.ticketNumber}</Text>
                                    </Group>
                                </Table.Td>

                                <Table.Td>
                                    <Text size="sm" fw={600} lineClamp={1}>
                                        {ticket.subject}
                                    </Text>
                                </Table.Td>

                                <Table.Td>
                                    <Group gap="xs">
                                        <Avatar size="sm" radius="xl" color="blue">
                                            {ticket.userName.charAt(0)}
                                        </Avatar>
                                        <div>
                                            <Text size="sm" fw={500}>{ticket.userName}</Text>
                                            <Text size="xs" c="dimmed">{ticket.userEmail}</Text>
                                        </div>
                                    </Group>
                                </Table.Td>

                                <Table.Td>
                                    <Badge
                                        size="sm"
                                        variant="light"
                                        color={TICKET_STATUS_COLORS[ticket.status]}
                                        leftSection={getStatusIcon(ticket.status)}
                                    >
                                        {TICKET_STATUS_LABELS[ticket.status]}
                                    </Badge>
                                </Table.Td>

                                <Table.Td>
                                    <Group gap={4}>
                                        <Badge size="xs" variant="outline" color={TICKET_PRIORITY_COLORS[ticket.priority]}>
                                            {TICKET_PRIORITY_LABELS[ticket.priority]}
                                        </Badge>
                                        <Badge size="xs" variant="dot" color={TICKET_TYPE_COLORS[ticket.type]}>
                                            {TICKET_TYPE_LABELS[ticket.type]}
                                        </Badge>
                                    </Group>
                                </Table.Td>

                                <Table.Td ta="right">
                                    <Text size="sm" c="dimmed">
                                        {formatDate(ticket.updatedAt || ticket.createdAt)}
                                    </Text>
                                </Table.Td>

                                <Table.Td>
                                    <Group gap="xs" justify="flex-end" onClick={(e) => e.stopPropagation()}>
                                        <ActionIcon variant="transparent" color="gray">
                                            <IconEye size={16} />
                                        </ActionIcon>
                                        {onDelete && (
                                            <ActionIcon
                                                variant="transparent"
                                                color="red"
                                                onClick={(e) => { e.stopPropagation(); onDelete(ticket); }}
                                            >
                                                <IconTrash size={16} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Paper>
    );
}
