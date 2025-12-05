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
  Table,
  Badge,
  Stack,
  Card,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconCurrencyEuro,
  IconShoppingCart,
  IconUsers,
  IconTrendingUp,
  IconAlertCircle,
  IconDownload,
  IconTicket,
  IconGift,
  IconCreditCard,
  IconRefresh,
  IconEye,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableLineChart } from '../../components/analytics/charts/ReusableLineChart';
import { ReusablePieChart } from '../../components/analytics/charts/ReusablePieChart';
import { ReusableBarChart } from '../../components/analytics/charts/ReusableBarChart';
import {
  getContributionKPIs,
  getContributionEvolution,
  getItemStatistics,
  getContributionGeographicData,
  getContributorDemographics,
  getRecentContributions,
  getRecentContributionsFullData,
  exportContributionsCSV,
} from '../../../shared/services/analytics/contributionAnalytics';
import type {
  ContributionKPIs,
  ContributionEvolutionData,
  ItemStatistics,
  ContributionGeographicData,
  ContributorDemographics,
  RecentContribution,
  Contribution,
} from '../../../shared/types/contribution';
import { ContributorDetailModal } from './ContributorDetailModal';

export function ContributionStatsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<ContributionKPIs | null>(null);
  const [evolutionData, setEvolutionData] = useState<ContributionEvolutionData[]>([]);
  const [itemStats, setItemStats] = useState<ItemStatistics[]>([]);
  const [geoData, setGeoData] = useState<ContributionGeographicData | null>(null);
  const [demographics, setDemographics] = useState<ContributorDemographics | null>(null);
  const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger toutes les données en parallèle
      const [
        kpisData,
        itemStatsData,
        geoDataResult,
        demographicsData,
        recentData,
      ] = await Promise.all([
        getContributionKPIs(),
        getItemStatistics(),
        getContributionGeographicData(),
        getContributorDemographics(),
        getRecentContributionsFullData(10),
      ]);

      setKpis(kpisData);
      setItemStats(itemStatsData);
      setGeoData(geoDataResult);
      setDemographics(demographicsData);
      setRecentContributions(recentData);

      // Charger l'évolution sur les 12 derniers mois
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const evolution = await getContributionEvolution(startDate, endDate);
      setEvolutionData(evolution);
    } catch (err) {
      console.error('Error loading contribution analytics data:', err);
      setError('Erreur lors du chargement des données de contributions');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      await exportContributionsCSV(startDate, endDate, true);

      notifications.show({
        title: 'Export réussi',
        message: 'Le fichier CSV des contributions a été téléchargé',
        color: 'green',
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      notifications.show({
        title: 'Erreur',
        message: "Erreur lors de l'export du fichier CSV",
        color: 'red',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = (contribution: Contribution) => {
    setSelectedContribution(contribution);
    setModalOpened(true);
  };

  // Préparer les données pour les graphiques
  const typeDistributionData = [
    { name: 'Pass', value: kpis?.passCount || 0, color: '#339AF0' },
    { name: 'Dons', value: kpis?.donationCount || 0, color: '#51CF66' },
  ];

  const ageDistributionData = demographics
    ? Object.entries(demographics.byAgeRange).map(([range, count]) => ({
        name: range,
        value: count,
      }))
    : [];

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Statistiques Contributions</Title>
        <Group>
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
          <Button
            leftSection={<IconDownload size={18} />}
            onClick={handleExportCSV}
            loading={exportLoading}
            variant="light"
          >
            Exporter CSV
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* KPIs principaux */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <KPICard
          title="Montant Total"
          value={`${kpis?.totalAmount.toFixed(0)}€`}
          icon={<IconCurrencyEuro size={22} />}
          color="green"
          description="Revenu total des contributions"
        />

        <KPICard
          title="Contributions Totales"
          value={kpis?.totalContributions.toString() || '0'}
          icon={<IconShoppingCart size={22} />}
          color="blue"
          description="Nombre total de contributions"
        />

        <KPICard
          title="Panier Moyen"
          value={`${kpis?.averageAmount.toFixed(2)}€`}
          icon={<IconTrendingUp size={22} />}
          color="violet"
          description="Montant moyen par contribution"
        />

        <KPICard
          title="Taux de Conversion"
          value={`${kpis?.conversionRate.toFixed(1)}%`}
          icon={<IconUsers size={22} />}
          color="teal"
          description={`${kpis?.memberConversions || 0} contributeurs devenus membres`}
        />
      </SimpleGrid>

      {/* Contributions AVEC et SANS contrepartie */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" mb="xl">
        <KPICard
          title="AVEC Contrepartie"
          value={kpis?.passCount.toString() || '0'}
          icon={<IconCreditCard size={22} />}
          color="blue"
          description="Pass donnant accès au membership"
        />

        <KPICard
          title="Pass Mensuels"
          value={kpis?.monthlyPassCount.toString() || '0'}
          icon={<IconTicket size={22} />}
          color="teal"
          description="PASS Love"
        />

        <KPICard
          title="Pass Annuels"
          value={kpis?.annualPassCount.toString() || '0'}
          icon={<IconTicket size={22} />}
          color="indigo"
          description="Autres PASS"
        />

        <KPICard
          title="SANS Contrepartie"
          value={kpis?.donationCount.toString() || '0'}
          icon={<IconGift size={22} />}
          color="pink"
          description="Dons libres"
        />
      </SimpleGrid>

      {/* Graphique d'évolution */}
      <Grid mb="xl">
        <Grid.Col span={12}>
          <ReusableLineChart
            title="Évolution des Contributions"
            subtitle="Montant des contributions par type sur les 12 derniers mois"
            data={evolutionData}
            xAxisKey="date"
            series={[
              { dataKey: 'passAmount', name: 'Pass', color: '#339AF0' },
              { dataKey: 'donationAmount', name: 'Dons', color: '#51CF66' },
              { dataKey: 'totalAmount', name: 'Total', color: '#000' },
            ]}
            height={400}
          />
        </Grid.Col>
      </Grid>

      {/* Distribution par type et démographie */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
        <ReusablePieChart
          title="Distribution par Type"
          subtitle="Répartition des contributions par type"
          data={typeDistributionData}
          height={300}
        />

        <ReusableBarChart
          title="Distribution par Âge"
          subtitle="Répartition des contributeurs par tranche d'âge"
          data={ageDistributionData}
          xAxisKey="name"
          series={[{ dataKey: 'value', name: 'Contributeurs', color: '#339AF0' }]}
          height={300}
        />
      </SimpleGrid>

      {/* Statistiques par Pass/Article */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Title order={3} size="h4" mb="md">
          Détail par Pass et Dons
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Répartition des contributions par type de pass ou don libre
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pass / Don</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Montant Total</Table.Th>
              <Table.Th>Montant Moyen</Table.Th>
              <Table.Th>Part du Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {itemStats.map((item) => {
              const isDonation = item.itemName === 'Don libre';
              return (
                <Table.Tr key={item.itemName}>
                  <Table.Td>
                    <Text fw={500}>{item.itemName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={isDonation ? 'pink' : 'blue'} variant="light" size="sm">
                      {isDonation ? 'Sans contrepartie' : 'Avec contrepartie'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{item.count}</Table.Td>
                  <Table.Td>{item.totalAmount.toFixed(2)}€</Table.Td>
                  <Table.Td>{item.averageAmount.toFixed(2)}€</Table.Td>
                  <Table.Td>
                    <Badge color="indigo" variant="light">
                      {item.percentage.toFixed(1)}%
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Distribution géographique */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Title order={3} size="h4" mb="md">
          Distribution Géographique
        </Title>
        <Text size="sm" c="dimmed" mb="lg">
          Total: {geoData?.totalPostalCodes} codes postaux différents
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Code Postal</Table.Th>
              <Table.Th>Contributions</Table.Th>
              <Table.Th>Montant Total</Table.Th>
              <Table.Th>Part du Total</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {geoData?.topPostalCodes.map((postal) => (
              <Table.Tr key={postal.postalCode}>
                <Table.Td>
                  <Text fw={500}>{postal.postalCode}</Text>
                </Table.Td>
                <Table.Td>{postal.count}</Table.Td>
                <Table.Td>{postal.totalAmount.toFixed(2)}€</Table.Td>
                <Table.Td>
                  <Badge color="teal" variant="light">
                    {postal.percentage.toFixed(1)}%
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Dernières contributions */}
      <Paper shadow="sm" p="md" radius="md" withBorder mb="xl">
        <Title order={3} size="h4" mb="md">
          Dernières Contributions
        </Title>
        <Text size="sm" c="dimmed" mb="md">
          Les 10 dernières contributions reçues (Pass et Dons)
        </Text>
        <Stack gap="sm">
          {recentContributions.map((contrib) => {
            const isDonation = contrib.type === 'donation';
            const contributorName = `${contrib.contributor?.prenom || ''} ${contrib.contributor?.nom || ''}`.trim();
            return (
              <Card key={contrib.id} withBorder shadow="xs">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Text fw={500} size="sm">
                        {contrib.contributor.pseudo}
                      </Text>
                      <Badge
                        size="xs"
                        color={isDonation ? 'pink' : 'blue'}
                        variant="light"
                      >
                        {isDonation ? 'Don' : 'Pass'}
                      </Badge>
                      {contrib.isMember && (
                        <Badge size="xs" color="teal" variant="filled">
                          Membre
                        </Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {contributorName} • {contrib.contributor.email}
                    </Text>
                    <Text size="xs" c="dimmed" fw={500}>
                      {contrib.itemName}
                    </Text>
                  </div>
                  <Group gap="xs" wrap="nowrap">
                    <div style={{ textAlign: 'right' }}>
                      <Text fw={700} size="lg" c="green">
                        {contrib.amount.toFixed(2)}€
                      </Text>
                      <Text size="xs" c="dimmed">
                        {formatDate(contrib.paidAt)}
                      </Text>
                    </div>
                    <Tooltip label="Voir tous les détails">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        size="lg"
                        onClick={() => handleViewDetails(contrib)}
                      >
                        <IconEye size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      </Paper>

      {/* Modal pour voir les détails d'une contribution */}
      <ContributorDetailModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        contribution={selectedContribution}
      />
    </Container>
  );
}
