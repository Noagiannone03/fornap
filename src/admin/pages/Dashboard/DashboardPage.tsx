import { Container, Title, SimpleGrid, Grid, Paper, Text, Group, Badge, Avatar, Stack } from '@mantine/core';
import { StatCard } from '../../components/stats/StatCard';
import { LineChart } from '../../components/charts/LineChart';
import { PieChart } from '../../components/charts/PieChart';
import { BarChart } from '../../components/charts/BarChart';
import {
  IconUsers,
  IconCurrencyEuro,
  IconCalendarEvent,
  IconStar,
  IconTrendingUp,
} from '@tabler/icons-react';

// Mock data - À remplacer par des vraies données de Firebase
const statsData = {
  totalUsers: 1234,
  activeMembers: 856,
  totalRevenue: 15420,
  totalEvents: 24,
  totalLoyaltyPoints: 45230,
  membersChange: 12.5,
  revenueChange: 8.3,
  eventsChange: -4.2,
};

const revenueData = [
  { month: 'Jan', revenue: 12000, subscriptions: 8000, events: 4000 },
  { month: 'Fév', revenue: 13500, subscriptions: 9000, events: 4500 },
  { month: 'Mar', revenue: 14200, subscriptions: 9500, events: 4700 },
  { month: 'Avr', revenue: 15800, subscriptions: 10500, events: 5300 },
  { month: 'Mai', revenue: 15420, subscriptions: 10200, events: 5220 },
];

const membershipDistribution = [
  { name: 'Mensuel', value: 45, color: 'indigo.6' },
  { name: 'Annuel', value: 35, color: 'cyan.6' },
  { name: 'Honoraire', value: 20, color: 'teal.6' },
];

const recentActivities = [
  {
    id: '1',
    type: 'user_registered',
    user: 'Marie Dupont',
    action: 'Nouvelle inscription',
    time: 'Il y a 5 min',
    avatar: 'MD',
  },
  {
    id: '2',
    type: 'subscription_created',
    user: 'Jean Martin',
    action: 'Abonnement annuel souscrit',
    time: 'Il y a 12 min',
    avatar: 'JM',
  },
  {
    id: '3',
    type: 'event_created',
    user: 'Sophie Bernard',
    action: 'Inscription à "Workshop Couture"',
    time: 'Il y a 1h',
    avatar: 'SB',
  },
  {
    id: '4',
    type: 'user_updated',
    user: 'Pierre Dubois',
    action: 'Profil mis à jour',
    time: 'Il y a 2h',
    avatar: 'PD',
  },
];

export function DashboardPage() {
  return (
    <Container size="xl">
      <Title order={1} mb="xl">
        Dashboard
      </Title>

      {/* Stats Cards */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md" mb="xl">
        <StatCard
          title="Membres Actifs"
          value={statsData.activeMembers.toLocaleString()}
          icon={<IconUsers size={22} />}
          change={statsData.membersChange}
          color="indigo"
          description={`${statsData.totalUsers} total`}
        />
        <StatCard
          title="Revenus Mensuels"
          value={`${statsData.totalRevenue.toLocaleString()}€`}
          icon={<IconCurrencyEuro size={22} />}
          change={statsData.revenueChange}
          color="green"
        />
        <StatCard
          title="Événements"
          value={statsData.totalEvents}
          icon={<IconCalendarEvent size={22} />}
          change={statsData.eventsChange}
          color="orange"
          description="Ce mois"
        />
        <StatCard
          title="Points Fidélité"
          value={statsData.totalLoyaltyPoints.toLocaleString()}
          icon={<IconStar size={22} />}
          color="yellow"
          description="Total distribués"
        />
      </SimpleGrid>

      {/* Charts Row */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <LineChart
            title="Évolution des Revenus"
            data={revenueData}
            dataKey="month"
            series={[
              { name: 'revenue', color: 'indigo.6' },
              { name: 'subscriptions', color: 'cyan.6' },
              { name: 'events', color: 'teal.6' },
            ]}
            height={350}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <PieChart
            title="Répartition Abonnements"
            data={membershipDistribution}
            height={350}
          />
        </Grid.Col>
      </Grid>

      {/* Recent Activity */}
      <Paper withBorder p="md" radius="md" shadow="sm">
        <Group justify="space-between" mb="md">
          <Title order={4}>Activité Récente</Title>
          <Badge leftSection={<IconTrendingUp size={14} />} variant="light" color="green">
            En direct
          </Badge>
        </Group>

        <Stack gap="md">
          {recentActivities.map((activity) => (
            <Group key={activity.id} justify="space-between" wrap="nowrap">
              <Group>
                <Avatar color="indigo" radius="xl">
                  {activity.avatar}
                </Avatar>
                <div>
                  <Text size="sm" fw={500}>
                    {activity.user}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {activity.action}
                  </Text>
                </div>
              </Group>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {activity.time}
              </Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
}
