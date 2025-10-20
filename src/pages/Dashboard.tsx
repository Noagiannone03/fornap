import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Grid,
  Group,
  Badge,
  Button,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  if (!userProfile) {
    return null;
  }

  // Calculer les jours restants pour l'abonnement
  const getDaysRemaining = () => {
    if (!userProfile.subscription?.endDate) return null;
    const endDate = new Date(userProfile.subscription.endDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Container size="lg" py={40}>
      <Stack gap="xl">
        <Group justify="space-between" align="center" className="fade-in">
          <div>
            <Title
              order={1}
              size={36}
              fw={900}
              style={{ letterSpacing: '0.01em' }}
            >
              BONJOUR, {userProfile.firstName.toUpperCase()}
            </Title>
            <Text c="gray.7" size="lg">
              Bienvenue sur votre espace membre
            </Text>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            styles={{
              root: {
                borderWidth: '2px',
                borderRadius: '12px',
                fontWeight: 700,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                },
              },
            }}
          >
            MODIFIER MON PROFIL
          </Button>
        </Group>

        <Grid gutter="xl">
          {/* Carte Profil */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={20} fw={700}>
                  MES INFORMATIONS
                </Title>

                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={500}>Nom complet</Text>
                    <Text c="gray.7">
                      {userProfile.firstName} {userProfile.lastName}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text fw={500}>Email</Text>
                    <Text c="gray.7">{userProfile.email}</Text>
                  </Group>

                  {userProfile.phone && (
                    <Group justify="space-between">
                      <Text fw={500}>Téléphone</Text>
                      <Text c="gray.7">{userProfile.phone}</Text>
                    </Group>
                  )}

                  {userProfile.dateOfBirth && (
                    <Group justify="space-between">
                      <Text fw={500}>Date de naissance</Text>
                      <Text c="gray.7">
                        {new Date(userProfile.dateOfBirth).toLocaleDateString('fr-FR')}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Carte Centres d'intérêt */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={20} fw={700}>
                  MES CENTRES D'INTÉRÊT
                </Title>

                {userProfile.interests && userProfile.interests.length > 0 ? (
                  <Group gap="xs">
                    {userProfile.interests.map((interest) => (
                      <Badge
                        key={interest}
                        variant="outline"
                        color="dark"
                        size="lg"
                        style={{
                          borderWidth: 2,
                          borderRadius: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {interest.toUpperCase()}
                      </Badge>
                    ))}
                  </Group>
                ) : (
                  <Text c="gray.6">Aucun centre d'intérêt renseigné</Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Carte Abonnement avec temps restant */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
                background:
                  userProfile.subscription?.status === 'active'
                    ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                    : '#ffffff',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={20} fw={700}>
                  MON ABONNEMENT
                </Title>

                {userProfile.subscription ? (
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={500}>Type</Text>
                      <Badge
                        variant="filled"
                        color={
                          userProfile.subscription.status === 'active'
                            ? 'green'
                            : 'gray'
                        }
                        style={{
                          borderRadius: '12px',
                          fontWeight: 700,
                          padding: '8px 16px',
                        }}
                      >
                        {userProfile.subscription.type.toUpperCase()}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text fw={500}>Statut</Text>
                      <Badge
                        variant="outline"
                        color={
                          userProfile.subscription.status === 'active'
                            ? 'green'
                            : 'gray'
                        }
                        style={{
                          borderRadius: '12px',
                          borderWidth: 2,
                          fontWeight: 700,
                        }}
                      >
                        {userProfile.subscription.status === 'active'
                          ? 'ACTIF'
                          : 'INACTIF'}
                      </Badge>
                    </Group>
                    {daysRemaining !== null && (
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background:
                            daysRemaining > 30
                              ? '#d3f9d8'
                              : daysRemaining > 7
                              ? '#fff3bf'
                              : '#ffe0e0',
                          border: `2px solid ${
                            daysRemaining > 30
                              ? '#2f9e44'
                              : daysRemaining > 7
                              ? '#f59f00'
                              : '#fa5252'
                          }`,
                        }}
                      >
                        <Text
                          size="xl"
                          fw={900}
                          ta="center"
                          c={
                            daysRemaining > 30
                              ? 'green.8'
                              : daysRemaining > 7
                              ? 'yellow.9'
                              : 'red.8'
                          }
                        >
                          {daysRemaining} JOURS RESTANTS
                        </Text>
                        <Text size="xs" ta="center" c="gray.7" mt={4}>
                          Expire le{' '}
                          {new Date(
                            userProfile.subscription.endDate
                          ).toLocaleDateString('fr-FR')}
                        </Text>
                      </div>
                    )}
                  </Stack>
                ) : (
                  <Text c="gray.6">
                    Aucun abonnement actif. Contactez-nous pour découvrir nos
                    offres !
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Carte Fidélité */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(135deg, #ffffff 0%, #fff9db 100%)',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={20} fw={700}>
                  MES POINTS FIDÉLITÉ
                </Title>

                <div>
                  <Text size="48px" fw={900} style={{ letterSpacing: '-0.02em' }}>
                    {userProfile.loyaltyPoints || 0}
                  </Text>
                  <Text c="gray.6" size="sm" fw={600}>
                    points accumulés
                  </Text>
                </div>
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Carte QR Code */}
          <Grid.Col span={{ base: 12 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                transition: 'all 0.3s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md" align="center">
                <Title order={3} size={20} fw={700}>
                  MON QR CODE D'ACCÈS
                </Title>

                {userProfile.qrCode ? (
                  <div
                    style={{
                      width: 200,
                      height: 200,
                      border: '2px solid #000',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8f9fa',
                    }}
                  >
                    {/* QR Code sera généré ici */}
                    <Text c="gray.6" fw={700}>
                      QR Code
                    </Text>
                  </div>
                ) : (
                  <Text c="gray.6" ta="center" maw={500}>
                    Votre QR code sera généré après l'activation de votre
                    abonnement
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};
