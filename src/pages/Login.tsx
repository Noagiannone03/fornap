import { useState } from 'react';
import {
  Box,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Anchor,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notifications } from '@mantine/notifications';
import {
  authContainerStyles,
  authPaperStyles,
  authTitleStyles,
  authSubtitleStyles,
  authButtonStyles,
  authButtonOutlineStyles,
  authLinkStyles,
} from '../styles/authStyles';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) =>
        value.length >= 6 ? null : 'Le mot de passe doit contenir au moins 6 caractères',
    },
  });

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      notifications.show({
        title: 'Connexion réussie !',
        message: 'Bon retour sur Fornap',
        color: 'dark',
      });
      navigate('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur de connexion',
        message: 'Email ou mot de passe incorrect',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box style={authContainerStyles}>
      <Paper style={authPaperStyles} className="fade-in">
        <Stack gap="xl">
          <div style={{ textAlign: 'center' }}>
            <Title order={1} style={{ ...authTitleStyles, fontSize: '2.5rem' }}>
              CONNEXION
            </Title>
            <Text style={authSubtitleStyles} size="lg" mt="sm">
              Accédez à votre espace membre
            </Text>
          </div>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="lg">
              <TextInput
                label="Adresse email"
                placeholder="votre@email.com"
                size="lg"
                required
                styles={{
                  input: {
                    borderRadius: '16px',
                    height: '56px',
                    border: '2px solid #000',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    '&:focus': {
                      borderColor: '#000',
                      boxShadow: '0 0 0 3px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                    },
                  },
                  label: {
                    fontWeight: 700,
                    color: '#000',
                    fontSize: '15px',
                    marginBottom: '8px',
                  },
                }}
                {...form.getInputProps('email')}
              />
              <PasswordInput
                label="Mot de passe"
                placeholder="••••••••••••"
                size="lg"
                required
                styles={{
                  input: {
                    borderRadius: '16px',
                    height: '56px',
                    border: '2px solid #000',
                    fontSize: '16px',
                    transition: 'all 0.3s ease',
                    '&:focus': {
                      borderColor: '#000',
                      boxShadow: '0 0 0 3px rgba(0,0,0,0.1)',
                      transform: 'translateY(-2px)',
                    },
                  },
                  label: {
                    fontWeight: 700,
                    color: '#000',
                    fontSize: '15px',
                    marginBottom: '8px',
                  },
                }}
                {...form.getInputProps('password')}
              />

              <Anchor
                size="sm"
                style={{ ...authLinkStyles, alignSelf: 'flex-end' }}
                onClick={() => {
                  notifications.show({
                    title: 'Fonctionnalité à venir',
                    message: 'La récupération de mot de passe sera bientôt disponible',
                    color: 'dark',
                  });
                }}
              >
                Mot de passe oublié ?
              </Anchor>

              <Button
                type="submit"
                fullWidth
                size="xl"
                loading={loading}
                styles={{
                  root: {
                    borderRadius: '16px',
                    height: '64px',
                    fontSize: '18px',
                    fontWeight: 900,
                    background: '#000',
                    transition: 'all 0.3s ease',
                    marginTop: '8px',
                    '&:hover': {
                      background: '#212529',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  },
                }}
              >
                SE CONNECTER
              </Button>
            </Stack>
          </form>

          <Divider
            label="OU"
            labelPosition="center"
            color="#000"
            styles={{
              label: {
                fontWeight: 700,
                fontSize: '14px',
              },
            }}
          />

          <Stack gap="md" align="center">
            <Text size="md" c="dimmed" fw={500}>
              Vous avez déjà un QR code ?
            </Text>
            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={() => navigate('/qr-login')}
              styles={{
                root: {
                  borderRadius: '16px',
                  height: '56px',
                  fontSize: '16px',
                  fontWeight: 700,
                  borderWidth: '2px',
                  borderColor: '#000',
                  color: '#000',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: '#f8f9fa',
                    transform: 'translateY(-2px)',
                  },
                },
              }}
            >
              Se connecter avec un QR code
            </Button>
          </Stack>

          <Divider color="#e9ecef" />

          <Stack gap="md" align="center">
            <Text size="md" c="dimmed" fw={500}>
              Pas encore de compte ?
            </Text>
            <Button
              variant="outline"
              fullWidth
              size="xl"
              onClick={() => navigate('/membership')}
              styles={{
                root: {
                  borderRadius: '16px',
                  height: '64px',
                  fontSize: '18px',
                  fontWeight: 900,
                  borderWidth: '2px',
                  borderColor: '#000',
                  color: '#000',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: '#000',
                    color: '#fff',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  },
                  '&:active': {
                    transform: 'translateY(0)',
                  },
                },
              }}
            >
              CRÉER UN COMPTE
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
