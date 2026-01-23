import { SimpleGrid, Paper, Text, Group, Box, ThemeIcon, Button, RingProgress, Stack, Divider } from '@mantine/core';
import {
    IconUsers,
    IconUserExclamation,
    IconUserCheck,
    IconMailOff,
    IconArrowRight,
} from '@tabler/icons-react';

interface StatItemProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'primary' | 'alert';
}

function StatItem({ label, value, icon, color, description, actionLabel, onAction, variant = 'primary' }: StatItemProps) {
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

            {onAction && (
                <Button
                    variant="light"
                    color={color}
                    fullWidth
                    mt="md"
                    h={32}
                    rightSection={<IconArrowRight size={14} />}
                    onClick={onAction}
                >
                    {actionLabel}
                </Button>
            )}
        </Paper>
    );
}

interface UsersStatsCardsProps {
    totalUsers: number;
    legacyMembersCount: number;
    activeSubscriptionsCount: number;
    blockedAccountsCount: number;
    emailsSentCount: number;
    emailsNotSentCount: number;
}

export function UsersStatsCards({
    totalUsers,
    legacyMembersCount,
    activeSubscriptionsCount,
    blockedAccountsCount,
    emailsSentCount,
    emailsNotSentCount,
}: UsersStatsCardsProps) {
    // Only showing the most relevant actionable stats

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
            {/* General Health */}
            <StatItem
                label="Total Membres"
                value={totalUsers}
                icon={<IconUsers size={24} />}
                color="blue"
                description="Base utilisateurs totale"
            />

            <StatItem
                label="Abonnements Actifs"
                value={activeSubscriptionsCount}
                icon={<IconUserCheck size={24} />}
                color="teal"
                description="Membres à jour de cotisation"
            />

            {/* Action Items - Highlighted */}
            <StatItem
                label="À Migrer"
                value={legacyMembersCount}
                icon={<IconUserExclamation size={24} />}
                color="orange"
                description="Anciens membres requérant attention"
                variant={legacyMembersCount > 0 ? 'alert' : 'primary'}
            />

            <StatItem
                label="Cartes en attente"
                value={emailsNotSentCount}
                icon={<IconMailOff size={24} />}
                color="indigo"
                description="Membres sans carte d'adhérent"
                variant={emailsNotSentCount > 0 ? 'alert' : 'primary'}
            />
        </SimpleGrid>
    );
}
