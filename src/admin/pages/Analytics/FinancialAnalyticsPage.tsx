import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Grid,
  LoadingOverlay,
  Alert,
  Button,
  Group,
  Paper,
  Text,
} from '@mantine/core';
import {
  IconCurrencyEuro,
  IconTrendingUp,
  IconRepeat,
  IconUsers,
  IconAlertCircle,
  IconDownload,
  IconFileSpreadsheet,
  IconCalculator,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableLineChart } from '../../components/analytics/charts/ReusableLineChart';
import {
  getFinancialKPIs,
  getRevenueEvolution,
} from '../../../shared/services/analytics/financialAnalytics';
import {
  downloadMonthlyMembershipCSV,
  downloadMembersDetailCSV,
  downloadAccountingCSV,
} from '../../../shared/services/analytics/exportService';
import type {
  FinancialKPIs,
  RevenueEvolutionData,
} from '../../../shared/types/user';

export function FinancialAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueEvolutionData[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les KPIs financiers
      const kpisData = await getFinancialKPIs();
      setKpis(kpisData);

      // Charger l'évolution du revenu sur les 12 derniers mois
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const evolution = await getRevenueEvolution(startDate, endDate);
      setRevenueData(evolution);
    } catch (err) {
      console.error('Error loading financial analytics data:', err);
      setError('Erreur lors du chargement des données financières');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMonthlyCSV = async () => {
    try {
      setExportLoading(true);
      const now = new Date();
      await downloadMonthlyMembershipCSV(now.getFullYear(), now.getMonth() + 1);
      notifications.show({
        title: 'Export réussi',
        message: 'Le fichier CSV mensuel a été téléchargé',
        color: 'green',
      });
    } catch (err) {
      console.error('Error exporting monthly CSV:', err);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de l\'export du fichier CSV',
        color: 'red',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportMembersCSV = async () => {
    try {
      setExportLoading(true);
      await downloadMembersDetailCSV();
      notifications.show({
        title: 'Export réussi',
        message: 'Le fichier CSV des adhérents a été téléchargé',
        color: 'green',
      });
    } catch (err) {
      console.error('Error exporting members CSV:', err);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de l\'export du fichier CSV',
        color: 'red',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAccountingCSV = async () => {
    try {
      setExportLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      await downloadAccountingCSV(startDate, endDate, 'generic');
      notifications.show({
        title: 'Export réussi',
        message: 'Le fichier CSV comptable a été téléchargé',
        color: 'green',
      });
    } catch (err) {
      console.error('Error exporting accounting CSV:', err);
      notifications.show({
        title: 'Erreur',
        message: 'Erreur lors de l\'export du fichier CSV',
        color: 'red',
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Title order={1} mb="xl">
        Analytics - Financier
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* KPIs financiers */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
        <KPICard
          title="Revenu Total"
          value={`${kpis?.totalRevenue.toFixed(0)}€`}
          icon={<IconCurrencyEuro size={22} />}
          color="green"
          description="Revenu cumulé de tous les adhérents"
        />

        <KPICard
          title="MRR"
          value={`${kpis?.mrr.toFixed(0)}€`}
          icon={<IconRepeat size={22} />}
          color="teal"
          description="Revenu Récurrent Mensuel"
        />

        <KPICard
          title="ARR"
          value={`${kpis?.arr.toFixed(0)}€`}
          icon={<IconTrendingUp size={22} />}
          color="blue"
          description="Revenu Récurrent Annuel"
        />
      </SimpleGrid>

      {/* KPIs secondaires */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
        <KPICard
          title="ARPU"
          value={`${kpis?.arpu.toFixed(2)}€`}
          icon={<IconUsers size={22} />}
          color="violet"
          description="Revenu Moyen par Utilisateur"
        />

        <KPICard
          title="LTV"
          value={`${kpis?.ltv.toFixed(0)}€`}
          icon={<IconTrendingUp size={22} />}
          color="indigo"
          description="Lifetime Value"
        />

        <KPICard
          title="Taux de Churn"
          value={`${kpis?.churnRate.toFixed(1)}%`}
          icon={<IconAlertCircle size={22} />}
          color="orange"
          description="Taux de désabonnement"
        />
      </SimpleGrid>

      {/* Graphique d'évolution du revenu */}
      <Grid mb="xl">
        <Grid.Col span={12}>
          <ReusableLineChart
            title="Évolution du Revenu"
            subtitle="Revenu par type d'abonnement sur les 12 derniers mois"
            data={revenueData}
            xAxisKey="date"
            series={[
              { dataKey: 'monthly', name: 'Mensuel', color: '#339AF0' },
              { dataKey: 'annual', name: 'Annuel', color: '#51CF66' },
              { dataKey: 'lifetime', name: 'Honoraire', color: '#CC5DE8' },
              { dataKey: 'totalRevenue', name: 'Total', color: '#000' },
            ]}
            height={400}
          />
        </Grid.Col>
      </Grid>

      {/* Section d'export */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Title order={3} size="h4" mb="md">
          Exports CSV
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Téléchargez les données financières au format CSV pour analyse ou comptabilité
        </Text>
        <Group>
          <Button
            leftSection={<IconFileSpreadsheet size={18} />}
            onClick={handleExportMonthlyCSV}
            loading={exportLoading}
            variant="light"
            color="blue"
          >
            Export Mensuel
          </Button>

          <Button
            leftSection={<IconDownload size={18} />}
            onClick={handleExportMembersCSV}
            loading={exportLoading}
            variant="light"
            color="teal"
          >
            Export Adhérents
          </Button>

          <Button
            leftSection={<IconCalculator size={18} />}
            onClick={handleExportAccountingCSV}
            loading={exportLoading}
            variant="light"
            color="violet"
          >
            Export Comptable
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}
