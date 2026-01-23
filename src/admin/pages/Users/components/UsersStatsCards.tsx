import { SimpleGrid, Paper, Text, Group, Box, ThemeIcon, Progress } from '@mantine/core';
import {
    IconUsers,
    IconUserExclamation,
    IconUserCheck,
    IconUserOff,
    IconMail,
    IconMailOff,
} from '@tabler/icons-react';

interface MetricCardProps {
    label: string;
    value: number;
    total?: number;
    color: string;
    icon: React.ReactNode;
}

function MetricCard({ label, value, total, color, icon }: MetricCardProps) {
    const percent = total ? (value / total) * 100 : 0;

    return (
        <Paper withBorder p="md" radius="md">
            <Group justify="space-between" align="flex-start" mb="xs">
                <div>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                        {label}
                    </Text>
                    <Text fw={700} size="xl" lh={1} mt={4}>
                        {value.toLocaleString('fr-FR')}
                    </Text>
                </div>
                <ThemeIcon variant="light" color={color} size="lg" radius="md">
                    {icon}
                </ThemeIcon>
            </Group>

            {total && (
                <Box mt="sm">
                    <Group justify="space-between" mb={2}>
                        <Text size="xs" c="dimmed">{percent.toFixed(0)}%</Text>
                    </Group>
                    <Progress value={percent} color={color} size="sm" radius="xl" />
                </Box>
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
    const newUsersCount = totalUsers - legacyMembersCount;

    return (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md" mb="xl">
            <MetricCard
                label="Total Utilisateurs"
                value={totalUsers}
                color="blue"
                icon={<IconUsers size={20} />}
            />
            <MetricCard
                label="À Migrer"
                value={legacyMembersCount}
                total={totalUsers}
                color="orange"
                icon={<IconUserExclamation size={20} />}
            />
            <MetricCard
                label="Abonnements Actifs"
                value={activeSubscriptionsCount}
                total={newUsersCount}
                color="teal"
                icon={<IconUserCheck size={20} />}
            />
            <MetricCard
                label="Comptes Bloqués"
                value={blockedAccountsCount}
                total={newUsersCount}
                color="red"
                icon={<IconUserOff size={20} />}
            />
            <MetricCard
                label="Cartes Envoyées"
                value={emailsSentCount}
                total={newUsersCount}
                color="indigo"
                icon={<IconMail size={20} />}
            />
            <MetricCard
                label="Cartes en Attente"
                value={emailsNotSentCount}
                total={newUsersCount}
                color="gray"
                icon={<IconMailOff size={20} />}
            />
        </SimpleGrid>
    );
}
