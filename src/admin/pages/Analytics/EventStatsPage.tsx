import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Group,
  Text,
  Grid,
  Card,
  Table,
  Badge,
  LoadingOverlay,
  Stack,
  Progress,
  Select,
} from '@mantine/core';
import {
  IconCalendar,
  IconTicket,
  IconCurrencyEuro,
  IconUsers,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  getEventAnalyticsKPIs,
  getRevenueEvolution,
  getEventTypeDistribution,
  getTopEvents,
  getAttendeeProfile,
} from '../../../shared/services/analytics/eventAnalytics';
import type {
  EventAnalyticsKPIs,
  EventRevenueData,
  EventTypeDistribution,
  TopEvent,
  AttendeeProfile,
} from '../../../shared/types/event';
import { EVENT_TYPE_LABELS } from '../../../shared/types/event';

export function EventStatsPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<EventAnalyticsKPIs | null>(null);
  const [, setRevenueData] = useState<EventRevenueData[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<EventTypeDistribution[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [attendeeProfile, setAttendeeProfile] = useState<AttendeeProfile | null>(null);

  // Filters
  const [period, setPeriod] = useState<string>('6months');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case '1month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 6);
      }

      // Load all analytics
      const [kpisData, revenueEvolution, typeDist, topEventsData, attendeeData] =
        await Promise.all([
          getEventAnalyticsKPIs(),
          getRevenueEvolution(startDate, endDate, 'month'),
          getEventTypeDistribution(),
          getTopEvents(10),
          getAttendeeProfile(),
        ]);

      setKpis(kpisData);
      setRevenueData(revenueEvolution);
      setTypeDistribution(typeDist);
      setTopEvents(topEventsData);
      setAttendeeProfile(attendeeData);
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les analytics',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0)
      return <IconTrendingUp size={16} style={{ color: 'var(--mantine-color-green-6)' }} />;
    if (value < 0)
      return <IconTrendingDown size={16} style={{ color: 'var(--mantine-color-red-6)' }} />;
    return <IconMinus size={16} style={{ color: 'var(--mantine-color-gray-6)' }} />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'green';
    if (value < 0) return 'red';
    return 'gray';
  };

  return (
    <Container size="xl">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <Title order={1}>Analytics Événements</Title>
        <Select
          value={period}
          onChange={(value) => setPeriod(value || '6months')}
          data={[
            { value: '1month', label: '1 mois' },
            { value: '3months', label: '3 mois' },
            { value: '6months', label: '6 mois' },
            { value: '1year', label: '1 an' },
          ]}
          w={150}
        />
      </Group>

      <LoadingOverlay visible={loading} />

      {kpis && (
        <>
          {/* KPI Cards */}
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Événements Actifs
                  </Text>
                  <IconCalendar size={20} opacity={0.5} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {kpis.activeEvents}
                </Text>
                <Group gap={4}>
                  {getTrendIcon(kpis.trends.events)}
                  <Text size="xs" c={getTrendColor(kpis.trends.events)}>
                    {kpis.trends.events > 0 ? '+' : ''}
                    {kpis.trends.events.toFixed(1)}% vs mois dernier
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mt="xs">
                  {kpis.upcomingEvents} à venir | {kpis.totalEvents} au total
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Billets Vendus
                  </Text>
                  <IconTicket size={20} opacity={0.5} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {kpis.totalTicketsSold.toLocaleString()}
                </Text>
                <Group gap={4}>
                  {getTrendIcon(kpis.trends.ticketsSold)}
                  <Text size="xs" c={getTrendColor(kpis.trends.ticketsSold)}>
                    {kpis.trends.ticketsSold > 0 ? '+' : ''}
                    {kpis.trends.ticketsSold.toFixed(1)}% vs mois dernier
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mt="xs">
                  {kpis.monthlyTicketsSold.toLocaleString()} ce mois
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Revenus Totaux
                  </Text>
                  <IconCurrencyEuro size={20} opacity={0.5} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {kpis.totalRevenue.toLocaleString()}€
                </Text>
                <Group gap={4}>
                  {getTrendIcon(kpis.trends.revenue)}
                  <Text size="xs" c={getTrendColor(kpis.trends.revenue)}>
                    {kpis.trends.revenue > 0 ? '+' : ''}
                    {kpis.trends.revenue.toFixed(1)}% vs mois dernier
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mt="xs">
                  {kpis.monthlyRevenue.toLocaleString()}€ ce mois
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder padding="lg">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Participants
                  </Text>
                  <IconUsers size={20} opacity={0.5} />
                </Group>
                <Text size="xl" fw={700} mb="xs">
                  {kpis.totalAttendees.toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Taux de présence: {kpis.averageAttendanceRate.toFixed(1)}%
                </Text>
                <Text size="xs" c="dimmed">
                  Taux d'occupation: {kpis.averageOccupancyRate.toFixed(1)}%
                </Text>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Secondary Stats */}
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                  Prix Moyen du Billet
                </Text>
                <Text size="lg" fw={600}>
                  {kpis.averageTicketPrice.toFixed(2)}€
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                  Revenu Moyen/Événement
                </Text>
                <Text size="lg" fw={600}>
                  {kpis.averageRevenuePerEvent.toFixed(2)}€
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                  Taux de Fidélité
                </Text>
                <Text size="lg" fw={600}>
                  {kpis.repeatAttendeeRate.toFixed(1)}%
                </Text>
                <Text size="xs" c="dimmed">
                  Utilisateurs multi-événements
                </Text>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                  Billets Moy./Utilisateur
                </Text>
                <Text size="lg" fw={600}>
                  {kpis.averageTicketsPerUser.toFixed(2)}
                </Text>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Event Type Distribution */}
          <Paper withBorder p="md" mb="xl">
            <Title order={4} mb="md">
              Performance par Type d'Événement
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Événements</Table.Th>
                  <Table.Th>Billets Vendus</Table.Th>
                  <Table.Th>Revenus</Table.Th>
                  <Table.Th>Taux d'Occupation</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {typeDistribution.map((dist) => (
                  <Table.Tr key={dist.type}>
                    <Table.Td>
                      <Badge variant="light">{EVENT_TYPE_LABELS[dist.type]}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dist.count}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{dist.ticketsSold.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {dist.revenue.toLocaleString()}€
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        <Progress value={dist.averageOccupancy} size="sm" />
                        <Text size="xs" c="dimmed">
                          {dist.averageOccupancy.toFixed(1)}%
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>

          {/* Top Events */}
          <Paper withBorder p="md" mb="xl">
            <Title order={4} mb="md">
              Top 10 Événements
            </Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Événement</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Billets</Table.Th>
                  <Table.Th>Revenus</Table.Th>
                  <Table.Th>Occupation</Table.Th>
                  <Table.Th>Présence</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {topEvents.map((event, index) => (
                  <Table.Tr key={event.id}>
                    <Table.Td>
                      <Group gap={8}>
                        <Badge size="sm" variant="filled" circle>
                          {index + 1}
                        </Badge>
                        <Text size="sm" fw={500}>
                          {event.title}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm">
                        {EVENT_TYPE_LABELS[event.type]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {event.startDate.toDate().toLocaleDateString('fr-FR')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{event.ticketsSold.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {event.revenue.toLocaleString()}€
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        <Progress value={event.occupancyRate} size="sm" color="blue" />
                        <Text size="xs" c="dimmed">
                          {event.occupancyRate.toFixed(1)}%
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        <Progress value={event.attendanceRate} size="sm" color="green" />
                        <Text size="xs" c="dimmed">
                          {event.attendanceRate.toFixed(1)}%
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>

          {/* Attendee Demographics */}
          {attendeeProfile && (
            <Grid mb="xl">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Profil des Participants
                  </Title>
                  <Stack gap="md">
                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Âge Moyen
                      </Text>
                      <Text size="xl" fw={700} c="blue">
                        {attendeeProfile.averageAge.toFixed(1)} ans
                      </Text>
                    </div>

                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Répartition par Tranche d'Âge
                      </Text>
                      {Object.entries(attendeeProfile.ageDistribution).map(([range, count]) => (
                        <Group key={range} justify="space-between" mb={4}>
                          <Text size="sm">{range} ans</Text>
                          <Group gap={8}>
                            <Progress
                              value={
                                (count /
                                  Object.values(attendeeProfile.ageDistribution).reduce(
                                    (a, b) => a + b,
                                    0
                                  )) *
                                100
                              }
                              size="sm"
                              style={{ width: 100 }}
                            />
                            <Text size="sm" fw={500}>
                              {count}
                            </Text>
                          </Group>
                        </Group>
                      ))}
                    </div>

                    <div>
                      <Text size="sm" fw={500} mb="xs">
                        Taux de Fidélité
                      </Text>
                      <Text size="lg" fw={600}>
                        {attendeeProfile.repeatAttendeeRate.toFixed(1)}%
                      </Text>
                      <Text size="xs" c="dimmed">
                        Moyenne: {attendeeProfile.averageEventsPerUser.toFixed(2)}{' '}
                        événements/utilisateur
                      </Text>
                    </div>
                  </Stack>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper withBorder p="md">
                  <Title order={4} mb="md">
                    Répartition par Abonnement
                  </Title>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text size="sm">Mensuel</Text>
                      <Group gap={8}>
                        <Progress
                          value={
                            (attendeeProfile.membershipDistribution.monthly /
                              (attendeeProfile.membershipDistribution.monthly +
                                attendeeProfile.membershipDistribution.annual +
                                attendeeProfile.membershipDistribution.lifetime)) *
                            100
                          }
                          size="md"
                          color="blue"
                          style={{ width: 120 }}
                        />
                        <Text size="sm" fw={600}>
                          {attendeeProfile.membershipDistribution.monthly}
                        </Text>
                      </Group>
                    </Group>

                    <Group justify="space-between">
                      <Text size="sm">Annuel</Text>
                      <Group gap={8}>
                        <Progress
                          value={
                            (attendeeProfile.membershipDistribution.annual /
                              (attendeeProfile.membershipDistribution.monthly +
                                attendeeProfile.membershipDistribution.annual +
                                attendeeProfile.membershipDistribution.lifetime)) *
                            100
                          }
                          size="md"
                          color="green"
                          style={{ width: 120 }}
                        />
                        <Text size="sm" fw={600}>
                          {attendeeProfile.membershipDistribution.annual}
                        </Text>
                      </Group>
                    </Group>
                  </Stack>

                  <Title order={4} mt="xl" mb="md">
                    Top Villes
                  </Title>
                  <Stack gap="xs">
                    {attendeeProfile.topCities.map((city, index) => (
                      <Group key={city.city} justify="space-between">
                        <Group gap={8}>
                          <Badge size="sm" variant="light">
                            {index + 1}
                          </Badge>
                          <Text size="sm">{city.city}</Text>
                        </Group>
                        <Text size="sm" fw={600}>
                          {city.count}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          )}
        </>
      )}
    </Container>
  );
}
