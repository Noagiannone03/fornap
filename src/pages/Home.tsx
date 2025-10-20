import { Container, Title, Text, Button, Stack, Grid, Paper } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero Section */}
      <div
        style={{
          backgroundColor: '#000',
          color: '#fff',
          padding: '120px 0',
          borderBottom: '2px solid #fff',
        }}
      >
        <Container size="lg">
          <Stack gap="xl" align="center">
            <Title
              order={1}
              size={64}
              fw={900}
              ta="center"
              style={{
                letterSpacing: '0.02em',
                animation: 'fadeIn 0.6s ease',
              }}
            >
              BIENVENUE À FORNAP
            </Title>
            <Text
              size="xl"
              ta="center"
              maw={600}
              c="gray.4"
              style={{ animation: 'fadeIn 0.8s ease' }}
            >
              Un espace de coworking et événementiel moderne, conçu pour les
              créateurs, entrepreneurs et innovateurs.
            </Text>
            <Button
              size="xl"
              variant="filled"
              bg="white"
              c="black"
              onClick={() => navigate('/membership')}
              styles={{
                root: {
                  fontSize: '18px',
                  padding: '18px 56px',
                  borderRadius: '16px',
                  fontWeight: 900,
                  height: '64px',
                  transition: 'all 0.3s ease',
                  animation: 'fadeIn 1s ease',
                  '&:hover': {
                    backgroundColor: '#e0e0e0',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 32px rgba(255,255,255,0.2)',
                  },
                  '&:active': {
                    transform: 'translateY(-2px)',
                  },
                },
              }}
            >
              REJOINDRE FORNAP
            </Button>
          </Stack>
        </Container>
      </div>

      {/* Features Section */}
      <Container size="lg" py={80}>
        <Title
          order={2}
          size={42}
          fw={900}
          ta="center"
          mb={60}
          style={{ letterSpacing: '0.01em' }}
        >
          NOS SERVICES
        </Title>

        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={24} fw={700}>
                  COWORKING
                </Title>
                <Text c="gray.7" size="md">
                  Des espaces de travail flexibles et inspirants, équipés de
                  tout le nécessaire pour votre productivité.
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={24} fw={700}>
                  ÉVÉNEMENTS
                </Title>
                <Text c="gray.7" size="md">
                  Organisez vos événements professionnels dans nos espaces
                  modulables et équipés.
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper
              p="xl"
              withBorder
              style={{
                borderWidth: 2,
                borderColor: '#000',
                borderRadius: '20px',
                height: '100%',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  },
                },
              }}
            >
              <Stack gap="md">
                <Title order={3} size={24} fw={700}>
                  COMMUNAUTÉ
                </Title>
                <Text c="gray.7" size="md">
                  Rejoignez une communauté dynamique de professionnels et
                  développez votre réseau.
                </Text>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Container>

      {/* CTA Section */}
      <div
        style={{
          backgroundColor: '#000',
          color: '#fff',
          padding: '80px 0',
          borderTop: '2px solid #fff',
        }}
      >
        <Container size="lg">
          <Stack gap="xl" align="center">
            <Title
              order={2}
              size={42}
              fw={900}
              ta="center"
              style={{ letterSpacing: '0.01em' }}
            >
              PRÊT À COMMENCER ?
            </Title>
            <Text size="lg" ta="center" c="gray.4" maw={600}>
              Créez votre compte dès maintenant et découvrez tous nos services.
            </Text>
            <Button
              size="xl"
              variant="outline"
              c="white"
              onClick={() => navigate('/membership')}
              styles={{
                root: {
                  borderColor: '#fff',
                  borderWidth: '2px',
                  borderRadius: '16px',
                  fontSize: '18px',
                  padding: '18px 56px',
                  height: '64px',
                  fontWeight: 900,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: '#fff',
                    color: '#000',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 32px rgba(255,255,255,0.2)',
                  },
                  '&:active': {
                    transform: 'translateY(-2px)',
                  },
                },
              }}
            >
              S'INSCRIRE MAINTENANT
            </Button>
          </Stack>
        </Container>
      </div>
    </div>
  );
};
