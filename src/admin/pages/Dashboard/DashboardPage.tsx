import { useState, useEffect } from 'react';
import { Container, Title, SimpleGrid, Grid, LoadingOverlay, Alert, Box, Text, Group, ThemeIcon } from '@mantine/core';
import {
  IconUsers,
  IconCurrencyEuro,
  IconCalendarEvent,
  IconUserCheck,
  IconRepeat,
  IconHeartHandshake,
  IconTicket,
  IconShoppingCart,
  IconAlertCircle,
  IconSparkles
} from '@tabler/icons-react';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableLineChart } from '../../components/analytics/charts/ReusableLineChart';
import { ReusablePieChart } from '../../components/analytics/charts/ReusablePieChart';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';

// Import services
import { getOverviewKPIs, getMembersEvolution, getMembershipDistribution } from '../../../shared/services/analytics/analyticsService';
import { getFinancialKPIs } from '../../../shared/services/analytics/financialAnalytics';
import { getContributionKPIs } from '../../../shared/services/analytics/contributionAnalytics';
import { getEventAnalyticsKPIs } from '../../../shared/services/analytics/eventAnalytics';
import { getEngagementKPIs } from '../../../shared/services/analytics/engagementAnalytics';

import type { OverviewKPIs, MembersEvolutionData, MembershipDistribution } from '../../../shared/types/user';
import type { FinancialKPIs } from '../../../shared/types/user';
import type { ContributionKPIs } from '../../../shared/types/contribution';
import type { EventAnalyticsKPIs } from '../../../shared/types/event';
import type { EngagementKPIs } from '../../../shared/types/user';

