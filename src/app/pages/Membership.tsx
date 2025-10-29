import { useState } from 'react';
import {
  Box,
  Container,
  Title,
  Text,
  Card,
  Button,
  Stack,
  Group,
  Badge,
  List,
  ThemeIcon,
  Grid,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useMembershipPlans } from '../../shared/hooks/useMembershipPlans';

export const Membership = () => {
  const navigate = useNavigate();
  const { plans, loading, error } = useMembershipPlans(true); // Seulement les formules actives
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    navigate(`/signup?plan=${planId}`);
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'month':
        return '/ mois';
      case 'year':
        return '/ an';
      case 'lifetime':
        return 'à vie';
      default:
        return '';
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        padding: '4rem 1rem',
        position: 'relative',
      }}
    >
      <LoadingOverlay visible={loading} />

      <Container size="lg">
        <Stack gap="xl" align="center" mb={60}>
          <Title order={1} size={48} fw={900} ta="center" c="#000">
            ADHÉSION FORNAP
          </Title>
          <Text size="lg" c="dimmed" ta="center" maw={600}>
            Choisissez la formule qui vous correspond et profitez d'avantages exclusifs
          </Text>
        </Stack>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="xl">
            Une erreur est survenue lors du chargement des formules
          </Alert>
        )}

        {!loading && plans.length === 0 && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" mb="xl">
            Aucune formule d'abonnement n'est actuellement disponible. Veuillez
            réessayer plus tard.
          </Alert>
        )}

        <Grid gutter="xl">
          {plans.map((plan) => (
            <Grid.Col key={plan.id} span={{ base: 12, md: 4 }}>
              <Card
                padding="xl"
                radius="lg"
                style={{
                  height: '100%',
                  border: plan.isPrimary ? '4px solid #000' : '2px solid #000',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  background: 'white',
                }}
              >
                {plan.isPrimary && (
                  <Badge
                    size="lg"
                    color="dark"
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '20px',
                      background: '#000',
                      color: '#fff',
                      fontWeight: 900,
                    }}
                  >
                    RECOMMANDÉ
                  </Badge>
                )}

                <Stack gap="lg" style={{ height: '100%' }}>
                  <div>
                    <Text size="xl" fw={900} c="#000">
                      {plan.name.toUpperCase()}
                    </Text>
                    <Group gap="xs" align="baseline" mt="md">
                      <Text
                        size="3rem"
                        fw={900}
                        style={{
                          lineHeight: 1,
                          color: '#000',
                        }}
                      >
                        {plan.price}€
                      </Text>
                      <Text size="md" c="dimmed" fw={600}>
                        {getPeriodLabel(plan.period)}
                      </Text>
                    </Group>
                  </div>

                  <List
                    spacing="md"
                    size="sm"
                    style={{ flex: 1 }}
                    icon={
                      <ThemeIcon color="dark" size={24} radius="xl">
                        <IconCheck size={16} />
                      </ThemeIcon>
                    }
                  >
                    {plan.features.map((feature, index) => (
                      <List.Item key={index}>
                        <Text size="sm">{feature}</Text>
                      </List.Item>
                    ))}
                  </List>

                  <Button
                    fullWidth
                    size="lg"
                    variant={plan.isPrimary ? 'filled' : 'outline'}
                    color="dark"
                    onClick={() => handleSelectPlan(plan.id)}
                    styles={{
                      root: {
                        height: '56px',
                        fontSize: '1rem',
                        fontWeight: 900,
                        borderRadius: '12px',
                        borderWidth: '2px',
                        transition: 'all 0.2s ease',
                        background: plan.isPrimary ? '#000' : 'transparent',
                        color: plan.isPrimary ? '#fff' : '#000',
                        '&:hover': {
                          background: plan.isPrimary ? '#333' : '#000',
                          color: '#fff',
                        },
                      },
                    }}
                  >
                    {plan.period === 'lifetime' ? 'DEVENIR MEMBRE D\'HONNEUR' : 'CHOISIR'}
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        <Stack gap="md" align="center" mt={60}>
          <Text size="sm" c="dimmed">
            Vous avez déjà un compte ?
          </Text>
          <Button
            variant="outline"
            color="dark"
            onClick={() => navigate('/login')}
            styles={{
              root: {
                borderRadius: '12px',
                borderWidth: '2px',
                fontWeight: 700,
                '&:hover': {
                  background: '#000',
                  color: '#fff',
                },
              },
            }}
          >
            SE CONNECTER
          </Button>
        </Stack>

        <Card
          mt={60}
          padding="xl"
          radius="lg"
          style={{
            background: '#000',
            color: 'white',
            border: '3px solid #000',
          }}
        >
          <Stack gap="md" align="center">
            <Title order={2} size={28} fw={900} ta="center">
              QUESTIONS SUR NOS FORMULES ?
            </Title>
            <Text size="md" ta="center" maw={700}>
              Notre équipe est là pour vous accompagner dans votre choix.
              N'hésitez pas à nous contacter pour obtenir plus d'informations.
            </Text>
            <Button
              size="lg"
              variant="white"
              color="dark"
              styles={{
                root: {
                  borderRadius: '12px',
                  height: '48px',
                  fontWeight: 900,
                  background: '#fff',
                  color: '#000',
                  border: '2px solid #fff',
                  '&:hover': {
                    background: 'transparent',
                    color: '#fff',
                  },
                },
              }}
            >
              NOUS CONTACTER
            </Button>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
};
