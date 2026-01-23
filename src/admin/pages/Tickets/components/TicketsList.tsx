import {
    Paper,
    Text,
    Badge,
    Group,
    Avatar,
    Stack,
    ThemeIcon,
    TextInput,
    ActionIcon,
    Center,
    Loader,
    Card,
    Indicator,
    Box,
} from '@mantine/core';
import {
    IconSearch,
    IconTicket,
    IconClock,
    IconRefresh,
    IconChevronRight,
} from '@tabler/icons-react';
import {
    TICKET_PRIORITY_COLORS,
    TICKET_TYPE_COLORS,
    TICKET_TYPE_LABELS,
} from '../../../../shared/types/ticket';
import type { Ticket } from '../../../../shared/types/ticket';

interface TicketsListProps {
    tickets: Ticket[];
    loading: boolean;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onRefresh: () => void;
    onViewTicket: (id: string) => void;
}

export function TicketsList({ tickets, loading, searchQuery, onSearchChange, onRefresh, onViewTicket }: TicketsListProps) {

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 24 * 60 * 60 * 1000) {
            return Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
        }
        return Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
    };

    return (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Modern Search Bar */}
            <Paper
                radius="xl"
                p="xs"
                mb="md"
                bg="white"
                style={{
                    border: '1px solid var(--mantine-color-gray-2)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    flexShrink: 0,
                }}
            >
                <Group gap="xs" px="xs">
                    <IconSearch size={18} color="var(--mantine-color-gray-5)" />
                    <TextInput
                        placeholder="Rechercher dans les tickets..."
                        variant="unstyled"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.currentTarget.value)}
                        style={{ flex: 1 }}
                        size="md"
                    />
                    <ActionIcon variant="light" color="blue" onClick={onRefresh} loading={loading} radius="xl" size="lg">
                        <IconRefresh size={18} />
                    </ActionIcon>
                </Group>
            </Paper>

            {/* Scrollable List Content */}
            <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {loading ? (
                    <Center py={60}><Loader type="bars" size="sm" color="blue" /></Center>
                ) : tickets.length === 0 ? (
                    <Center py={80}>
                        <Stack align="center" gap="md">
                            <ThemeIcon size={80} radius="xl" color="gray" variant="light" style={{ opacity: 0.5 }}>
                                <IconTicket size={40} />
                            </ThemeIcon>
                            <Text c="dimmed" size="lg" fw={500}>C'est calme ici</Text>
                            <Text c="dimmed" size="sm">Aucun ticket a afficher pour le moment.</Text>
                        </Stack>
                    </Center>
                ) : (
                    <Stack gap="sm" pb="xl">
                        {tickets.map((ticket) => {
                            const isWaitingForUser = ticket.status === 'waiting_for_user';
                            const isUnread = ticket.hasUnreadForAdmin;

                            return (
                                <Card
                                    key={ticket.id}
                                    padding="lg"
                                    radius="md"
                                    withBorder
                                    style={(theme) => ({
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                        borderColor: isUnread ? theme.colors.blue[2] : theme.colors.gray[2],
                                        backgroundColor: isWaitingForUser ? theme.colors.orange[0] : 'white',
                                    })}
                                    onClick={() => onViewTicket(ticket.id)}
                                >
                                    <Group wrap="nowrap" align="flex-start">
                                        {/* Avatar Column */}
                                        <Indicator
                                            inline
                                            size={14}
                                            offset={4}
                                            position="bottom-end"
                                            color={isUnread ? 'red' : 'transparent'}
                                            withBorder
                                        >
                                            <Avatar radius="md" size="lg" color="blue">
                                                {ticket.userName.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </Indicator>

                                        {/* Content Column */}
                                        <Stack gap={6} style={{ flex: 1 }}>
                                            <Group justify="space-between" align="flex-start">
                                                <div>
                                                    <Text size="md" fw={700} c="dark.9" lh={1.2}>
                                                        {ticket.subject}
                                                    </Text>
                                                    <Text size="sm" c="dimmed" mt={2}>
                                                        {ticket.userName} <Text span size="xs" c="gray.5">• #{ticket.ticketNumber}</Text>
                                                    </Text>
                                                </div>
                                                <Text size="xs" c="dimmed" fw={500} bg="gray.1" px={6} py={2} style={{ borderRadius: 4 }}>
                                                    {formatDate(ticket.updatedAt || ticket.createdAt)}
                                                </Text>
                                            </Group>

                                            <Group mt={4} justify="space-between" align="center">
                                                <Group gap={6}>
                                                    {isWaitingForUser && (
                                                        <Badge color="orange" variant="filled" size="sm" leftSection={<IconClock size={12} />}>
                                                            Attente reponse
                                                        </Badge>
                                                    )}

                                                    <Badge size="sm" variant="light" color={TICKET_TYPE_COLORS[ticket.type]} style={{ textTransform: 'capitalize' }}>
                                                        {TICKET_TYPE_LABELS[ticket.type]}
                                                    </Badge>

                                                    <Badge size="sm" variant="outline" color={TICKET_PRIORITY_COLORS[ticket.priority]}>
                                                        {ticket.priority}
                                                    </Badge>
                                                </Group>

                                                <ThemeIcon variant="subtle" color="gray" size="sm">
                                                    <IconChevronRight size={16} />
                                                </ThemeIcon>
                                            </Group>
                                        </Stack>
                                    </Group>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