export function DashboardPage() {
  const { adminProfile } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Overview data
  const [overviewKpis, setOverviewKpis] = useState<OverviewKPIs | null>(null);
  const [evolutionData, setEvolutionData] = useState<MembersEvolutionData[]>([]);
  const [distribution, setDistribution] = useState<MembershipDistribution | null>(null);

  // Financial data
  const [financialKpis, setFinancialKpis] = useState<FinancialKPIs | null>(null);

  // Contributions data
  const [contributionKpis, setContributionKpis] = useState<ContributionKPIs | null>(null);

  // Events data
  const [eventKpis, setEventKpis] = useState<EventAnalyticsKPIs | null>(null);

  // Engagement data
  const [engagementKpis, setEngagementKpis] = useState<EngagementKPIs | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        overviewResult,
        financialResult,
        contributionResult,
        eventResult,
        engagementResult,
        distributionResult,
        evolutionResult,
      ] = await Promise.allSettled([
        getOverviewKPIs(),
        getFinancialKPIs(),
        getContributionKPIs(),
        getEventAnalyticsKPIs(),
        getEngagementKPIs(),
        getMembershipDistribution(),
        (async () => {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 12);
          return getMembersEvolution(startDate, endDate, 'month');
        })(),
      ]);

      if (overviewResult.status === 'fulfilled') setOverviewKpis(overviewResult.value);
      if (financialResult.status === 'fulfilled') setFinancialKpis(financialResult.value);
      if (contributionResult.status === 'fulfilled') setContributionKpis(contributionResult.value);
      
      if (eventResult.status === 'fulfilled') {
        setEventKpis(eventResult.value);
      } else {
        setEventKpis({
          totalEvents: 0,
          activeEvents: 0,
          upcomingEvents: 0,
          completedEvents: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          averageRevenuePerEvent: 0,
          totalTicketsSold: 0,
          monthlyTicketsSold: 0,
          averageTicketPrice: 0,
          totalAttendees: 0,
          averageAttendanceRate: 0,
          averageOccupancyRate: 0,
          repeatAttendeeRate: 0,
          averageTicketsPerUser: 0,
          trends: { revenue: 0, ticketsSold: 0, attendanceRate: 0, events: 0 },
        });
      }

      if (engagementResult.status === 'fulfilled') setEngagementKpis(engagementResult.value);
      if (distributionResult.status === 'fulfilled') setDistribution(distributionResult.value);
      if (evolutionResult.status === 'fulfilled') setEvolutionData(evolutionResult.value);
      
      setLastUpdated(new Date());

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const distributionData = distribution
    ? [
      { name: 'Mensuel', value: distribution.byType.monthly, color: '#6366f1' }, // Indigo-500
      { name: 'Annuel', value: distribution.byType.annual, color: '#14b8a6' }, // Teal-500
    ]
    : [];

  return (
    <Container size="xl" py="xl" pos="relative">
      <LoadingOverlay visible={loading} overlayProps={{ radius: "lg", blur: 2 }} />

      <Group justify="space-between" mb={40} align="flex-end">
        <Box>
          <Group mb={8}>
             <ThemeIcon variant="light" size="lg" radius="md" color="indigo">
                <IconSparkles size={20} />
             </ThemeIcon>
             <Text size="sm" fw={600} c="indigo" tt="uppercase" style={{ letterSpacing: '1px' }}>
                Vue d'ensemble
             </Text>
          </Group>
          <Title order={1} fw={800} style={{ letterSpacing: '-1px', fontSize: '2.5rem' }}>
            Bonjour, {adminProfile?.firstName || 'Admin'}
          </Title>
          <Text size="lg" c="dimmed" mt={4} maw={600}>
             Voici ce qu'il se passe sur votre plateforme aujourd'hui.
          </Text>
        </Box>
        <Text size="sm" c="dimmed" fw={500}>
          Mis à jour à {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl" variant="light" radius="md">
          {error}
        </Alert>
      )}

      {/* KPIs Principaux */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg" mb={40}>
        <KPICard
          title="Total Adhérents"
          value={overviewKpis?.totalMembers || 0}
          icon={<IconUsers size={28} stroke={1.5} />}
          color="indigo"
          trend={{ value: overviewKpis?.trends.members || 0, period: 'vs mois dernier' }}
        />
        <KPICard
          title="MRR"
          value={`${financialKpis?.mrr.toFixed(0)}€`}
          icon={<IconCurrencyEuro size={28} stroke={1.5} />}
          color="teal"
          description="Revenu Récurrent"
        />
        <KPICard
          title="Contributions"
          value={`${contributionKpis?.totalAmount.toFixed(0)}€`}
          icon={<IconShoppingCart size={28} stroke={1.5} />}
          color="cyan"
          description={`${contributionKpis?.totalContributions || 0} transactions`}
        />
        <KPICard
          title="Événements Actifs"
          value={eventKpis?.activeEvents || 0}
          icon={<IconCalendarEvent size={28} stroke={1.5} />}
          color="grape"
          description={`${eventKpis?.totalTicketsSold.toLocaleString() || '0'} billets`}
        />
      </SimpleGrid>

      {/* Graphiques */}
      <Grid mb={40} gutter="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ReusableLineChart
            title="Croissance"
            subtitle="Nouveaux adhérents (12 mois)"
            data={evolutionData}
            xAxisKey="date"
            series={[
              { dataKey: 'monthly', name: 'Mensuel', color: '#6366f1' },
              { dataKey: 'annual', name: 'Annuel', color: '#14b8a6' },
            ]}
            height={360}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <ReusablePieChart
            title="Répartition"
            subtitle="Types d'abonnements"
            data={distributionData}
            height={360}
            innerRadius={80}
          />
        </Grid.Col>
      </Grid>

      {/* KPIs Secondaires */}
      <Title order={3} mb="lg" fw={700}>Métriques d'engagement</Title>
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg" mb={48}>
        <KPICard
          title="Actifs"
          value={overviewKpis?.activeMembers || 0}
          icon={<IconUserCheck size={26} stroke={1.5} />}
          color="lime"
          description={`${overviewKpis?.activityRate.toFixed(1)}% du total`}
        />
        <KPICard
          title="Renouvellement"
          value={`${overviewKpis?.renewalRate.toFixed(1)}%`}
          icon={<IconRepeat size={26} stroke={1.5} />}
          color="blue"
          description="Rétention annuelle"
        />
        <KPICard
          title="Bénévoles"
          value={engagementKpis?.volunteerCount || 0}
          icon={<IconHeartHandshake size={26} stroke={1.5} />}
          color="pink"
          description="Membres engagés"
        />
        <KPICard
          title="Occupation"
          value={`${eventKpis?.averageOccupancyRate.toFixed(1) || '0'}%`}
          icon={<IconTicket size={26} stroke={1.5} />}
          color="orange"
          description="Moyenne événements"
        />
      </SimpleGrid>
    </Container>
  );
}
