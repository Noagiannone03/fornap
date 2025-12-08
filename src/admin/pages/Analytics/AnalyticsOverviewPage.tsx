import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Grid,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import {
  IconUsers,
  IconUserCheck,
  IconCurrencyEuro,
  IconTrendingUp,
  IconRepeat,
  IconCalendar,
  IconAlertCircle,
} from '@tabler/icons-react';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableLineChart } from '../../components/analytics/charts/ReusableLineChart';
import { ReusablePieChart } from '../../components/analytics/charts/ReusablePieChart';
import {
  getOverviewKPIs,
  getMembersEvolution,
  getMembershipDistribution,
} from '../../../shared/services/analytics/analyticsService';
import type {
  OverviewKPIs,
  MembersEvolutionData,
  MembershipDistribution,
} from '../../../shared/types/user';
import { DebugErrorBoundary } from '../../../shared/components/DebugErrorBoundary';

export function AnalyticsOverviewPage() {
  return (
    <DebugErrorBoundary>
      <AnalyticsOverviewContent />
    </DebugErrorBoundary>
  );
}

function AnalyticsOverviewContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<OverviewKPIs | null>(null);
  const [evolutionData, setEvolutionData] = useState<MembersEvolutionData[]>([]);
  const [distribution, setDistribution] = useState<MembershipDistribution | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les KPIs
      const kpisData = await getOverviewKPIs();
      setKpis(kpisData);

      // Charger l'évolution sur les 12 derniers mois
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const evolution = await getMembersEvolution(startDate, endDate, 'month');
      setEvolutionData(evolution);

      // Charger la distribution
      const dist = await getMembershipDistribution();
      setDistribution(dist);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Erreur lors du chargement des données analytics');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour le pie chart
  const distributionData = distribution
    ? [
        {
          name: 'Mensuel',
          value: distribution.byType.monthly,
          color: '#339AF0',
        },
        {
          name: 'Annuel',
          value: distribution.byType.annual,
          color: '#51CF66',
        },
      ]
    : [];

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Title order={1} mb="xl">
        Analytics - Vue d'ensemble
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* KPIs principaux */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <KPICard
          title="Total Adhérents"
          value={kpis?.totalMembers || 0}
          icon={<IconUsers size={22} />}
          color="indigo"
          trend={{
            value: kpis?.trends?.members || 0,
            period: 'vs semaine dernière',
          }}
          loading={loading}
        />

        <KPICard
          title="Adhérents Actifs"
          value={kpis?.activeMembers || 0}
          icon={<IconUserCheck size={22} />}
          color="green"
          description={kpis ? `${kpis.activityRate.toFixed(1)}% du total` : '-'}
          loading={loading}
        />

        <KPICard
          title="MRR"
          value={kpis ? `${kpis.mrr.toFixed(0)}€` : '0€'}
          icon={<IconCurrencyEuro size={22} />}
          color="teal"
          description="Revenu Récurrent Mensuel"
          trend={{
            value: kpis?.trends?.revenue || 0,
            period: 'vs mois dernier',
          }}
          loading={loading}
        />

        <KPICard
          title="Taux de Renouvellement"
          value={kpis ? `${kpis.renewalRate.toFixed(1)}%` : '0%'}
          icon={<IconRepeat size={22} />}
          color="cyan"
          description="Sur 12 mois glissants"
          loading={loading}
        />
      </SimpleGrid>

      {/* KPIs secondaires */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <KPICard
          title="ARR"
          value={kpis ? `${kpis.arr.toFixed(0)}€` : '0€'}
          icon={<IconTrendingUp size={22} />}
          color="violet"
          description="Revenu Récurrent Annuel"
          loading={loading}
        />

        <KPICard
          title="Âge Moyen"
          value={kpis ? `${kpis.averageAge || 0} ans` : '-'}
          icon={<IconCalendar size={22} />}
          color="orange"
          loading={loading}
        />

        <KPICard
          title="Nouveaux Cette Semaine"
          value={kpis?.newThisWeek || 0}
          icon={<IconUsers size={22} />}
          color="blue"
          loading={loading}
        />

        <KPICard
          title="Nouveaux Ce Mois"
          value={kpis?.newThisMonth || 0}
          icon={<IconUsers size={22} />}
          color="grape"
          loading={loading}
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
            innerRadius={60} // Donut chart
          />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
