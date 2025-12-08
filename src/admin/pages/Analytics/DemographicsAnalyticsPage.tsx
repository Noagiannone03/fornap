import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  SimpleGrid,
  Grid,
  LoadingOverlay,
  Alert,
  Paper,
  Text,
  Table,
  Badge,
} from '@mantine/core';
import {
  IconCalendar,
  IconMapPin,
  IconBriefcase,
  IconAlertCircle,
} from '@tabler/icons-react';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableBarChart } from '../../components/analytics/charts/ReusableBarChart';
import {
  getAgeDistribution,
  getGeographicDistribution,
  getProfessionalDistribution,
} from '../../../shared/services/analytics/demographicAnalytics';
import type {
  AgeDistributionData,
  GeographicData,
  ProfessionalData,
} from '../../../shared/types/user';

export function DemographicsAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ageData, setAgeData] = useState<AgeDistributionData | null>(null);
  const [geoData, setGeoData] = useState<GeographicData | null>(null);
  const [profData, setProfData] = useState<ProfessionalData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger la distribution par âge
      const ageDistribution = await getAgeDistribution();
      setAgeData(ageDistribution);

      // Charger la distribution géographique
      const geoDistribution = await getGeographicDistribution();
      setGeoData(geoDistribution);

      // Charger la distribution professionnelle
      const profDistribution = await getProfessionalDistribution();
      setProfData(profDistribution);
    } catch (err) {
      console.error('Error loading demographics analytics data:', err);
      setError('Erreur lors du chargement des données démographiques');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour le graphique de distribution par âge
  const ageChartData = ageData
    ? Object.entries(ageData.byRange).map(([range, count]) => ({
        range,
        count,
      }))
    : [];

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Title order={1} mb="xl">
        Analytics - Démographie
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* KPIs démographiques */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
        <KPICard
          title="Âge Moyen"
          value={`${ageData?.averageAge || 0} ans`}
          icon={<IconCalendar size={22} />}
          color="orange"
          description="Moyenne d'âge de tous les adhérents"
        />

        <KPICard
          title="Âge Médian"
          value={`${ageData?.medianAge || 0} ans`}
          icon={<IconCalendar size={22} />}
          color="yellow"
          description="Valeur médiane de l'âge"
        />

        <KPICard
          title="Codes Postaux"
          value={geoData?.totalPostalCodes || 0}
          icon={<IconMapPin size={22} />}
          color="blue"
          description="Nombre de codes postaux différents"
        />
      </SimpleGrid>

      {/* Graphique de distribution par âge */}
      <Grid mb="xl">
        <Grid.Col span={12}>
          <ReusableBarChart
            title="Distribution par Âge"
            subtitle="Répartition des adhérents par tranches d'âge"
            data={ageChartData}
            xAxisKey="range"
            series={[
              { dataKey: 'count', name: 'Nombre d\'adhérents', color: '#4DABF7' },
            ]}
            height={350}
          />
        </Grid.Col>
      </Grid>

      {/* Tableau des codes postaux */}
      <Grid mb="xl">
        <Grid.Col span={12}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} size="h4" mb="md">
              Top Codes Postaux
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Les 20 codes postaux avec le plus d'adhérents
            </Text>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code Postal</Table.Th>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Pourcentage</Table.Th>
                  <Table.Th>Mensuel</Table.Th>
                  <Table.Th>Annuel</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {geoData?.topPostalCodes.map((item) => (
                  <Table.Tr key={item.postalCode}>
                    <Table.Td>
                      <Text fw={600}>{item.postalCode}</Text>
                    </Table.Td>
                    <Table.Td>{item.count}</Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {item.percentage}%
                      </Badge>
                    </Table.Td>
                    <Table.Td>{item.byType.monthly}</Table.Td>
                    <Table.Td>{item.byType.annual}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Section professionnelle (si profils étendus disponibles) */}
      {profData && profData.totalWithExtendedProfile > 0 && (
        <>
          <Title order={2} size="h3" mb="md" mt="xl">
            Données Professionnelles
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="xl">
            <KPICard
              title="Profils Étendus"
              value={profData.totalWithExtendedProfile}
              icon={<IconBriefcase size={22} />}
              color="violet"
              description="Adhérents avec profil professionnel"
            />
          </SimpleGrid>

          {/* Tableaux des professions et domaines */}
          <Grid mb="xl">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper shadow="sm" p="md" radius="md" withBorder>
                <Title order={3} size="h4" mb="md">
                  Top Professions
                </Title>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Profession</Table.Th>
                      <Table.Th>Nombre</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {profData.topProfessions.map((item, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{item.profession}</Table.Td>
                        <Table.Td>
                          <Badge color="teal" variant="light">
                            {item.count}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Paper shadow="sm" p="md" radius="md" withBorder>
                <Title order={3} size="h4" mb="md">
                  Top Domaines d'Activité
                </Title>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Domaine</Table.Th>
                      <Table.Th>Nombre</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {profData.topActivityDomains.map((item, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>{item.domain}</Table.Td>
                        <Table.Td>
                          <Badge color="grape" variant="light">
                            {item.count}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Grid.Col>
          </Grid>
        </>
      )}
    </Container>
  );
}
