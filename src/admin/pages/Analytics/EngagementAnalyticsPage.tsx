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
  Stack,
  Group,
} from '@mantine/core';
import {
  IconUsers,
  IconHeartHandshake,
  IconChecks,
  IconAlertCircle,
  IconStar,
  IconBulb,
} from '@tabler/icons-react';
import { KPICard } from '../../components/analytics/stats/KPICard';
import { ReusableBarChart } from '../../components/analytics/charts/ReusableBarChart';
import {
  getEngagementKPIs,
  getInterestsAnalytics,
  getSkillsAnalytics,
  getAcquisitionChannels,
} from '../../../shared/services/analytics/engagementAnalytics';
import type {
  EngagementKPIs,
  InterestsAnalytics,
  SkillsData,
  AcquisitionData,
} from '../../../shared/types/user';

export function EngagementAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<EngagementKPIs | null>(null);
  const [interests, setInterests] = useState<InterestsAnalytics | null>(null);
  const [skills, setSkills] = useState<SkillsData | null>(null);
  const [acquisition, setAcquisition] = useState<AcquisitionData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les KPIs d'engagement
      const kpisData = await getEngagementKPIs();
      setKpis(kpisData);

      // Charger les centres d'intérêt
      const interestsData = await getInterestsAnalytics();
      setInterests(interestsData);

      // Charger les compétences
      const skillsData = await getSkillsAnalytics();
      setSkills(skillsData);

      // Charger les canaux d'acquisition
      const acquisitionData = await getAcquisitionChannels();
      setAcquisition(acquisitionData);
    } catch (err) {
      console.error('Error loading engagement analytics data:', err);
      setError('Erreur lors du chargement des données d\'engagement');
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour les graphiques
  const eventTypesData = interests?.eventTypes.slice(0, 10).map((item) => ({
    name: item.type,
    count: item.count,
    percentage: item.percentage,
  })) || [];

  const artisticDomainsData = interests?.artisticDomains.slice(0, 10).map((item) => ({
    name: item.domain,
    count: item.count,
    percentage: item.percentage,
  })) || [];

  const musicGenresData = interests?.musicGenres.slice(0, 10).map((item) => ({
    name: item.genre,
    count: item.count,
    percentage: item.percentage,
  })) || [];

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Title order={1} mb="xl">
        Analytics - Engagement
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          {error}
        </Alert>
      )}

      {/* KPIs d'engagement */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
        <KPICard
          title="Profils Étendus"
          value={kpis?.totalExtendedProfiles || 0}
          icon={<IconUsers size={22} />}
          color="blue"
          description={`${kpis?.profileCompletionRate.toFixed(1)}% des adhérents`}
        />

        <KPICard
          title="Bénévoles"
          value={kpis?.volunteerCount || 0}
          icon={<IconHeartHandshake size={22} />}
          color="green"
          description="Adhérents disposés à aider"
        />

        <KPICard
          title="Intéressés Participation"
          value={kpis?.participationInterestedCount || 0}
          icon={<IconChecks size={22} />}
          color="teal"
          description="Souhaitent participer aux activités"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="xl">
        <KPICard
          title="Profils Publics"
          value={`${kpis?.publicProfileConsentRate.toFixed(1)}%`}
          icon={<IconUsers size={22} />}
          color="violet"
          description="Taux de consentement profil public"
        />

        <KPICard
          title="Compétences Totales"
          value={kpis?.totalSkillsAvailable || 0}
          icon={<IconStar size={22} />}
          color="orange"
          description="Compétences déclarées"
        />

        <KPICard
          title="Compétences Uniques"
          value={kpis?.uniqueSkillsCount || 0}
          icon={<IconBulb size={22} />}
          color="yellow"
          description="Types de compétences différentes"
        />
      </SimpleGrid>

      {/* Graphiques des centres d'intérêt */}
      <Title order={2} size="h3" mb="md" mt="xl">
        Centres d'Intérêt
      </Title>

      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ReusableBarChart
            title="Types d'Événements Préférés"
            subtitle="Top 10 des types d'événements"
            data={eventTypesData}
            xAxisKey="name"
            series={[
              { dataKey: 'count', name: 'Nombre', color: '#339AF0' },
            ]}
            height={350}
            horizontal
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <ReusableBarChart
            title="Domaines Artistiques"
            subtitle="Top 10 des domaines artistiques"
            data={artisticDomainsData}
            xAxisKey="name"
            series={[
              { dataKey: 'count', name: 'Nombre', color: '#51CF66' },
            ]}
            height={350}
            horizontal
          />
        </Grid.Col>
      </Grid>

      <Grid mb="xl">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <ReusableBarChart
            title="Genres Musicaux"
            subtitle="Top 10 des genres musicaux préférés"
            data={musicGenresData}
            xAxisKey="name"
            series={[
              { dataKey: 'count', name: 'Nombre', color: '#CC5DE8' },
            ]}
            height={350}
            horizontal
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} size="h4" mb="md">
              Canaux d'Acquisition
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Comment les adhérents ont-ils connu l'association ?
            </Text>

            <Stack gap="sm">
              {acquisition?.channels.slice(0, 10).map((channel, index) => (
                <Paper key={index} p="xs" withBorder>
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>
                      {channel.source}
                    </Text>
                    <Group gap="xs">
                      <Badge color="blue" variant="light">
                        {channel.count}
                      </Badge>
                      <Badge color="grape" variant="light">
                        {channel.percentage}%
                      </Badge>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* Section compétences */}
      <Title order={2} size="h3" mb="md" mt="xl">
        Compétences Disponibles
      </Title>

      <Grid mb="xl">
        <Grid.Col span={12}>
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} size="h4" mb="md">
              Top Compétences
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Compétences les plus fréquentes parmi les adhérents
            </Text>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Compétence</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Bénévoles</Table.Th>
                  <Table.Th>Membres Publics</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {skills?.bySkill.slice(0, 15).map((item, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text fw={600}>{item.skill}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {item.totalCount}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="green" variant="light">
                        {item.volunteersCount}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="violet" variant="light">
                        {item.members.length}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
