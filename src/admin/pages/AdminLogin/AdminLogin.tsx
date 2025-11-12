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
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShield, IconAlertCircle, IconLock, IconMail, IconQrcode } from '@tabler/icons-react';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';

interface LoginFormValues {
  email: string;
  password: string;
}

export function AdminLogin() {
  const navigate = useNavigate();
  const { login, loading } = useAdminAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Redirection vers le dashboard admin
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Une erreur est survenue lors de la connexion');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Container size={460}>
        <Paper shadow="md" p={40} radius="lg" withBorder style={{ backgroundColor: 'white' }}>
          {/* Header avec icône */}
          <Center mb="xl">
            <ThemeIcon size={80} radius={80} variant="light" color="blue">
              <IconShield size={50} />
            </ThemeIcon>
          </Center>

          <Title order={2} ta="center" mb="xs" style={{ color: '#1a1b1e' }}>
            Panel Administrateur
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
                size="md"
                mt="md"
                loading={isSubmitting || loading}
                variant="gradient"
                gradient={{ from: 'indigo', to: 'violet' }}
              >
                Accéder au panel admin
              </Button>
            </Stack>
          </form>

          {/* Divider */}
          <Divider label="OU" labelPosition="center" my="lg" />

          {/* Bouton CheckIn */}
          <Button
            fullWidth
            size="md"
            variant="light"
            color="teal"
            leftSection={<IconQrcode size={20} />}
            onClick={() => navigate('/check-in')}
          >
            Système de vérification QR
          </Button>

          {/* Footer */}
          <Text c="dimmed" size="xs" ta="center" mt="xl">
            Panel réservé aux administrateurs uniquement
          </Text>
        </Paper>

        {/* Informations de sécurité */}
        <Paper shadow="sm" p="md" mt="md" withBorder>
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
