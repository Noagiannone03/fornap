import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  SimpleGrid,
  Grid,
  Group,
  Button,
  Text,
  Badge,
  ActionIcon,
  Card,
  Stack,
  Divider,
  Switch,
  Menu,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconCheck,
  IconX,
  IconTrendingUp,
  IconUsers,
  IconCurrencyEuro,
} from '@tabler/icons-react';
import { StatCard } from '../../components/stats/StatCard';
import { BarChart } from '../../components/charts/BarChart';

// Mock data
const membershipPlans = [
  {
    id: '1',
    name: 'Mensuel',
    type: 'monthly',
    price: 25,
    description: 'Abonnement mensuel flexible',
    subscriberCount: 245,
    totalRevenue: 6125,
    isActive: true,
    isPrimary: false,
    features: [
      { name: 'Accès aux événements', included: true },
      { name: '5 heures de coworking', included: true },
      { name: 'Réduction de 10%', included: true },
      { name: 'Accès VIP', included: false },
    ],
  },
  {
    id: '2',
    name: 'Annuel',
    type: 'annual',
    price: 250,
    description: 'Abonnement annuel - 2 mois offerts',
    subscriberCount: 182,
    totalRevenue: 45500,
    isActive: true,
    isPrimary: true,
    features: [
      { name: 'Accès aux événements', included: true },
      { name: '20 heures de coworking', included: true },
      { name: 'Réduction de 20%', included: true },
      { name: 'Accès VIP', included: true },
    ],
  },
  {
    id: '3',
    name: 'Honoraire',
    type: 'honorary',
    price: 0,
    description: 'Membres honoraires et partenaires',
    subscriberCount: 45,
    totalRevenue: 0,
    isActive: true,
    isPrimary: false,
    features: [
      { name: 'Accès aux événements', included: true },
      { name: 'Coworking illimité', included: true },
      { name: 'Réduction de 30%', included: true },
      { name: 'Accès VIP', included: true },
    ],
  },
];

const subscriptionStats = [
  { month: 'Jan', monthly: 220, annual: 165, honorary: 42 },
  { month: 'Fév', monthly: 235, annual: 170, honorary: 43 },
  { month: 'Mar', monthly: 240, annual: 175, honorary: 44 },
  { month: 'Avr', monthly: 242, annual: 180, honorary: 45 },
  { month: 'Mai', monthly: 245, annual: 182, honorary: 45 },
];

export function MembershipsPage() {
  const [plans, setPlans] = useState(membershipPlans);

  const handleToggleActive = (planId: string) => {
    setPlans(plans.map(plan =>
      plan.id === planId ? { ...plan, isActive: !plan.isActive } : plan
    ));
  };

  const handleEditPlan = (planId: string) => {
    console.log('Edit plan:', planId);
  };

  const handleDeletePlan = (planId: string) => {
    console.log('Delete plan:', planId);
  };

  const totalSubscribers = plans.reduce((sum, plan) => sum + plan.subscriberCount, 0);
  const totalRevenue = plans.reduce((sum, plan) => sum + plan.totalRevenue, 0);
  const averageRevenue = totalRevenue / totalSubscribers;

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Abonnements</Title>
        <Button leftSection={<IconPlus size={16} />}>
          Nouveau Plan
        </Button>
      </Group>

      {/* Stats Overview */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="xl">
        <StatCard
          title="Total Abonnés"
          value={totalSubscribers}
          icon={<IconUsers size={22} />}
          change={8.5}
          color="indigo"
        />
        <StatCard
          title="Revenu Total"
          value={`${totalRevenue.toLocaleString()}€`}
          icon={<IconCurrencyEuro size={22} />}
          change={12.3}
          color="green"
        />
        <StatCard
          title="Revenu Moyen"
          value={`${Math.round(averageRevenue)}€`}
          icon={<IconTrendingUp size={22} />}
          color="cyan"
          description="Par abonné"
        />
      </SimpleGrid>

      {/* Subscription Trends */}
      <Grid mb="xl">
        <Grid.Col span={12}>
          <BarChart
            title="Évolution des Abonnements"
            data={subscriptionStats}
            dataKey="month"
            series={[
              { name: 'monthly', color: 'blue.6' },
              { name: 'annual', color: 'green.6' },
              { name: 'honorary', color: 'grape.6' },
            ]}
            height={300}
          />
        </Grid.Col>
      </Grid>

      {/* Membership Plans */}
      <Title order={2} mb="md">
        Plans d'Abonnement
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            withBorder
            radius="md"
            shadow="sm"
            style={{
              border: plan.isPrimary ? '2px solid var(--mantine-color-indigo-6)' : undefined,
            }}
          >
            {plan.isPrimary && (
              <Badge
                color="indigo"
                variant="filled"
                style={{ position: 'absolute', top: 12, right: 12 }}
              >
                Populaire
              </Badge>
            )}

            <Group justify="space-between" mb="md">
              <div>
                <Text size="xl" fw={700}>
                  {plan.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {plan.description}
                </Text>
              </div>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconEdit size={14} />}
                    onClick={() => handleEditPlan(plan.id)}
                  >
                    Modifier
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    Supprimer
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            <Group align="baseline" mb="md">
              <Text size="2.5rem" fw={700} c="indigo">
                {plan.price}€
              </Text>
              <Text size="sm" c="dimmed">
                /{plan.type === 'monthly' ? 'mois' : plan.type === 'annual' ? 'an' : 'vie'}
              </Text>
            </Group>

            <Divider mb="md" />

            <Stack gap="xs" mb="md">
              {plan.features.map((feature, index) => (
                <Group key={index} gap="xs">
                  {feature.included ? (
                    <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <IconX size={16} color="var(--mantine-color-gray-5)" />
                  )}
                  <Text
                    size="sm"
                    c={feature.included ? 'black' : 'dimmed'}
                    style={{ textDecoration: feature.included ? 'none' : 'line-through' }}
                  >
                    {feature.name}
                  </Text>
                </Group>
              ))}
            </Stack>

            <Divider mb="md" />

            {/* Stats */}
            <Stack gap="xs" mb="md">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Abonnés actifs
                </Text>
                <Text size="sm" fw={600}>
                  {plan.subscriberCount}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Revenu total
                </Text>
                <Text size="sm" fw={600} c="green">
                  {plan.totalRevenue.toLocaleString()}€
                </Text>
              </Group>
            </Stack>

            <Divider mb="md" />

            <Group justify="space-between">
              <Text size="sm" fw={500}>
                {plan.isActive ? 'Actif' : 'Désactivé'}
              </Text>
              <Switch
                checked={plan.isActive}
                onChange={() => handleToggleActive(plan.id)}
                color="green"
              />
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
