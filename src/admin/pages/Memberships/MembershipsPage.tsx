import { useState } from 'react';
import {
  Container,
  Title,
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
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconCheck,
  IconTrendingUp,
  IconUsers,
  IconCurrencyEuro,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { StatCard } from '../../components/stats/StatCard';
import { BarChart } from '../../components/charts/BarChart';
import { useMembershipPlansWithStats } from '../../../shared/hooks/useMembershipPlans';
import { toggleMembershipPlanActive } from '../../../shared/services/membershipService';
import { MembershipPlanModal } from '../../components/memberships/MembershipPlanModal';
import { DeleteMembershipPlanModal } from '../../components/memberships/DeleteMembershipPlanModal';
import { InitializeMembershipPlansButton } from '../../components/memberships/InitializeMembershipPlansButton';
import type { MembershipPlanWithStats } from '../../../shared/types/membership';

// Mock data pour les stats historiques (à remplacer par de vraies données)
const subscriptionStats = [
  { month: 'Jan', monthly: 220, annual: 165 },
  { month: 'Fév', monthly: 235, annual: 170 },
  { month: 'Mar', monthly: 240, annual: 175 },
  { month: 'Avr', monthly: 242, annual: 180 },
  { month: 'Mai', monthly: 245, annual: 182 },
];

export function MembershipsPage() {
  const { plans, loading, error, refresh } = useMembershipPlansWithStats(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanWithStats | null>(null);

  const handleToggleActive = async (planId: string, currentState: boolean) => {
    try {
      await toggleMembershipPlanActive(planId, !currentState);
      notifications.show({
        title: 'Succès',
        message: 'Le statut de la formule a été mis à jour',
        color: 'green',
      });
      refresh();
    } catch (error) {
      console.error('Error toggling plan active status:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue',
        color: 'red',
      });
    }
  };

  const handleEditPlan = (plan: MembershipPlanWithStats) => {
    setSelectedPlan(plan);
    setModalOpened(true);
  };

  const handleDeletePlan = (plan: MembershipPlanWithStats) => {
    setSelectedPlan(plan);
    setDeleteModalOpened(true);
  };

  const handleCreateNew = () => {
    setSelectedPlan(null);
    setModalOpened(true);
  };

  const totalSubscribers = plans.reduce((sum, plan) => sum + (plan.stats?.subscriberCount || 0), 0);
  const totalRevenue = plans.reduce((sum, plan) => sum + (plan.stats?.totalRevenue || 0), 0);
  const averageRevenue = totalSubscribers > 0 ? totalRevenue / totalSubscribers : 0;

  return (
    <Container size="xl" pos="relative">
      <LoadingOverlay visible={loading} />

      <Group justify="space-between" mb="xl">
        <Title order={1}>Gestion des Abonnements</Title>
        <Group>
          {plans.length === 0 && !loading && (
            <InitializeMembershipPlansButton onSuccess={refresh} />
          )}
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreateNew}>
            Nouveau Plan
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
          Une erreur est survenue lors du chargement des formules
        </Alert>
      )}

      {!loading && plans.length === 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="xl">
          Aucune formule d'abonnement n'existe encore. Cliquez sur "Initialiser les
          données" pour créer les formules par défaut.
        </Alert>
      )}

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
                    onClick={() => handleEditPlan(plan)}
                  >
                    Modifier
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => handleDeletePlan(plan)}
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
                /{plan.period === 'month' ? 'mois' : plan.period === 'year' ? 'an' : 'vie'}
              </Text>
            </Group>

            <Divider mb="md" />

            <Stack gap="xs" mb="md">
              {plan.features.map((feature, index) => (
                <Group key={index} gap="xs">
                  <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  <Text size="sm">
                    {feature}
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
                  {plan.stats?.subscriberCount || 0}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Revenu total
                </Text>
                <Text size="sm" fw={600} c="green">
                  {(plan.stats?.totalRevenue || 0).toLocaleString()}€
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
                onChange={() => handleToggleActive(plan.id, plan.isActive)}
                color="green"
              />
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Modals */}
      <MembershipPlanModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        plan={selectedPlan}
        onSuccess={refresh}
      />

      <DeleteMembershipPlanModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        plan={selectedPlan}
        onSuccess={refresh}
      />
    </Container>
  );
}
