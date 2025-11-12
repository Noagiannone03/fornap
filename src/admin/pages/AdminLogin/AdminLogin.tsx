/**
 * ============================================
 * ADMIN LOGIN PAGE
 * ============================================
 * Page de connexion dédiée aux administrateurs
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Box,
  Center,
  Group,
  ThemeIcon,
  SimpleGrid,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShield, IconAlertCircle, IconLock, IconMail, IconQrcode } from '@tabler/icons-react';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';

interface LoginFormValues {
  email: string;
  password: string;
}

type LoginMode = 'choice' | 'admin' | 'checkin';

export function AdminLogin() {
  const navigate = useNavigate();
  const { login, loading } = useAdminAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<LoginMode>('choice');

  const form = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'L\'email est requis';
        if (!/^\S+@\S+\.\S+$/.test(value)) return 'Email invalide';
        return null;
      },
      password: (value) => {
        if (!value) return 'Le mot de passe est requis';
        if (value.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
        return null;
      },
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setError(null);
      setIsSubmitting(true);

      await login(values.email, values.password);

      // Redirection en fonction du mode choisi
      if (mode === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (mode === 'checkin') {
        navigate('/check-in', { replace: true });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mode choix : afficher deux grandes cartes
  if (mode === 'choice') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <Container size={900}>
          <Stack gap="xl" align="center">
            {/* Header */}
            <Stack gap="md" align="center">
              <ThemeIcon size={100} radius={100} variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                <IconShield size={60} />
              </ThemeIcon>
              <Title order={1} size={48} c="dark" fw={900} ta="center">
                FORNAP
              </Title>
              <Text size="xl" c="dimmed" ta="center" fw={500}>
                Choisissez votre espace
              </Text>
            </Stack>

            {/* Deux grandes cartes de choix */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" w="100%">
              {/* Carte Panel Admin */}
              <Paper
                shadow="xl"
                p="xl"
                radius="lg"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '3px solid transparent',
                  minHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onClick={() => setMode('admin')}
              >
                <Stack gap="lg" align="center">
                  <ThemeIcon size={120} radius={120} variant="light" color="indigo">
                    <IconShield size={70} />
                  </ThemeIcon>
                  <Stack gap="xs" align="center">
                    <Title order={2} size={28} fw={900} ta="center">
                      Panel Admin
                    </Title>
                    <Text size="md" c="dimmed" ta="center">
                      Accéder au tableau de bord complet pour gérer utilisateurs, événements, analytics et plus
                    </Text>
                  </Stack>
                  <Button
                    size="lg"
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'violet' }}
                    fullWidth
                    leftSection={<IconShield size={20} />}
                    styles={{
                      root: {
                        height: '56px',
                        fontSize: '16px',
                        fontWeight: 700,
                      },
                    }}
                  >
                    ACCÉDER AU PANEL
                  </Button>
                </Stack>
              </Paper>

              {/* Carte Vérification QR */}
              <Paper
                shadow="xl"
                p="xl"
                radius="lg"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '3px solid transparent',
                  minHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.borderColor = '#0ca678';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onClick={() => setMode('checkin')}
              >
                <Stack gap="lg" align="center">
                  <ThemeIcon size={120} radius={120} variant="light" color="teal">
                    <IconQrcode size={70} />
                  </ThemeIcon>
                  <Stack gap="xs" align="center">
                    <Title order={2} size={28} fw={900} ta="center">
                      Vérification QR
                    </Title>
                    <Text size="md" c="dimmed" ta="center">
                      Scanner les QR codes des membres pour vérifier les abonnements et gérer les check-ins
                    </Text>
                  </Stack>
                  <Button
                    size="lg"
                    variant="gradient"
                    gradient={{ from: 'teal', to: 'green' }}
                    fullWidth
                    leftSection={<IconQrcode size={20} />}
                    styles={{
                      root: {
                        height: '56px',
                        fontSize: '16px',
                        fontWeight: 700,
                      },
                    }}
                  >
                    ACCÉDER AU SCANNER
                  </Button>
                </Stack>
              </Paper>
            </SimpleGrid>

            {/* Footer */}
            <Text c="dimmed" size="sm" ta="center">
              Espaces réservés aux administrateurs uniquement
            </Text>
          </Stack>
        </Container>
      </Box>
    );
  }

  // Mode login (admin ou check-in)
  return (
    <Box
      style={{
        minHeight: '100vh',
        background: mode === 'admin'
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #0ca678 0%, #099268 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Container size={460}>
        <Paper shadow="xl" p={40} radius="lg" withBorder style={{ backgroundColor: 'white' }}>
          {/* Header avec icône */}
          <Center mb="xl">
            <ThemeIcon
              size={80}
              radius={80}
              variant="light"
              color={mode === 'admin' ? 'indigo' : 'teal'}
            >
              {mode === 'admin' ? <IconShield size={50} /> : <IconQrcode size={50} />}
            </ThemeIcon>
          </Center>

          <Title order={2} ta="center" mb="xs" style={{ color: '#1a1b1e' }}>
            {mode === 'admin' ? 'Panel Administrateur' : 'Système de Vérification'}
          </Title>

          <Text c="dimmed" size="sm" ta="center" mb="xl">
            Connectez-vous avec votre compte administrateur
          </Text>

          {/* Alerte d'erreur */}
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red" mb="md">
              {error}
            </Alert>
          )}

          {/* Formulaire de connexion */}
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="admin@fornap.com"
                size="md"
                leftSection={<IconMail size={18} />}
                autoComplete="email"
                autoFocus
                {...form.getInputProps('email')}
              />

              <PasswordInput
                label="Mot de passe"
                placeholder="Votre mot de passe"
                size="md"
                leftSection={<IconLock size={18} />}
                autoComplete="current-password"
                {...form.getInputProps('password')}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                mt="md"
                loading={isSubmitting || loading}
                variant="gradient"
                gradient={
                  mode === 'admin'
                    ? { from: 'indigo', to: 'violet' }
                    : { from: 'teal', to: 'green' }
                }
                styles={{
                  root: {
                    height: '56px',
                    fontSize: '16px',
                    fontWeight: 700,
                  },
                }}
              >
                SE CONNECTER
              </Button>

              <Button
                variant="subtle"
                fullWidth
                onClick={() => setMode('choice')}
                color="gray"
                mt="xs"
              >
                ← Retour au choix
              </Button>
            </Stack>
          </form>
        </Paper>

        {/* Informations de sécurité */}
        <Paper shadow="sm" p="md" mt="md" withBorder style={{ background: 'rgba(255,255,255,0.95)' }}>
          <Group gap="xs">
            <IconAlertCircle size={16} color="orange" />
            <Text size="xs" c="dimmed">
              Assurez-vous d'être sur une connexion sécurisée. Ne partagez jamais vos identifiants.
            </Text>
          </Group>
        </Paper>
      </Container>
    </Box>
  );
}
