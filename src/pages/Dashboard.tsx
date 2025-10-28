import {
  Box,
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
import { QRCodeDisplay } from '../components/common/QRCodeDisplay';

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
  const isActive = userProfile.subscription?.status === 'active';

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
            <Text c="dimmed" size="lg">
              Bienvenue sur votre espace membre
            </Text>
          </div>
          <Button
            variant="outline"
            color="dark"
            onClick={() => navigate('/profile')}
            styles={{
              root: {
                borderWidth: '2px',
                borderRadius: '12px',
                fontWeight: 700,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  background: '#000',
                  color: '#fff',
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
                    <Text fw={700}>Nom complet</Text>
                    <Text c="dimmed">
                      {userProfile.firstName} {userProfile.lastName}
                    </Text>
                  </Group>

                  <Group justify="space-between">
                    <Text fw={700}>Email</Text>
                    <Text c="dimmed">{userProfile.email}</Text>
                  </Group>

                  {userProfile.phone && (
                    <Group justify="space-between">
                      <Text fw={700}>Téléphone</Text>
                      <Text c="dimmed">{userProfile.phone}</Text>
                    </Group>
                  )}

                  {userProfile.dateOfBirth && (
                    <Group justify="space-between">
                      <Text fw={700}>Date de naissance</Text>
                      <Text c="dimmed">
                        {new Date(userProfile.dateOfBirth).toLocaleDateString(
                          'fr-FR'
                        )}
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
                        radius="md"
                        styles={{
                          root: { borderWidth: 2, fontWeight: 700 },
                        }}
                      >
                        {interest.toUpperCase()}
                      </Badge>
                    ))}
                  </Group>
                ) : (
                  <Text c="dimmed">Aucun centre d'intérêt renseigné</Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          {/* Carte Abonnement */}
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
                background: '#ffffff',
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
              <Stack gap="lg">
                <Title order={3} size={20} fw={700}>
                  MON ABONNEMENT
                </Title>

                {userProfile.subscription ? (
                  <Stack gap="lg">
                    <Group justify="space-between">
                      <Text fw={700}>Type</Text>
                      <Badge
                        variant="filled"
                        color="dark"
                        size="lg"
                        radius="md"
                        fw={900}
                      >
                        {userProfile.subscription.type.toUpperCase()}
                      </Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text fw={700}>Statut</Text>
                      <Badge
                        variant={isActive ? 'filled' : 'outline'}
                        color="dark"
                        size="lg"
                        radius="md"
                        fw={900}
                        styles={{ root: { borderWidth: 2 } }}
                      >
                        {isActive ? 'ACTIF' : 'INACTIF'}
                      </Badge>
                    </Group>

                    {daysRemaining !== null && isActive && (
                      <Box
                        p="lg"
                        style={{
                          border: '2px solid #000',
                          borderRadius: '12px',
                          background: '#f8f9fa',
                        }}
                      >
                        <Stack align="center" gap={0}>
                          <Text size="48px" fw={900} lh={1} c="#000">
                            {daysRemaining}
                          </Text>
                          <Text size="sm" fw={700} c="#000">
                            JOURS RESTANTS
                          </Text>
                          <Text size="xs" c="dimmed" mt="xs">
                            Expire le{' '}
                            {new Date(
                              userProfile.subscription.endDate
                            ).toLocaleDateString('fr-FR')}
                          </Text>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Text c="dimmed">
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
                background: '#ffffff',
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
                  <Text c="dimmed" size="sm" fw={600}>
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
              <Stack gap="lg" align="center">
                <Title order={3} size={20} fw={700}>
                  MON QR CODE D'ACCÈS
                </Title>

                <Text size="sm" c="dimmed" ta="center" maw={600}>
                  Présentez ce QR code à l'entrée du Fornap pour accéder à
                  l'espace
                </Text>

                {userProfile.qrCode ? (
                  <QRCodeDisplay
                    uid={userProfile.uid}
                    firstName={userProfile.firstName}
                    lastName={userProfile.lastName}
                    size={250}
                    showDownloadButton={true}
                    showUserInfo={false}
                  />
                ) : (
                  <Text c="dimmed" ta="center" maw={500} my="lg">
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
