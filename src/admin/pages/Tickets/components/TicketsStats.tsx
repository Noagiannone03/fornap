import { SimpleGrid, Paper, Text, Group, Stack, ThemeIcon } from '@mantine/core';
import {
    IconInbox,
    IconClock,
    IconMessageCircle,
    IconCheck,
} from '@tabler/icons-react';
import type { TicketStats } from '../../../../shared/types/ticket';

interface StatItemProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
    variant?: 'primary' | 'alert';
}

function StatItem({ label, value, icon, color, description, variant = 'primary' }: StatItemProps) {
    return (
        <Paper
            withBorder
            p="md"
            radius="md"
            bg={variant === 'alert' ? 'var(--mantine-color-orange-0)' : 'white'}
            style={variant === 'alert' ? { borderColor: 'var(--mantine-color-orange-3)' } : undefined}
        >
            <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        {label}
                    </Text>
                    <Text fw={800} size="2rem" lh={1} c={variant === 'alert' ? 'orange.9' : 'dark.8'}>
                        {value.toLocaleString()}
                    </Text>
                    {description && (
                        <Text size="xs" c={variant === 'alert' ? 'orange.8' : 'dimmed'} mt={2}>
                            {description}
                        </Text>
                    )}
                </Stack>
                <ThemeIcon
                    size="xl"
                    radius="md"
                    variant={variant === 'alert' ? 'filled' : 'light'}
                    color={color}
                >
                    {icon}
                </ThemeIcon>
            </Group>
        </Paper>
    );
}

interface TicketsStatsProps {
    stats: TicketStats | null;
}

export function TicketsStats({ stats }: TicketsStatsProps) {
    if (!stats) return null;

    // Compute toProcess from byStatus since inProgressTickets doesn't exist
    const toProcess = stats.openTickets + (stats.byStatus?.in_progress || 0);
    // Compute waitingForUserCount from byStatus since it doesn't exist
    const waitingCount = stats.byStatus?.waiting_for_user || 0;

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
            <StatItem
                label="À Traiter"
                value={toProcess}
                icon={<IconInbox size={24} />}
                color="blue"
                description="Tickets ouverts & en cours"
                variant={toProcess > 0 ? 'alert' : 'primary'}
            />

            <StatItem
                label="Non lus"
                value={stats.unreadCount}
                icon={<IconMessageCircle size={24} />}
                color="red"
                description="Réponses non lues"
                variant={stats.unreadCount > 0 ? 'alert' : 'primary'}
            />

            <StatItem
                label="En attente"
                value={waitingCount}
                icon={<IconClock size={24} />}
                color="orange"
                description="En attente réponse client"
            />

            <StatItem
                label="Résolus (7j)"
                value={stats.resolvedThisWeek}
                icon={<IconCheck size={24} />}
                color="teal"
                description="Cette semaine"
            />
        </SimpleGrid>
    );
}
