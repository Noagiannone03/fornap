import { useState, useEffect } from 'react';
import { Container, Title, SimpleGrid, Grid, Paper, Text, Group, LoadingOverlay, Alert, ActionIcon, Tooltip } from '@mantine/core';
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
  IconRefresh,
} from '@tabler/icons-react';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableLineChart } from '../../components/analytics/charts/ReusableLineChart';
import { ReusablePieChart } from '../../components/analytics/charts/ReusablePieChart';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Charger toutes les données en parallèle
      const [overview, financial, contributions, events, engagement, dist] = await Promise.all([
        getOverviewKPIs(),
        getFinancialKPIs(),
        getContributionKPIs(),
        getEventAnalyticsKPIs(),
        getEngagementKPIs(),
        getMembershipDistribution(),
      ]);

      setOverviewKpis(overview);
      setFinancialKpis(financial);
      setContributionKpis(contributions);
      setEventKpis(events);
      setEngagementKpis(engagement);
      setDistribution(dist);

      // Charger l'évolution sur les 12 derniers mois
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      const evolution = await getMembersEvolution(startDate, endDate, 'month');
      setEvolutionData(evolution);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Erreur lors du chargement des données du tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour le pie chart
  const distributionData = distribution
    ? [
        { name: 'Mensuel', value: distribution.byType.monthly, color: '#339AF0' },
        { name: 'Annuel', value: distribution.byType.annual, color: '#51CF66' },
        { name: 'Honoraire', value: distribution.byType.lifetime, color: '#CC5DE8' },
      ]
    : [];

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Tableau de Bord</Title>
        <Tooltip label="Actualiser les données">
          <ActionIcon
            variant="light"
            size="lg"
            onClick={loadData}
            loading={loading}
          >
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* KPIs Principaux - Vue d'ensemble */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg" mb="xl">
        <KPICard
          title="Total Adhérents"
          value={overviewKpis?.totalMembers || 0}
          icon={<IconUsers size={22} />}
          color="indigo"
          trend={{
            value: overviewKpis?.trends.members || 0,
            period: 'vs semaine dernière',
          }}
        />
        <KPICard
          title="MRR"
          value={`${financialKpis?.mrr.toFixed(0)}€`}
          icon={<IconCurrencyEuro size={22} />}
          color="teal"
          description="Revenu Récurrent Mensuel"
        />
        <KPICard
          title="Contributions"
          value={`${contributionKpis?.totalAmount.toFixed(0)}€`}
          icon={<IconShoppingCart size={22} />}
          color="green"
          description={`${contributionKpis?.totalContributions || 0} pass et dons`}
        />
        <KPICard
          title="Événements Actifs"
          value={eventKpis?.activeEvents || 0}
          icon={<IconCalendarEvent size={22} />}
          color="orange"
          description={`${eventKpis?.totalTicketsSold.toLocaleString() || '0'} billets vendus`}
        />
      </SimpleGrid>

      {/* KPIs Secondaires */}
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="lg" mb="xl">
        <KPICard
          title="Adhérents Actifs"
          value={overviewKpis?.activeMembers || 0}
          icon={<IconUserCheck size={22} />}
          color="green"
          description={`${overviewKpis?.activityRate.toFixed(1)}% du total`}
        />
        <KPICard
          title="Taux de Renouvellement"
          value={`${overviewKpis?.renewalRate.toFixed(1)}%`}
          icon={<IconRepeat size={22} />}
          color="cyan"
          description="Sur 12 mois"
        />
        <KPICard
          title="Bénévoles"
          value={engagementKpis?.volunteerCount || 0}
          icon={<IconHeartHandshake size={22} />}
          color="pink"
          description="Disponibles pour aider"
        />
        <KPICard
          title="Taux d'Occupation"
          value={`${eventKpis?.averageOccupancyRate.toFixed(1) || '0'}%`}
          icon={<IconTicket size={22} />}
          color="violet"
          description="Moyenne événements"
        />
      </SimpleGrid>

      {/* Graphiques */}
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ReusableLineChart
            title="Évolution des Adhérents"
            subtitle="Nouveaux adhérents par type sur les 12 derniers mois"
            data={evolutionData}
            xAxisKey="date"
            series={[
              { dataKey: 'monthly', name: 'Mensuel', color: '#339AF0' },
              { dataKey: 'annual', name: 'Annuel', color: '#51CF66' },
              { dataKey: 'lifetime', name: 'Honoraire', color: '#CC5DE8' },
              { dataKey: 'total', name: 'Total', color: '#000' },
            ]}
            height={350}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <ReusablePieChart
            title="Répartition des Abonnements"
            subtitle="Par type d'abonnement"
            data={distributionData}
            height={350}
            innerRadius={60}
          />
        </Grid.Col>
      </Grid>

      {/* Détails rapides */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Nouveaux ce mois</Text>
            <Text size="xl" fw={700} c="blue">{overviewKpis?.newThisMonth || 0}</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">ARR</Text>
            <Text size="xl" fw={700} c="teal">{financialKpis?.arr.toFixed(0)}€</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Taux de Conversion</Text>
            <Text size="xl" fw={700} c="green">{contributionKpis?.conversionRate.toFixed(1)}%</Text>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">Profils Étendus</Text>
            <Text size="xl" fw={700} c="violet">{engagementKpis?.profileCompletionRate.toFixed(1)}%</Text>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
