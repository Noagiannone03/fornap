import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Group,
  Progress,
  Divider,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notifications } from '@mantine/notifications';
import { MEMBERSHIP_PLANS } from '../constants/membershipPlans';
import type { SignupFormData, MembershipType } from '../types/user';
import {
  authContainerStyles,
  authPaperStyles,
  authTitleStyles,
  authSubtitleStyles,
  authButtonStyles,
} from '../styles/authStyles';

export const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup } = useAuth();

  const planId = searchParams.get('plan') as MembershipType | null;
  const selectedPlan = MEMBERSHIP_PLANS.find((p) => p.id === planId);

  useEffect(() => {
    // Si pas de plan sélectionné, rediriger vers la page des abonnements
    if (!planId) {
      navigate('/membership');
    }
  }, [planId, navigate]);

  const form = useForm<SignupFormData>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phone: '',
      postalCode: '',
      membershipType: planId || 'monthly',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) =>
        value.length >= 8
          ? null
          : 'Le mot de passe doit contenir au moins 8 caractères',
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Les mots de passe ne correspondent pas',
      firstName: (value) => (value.trim() ? null : 'Le prénom est requis'),
      lastName: (value) => (value.trim() ? null : 'Le nom est requis'),
      dateOfBirth: (value) => (value ? null : 'La date de naissance est requise'),
      phone: (value) =>
        /^(\+33|0)[1-9](\d{2}){4}$/.test(value.replace(/\s/g, ''))
          ? null
          : 'Numéro de téléphone invalide',
      postalCode: (value) =>
        /^\d{5}$/.test(value) ? null : 'Code postal invalide (5 chiffres)',
    },
  });

  const calculateProgress = () => {
    const fields = [
      'email',
      'password',
      'confirmPassword',
      'firstName',
      'lastName',
      'dateOfBirth',
      'phone',
      'postalCode',
    ];
    const filledFields = fields.filter(
      (field) => form.values[field as keyof SignupFormData]
    ).length;
    return (filledFields / fields.length) * 100;
  };

  const handleSubmit = async (values: SignupFormData) => {
    setLoading(true);
    try {
      await signup(values);
      notifications.show({
        title: 'Bienvenue sur Fornap !',
        message: `Votre adhésion ${selectedPlan?.name} a été activée avec succès`,
        color: 'teal',
      });
      navigate('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue lors de l\'inscription',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPlan) return null;

  return (
    <Box style={authContainerStyles}>
      <Paper style={{ ...authPaperStyles, maxWidth: '600px' }}>
        <Stack gap="xl">
          {/* En-tête */}
          <div style={{ textAlign: 'center' }}>
            <Badge
              size="lg"
              color="dark"
              mb="md"
              styles={{
                root: {
                  background: '#000',
                  color: '#fff',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                },
              }}
            >
              {selectedPlan.name.toUpperCase()} - {selectedPlan.price}€
            </Badge>
            <Title order={1} style={authTitleStyles}>
              INSCRIPTION
            </Title>
            <Text style={authSubtitleStyles}>
              Complétez vos informations pour rejoindre la communauté
            </Text>
          </div>

          {/* Barre de progression */}
          <div>
            <Text size="sm" c="dimmed" mb="xs" fw={700}>
              Progression : {Math.round(calculateProgress())}%
            </Text>
            <Progress
              value={calculateProgress()}
              color="dark"
              size="md"
              radius="xl"
              styles={{
                root: {
                  background: '#e9ecef',
                  border: '1px solid #000',
                },
              }}
            />
          </div>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="xl">
              {/* Section Identifiants */}
              <div>
                <Text size="sm" fw={900} mb="md" c="#000">
                  IDENTIFIANTS DE CONNEXION
                </Text>
                <Stack gap="md">
                  <TextInput
                    label="Email"
                    placeholder="votre@email.com"
                    required
                    size="md"
                    styles={{
                      input: {
                        borderRadius: '12px',
                        height: '48px',
                        border: '2px solid #000',
                      },
                      label: {
                        fontWeight: 700,
                        color: '#000',
                      },
                    }}
                    {...form.getInputProps('email')}
                  />
                  <Group grow>
                    <PasswordInput
                      label="Mot de passe"
                      placeholder="••••••••"
                      required
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '12px',
                          height: '48px',
                          border: '2px solid #000',
                        },
                        label: {
                          fontWeight: 700,
                          color: '#000',
                        },
                      }}
                      {...form.getInputProps('password')}
                    />
                    <PasswordInput
                      label="Confirmer"
                      placeholder="••••••••"
                      required
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '12px',
                          height: '48px',
                          border: '2px solid #000',
                        },
                        label: {
                          fontWeight: 700,
                          color: '#000',
                        },
                      }}
                      {...form.getInputProps('confirmPassword')}
                    />
                  </Group>
                </Stack>
              </div>

              <Divider color="#000" />

              {/* Section Informations personnelles */}
              <div>
                <Text size="sm" fw={900} mb="md" c="#000">
                  INFORMATIONS PERSONNELLES
                </Text>
                <Stack gap="md">
                  <Group grow>
                    <TextInput
                      label="Prénom"
                      placeholder="Jean"
                      required
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '12px',
                          height: '48px',
                          border: '2px solid #000',
                        },
                        label: {
                          fontWeight: 700,
                          color: '#000',
                        },
                      }}
                      {...form.getInputProps('firstName')}
                    />
                    <TextInput
                      label="Nom"
                      placeholder="Dupont"
                      required
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '12px',
                          height: '48px',
                          border: '2px solid #000',
                        },
                        label: {
                          fontWeight: 700,
                          color: '#000',
                        },
                      }}
                      {...form.getInputProps('lastName')}
                    />
                  </Group>
                  <Group grow>
                    <TextInput
                      label="Date de naissance"
                      type="date"
                      required
                      size="md"
                      styles={{
                        input: {
                          borderRadius: '12px',
                          height: '48px',
                          border: '2px solid #000',
                        },
                        label: {
                          fontWeight: 700,
                          color: '#000',
                        },
                      }}
                      {...form.getInputProps('dateOfBirth')}
                    />
                    <TextInput
                      label="Code postal"
                      placeholder="75001"
                      required
                      size="md"
                      maxLength={5}
                      styles={{
                        input: {
                          borderRadius: '12px',
                          height: '48px',
                          border: '2px solid #000',
                        },
                        label: {
                          fontWeight: 700,
                          color: '#000',
                        },
                      }}
                      {...form.getInputProps('postalCode')}
                    />
                  </Group>
                  <TextInput
                    label="Téléphone"
                    placeholder="06 12 34 56 78"
                    required
                    size="md"
                    styles={{
                      input: {
                        borderRadius: '12px',
                        height: '48px',
                        border: '2px solid #000',
                      },
                      label: {
                        fontWeight: 700,
                        color: '#000',
                      },
                    }}
                    {...form.getInputProps('phone')}
                  />
                </Stack>
              </div>

              <Divider color="#000" />

              {/* Conditions et bouton */}
              <Stack gap="md">
                <Text size="xs" c="dimmed" ta="center">
                  En créant un compte, vous acceptez nos conditions d'utilisation
                  et notre politique de confidentialité.
                </Text>

                <Button
                  type="submit"
                  fullWidth
                  size="xl"
                  loading={loading}
                  style={authButtonStyles}
                  styles={{
                    root: {
                      borderRadius: '12px',
                      height: '56px',
                      fontSize: '1rem',
                      fontWeight: 900,
                    },
                  }}
                >
                  CRÉER MON COMPTE - {selectedPlan.price}€
                </Button>

                <Button
                  variant="outline"
                  color="dark"
                  onClick={() => navigate('/membership')}
                  disabled={loading}
                  styles={{
                    root: {
                      borderRadius: '12px',
                      borderWidth: '2px',
                      fontWeight: 700,
                      '&:hover': {
                        background: '#f1f3f5',
                      },
                    },
                  }}
                >
                  ← Changer de formule
                </Button>
              </Stack>
            </Stack>
          </form>

          <Divider color="#000" />

          <Text size="sm" ta="center" c="dimmed">
            Vous avez déjà un compte ?{' '}
            <Text
              component="span"
              fw={700}
              style={{
                color: '#000',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => navigate('/login')}
            >
              Se connecter
            </Text>
          </Text>
        </Stack>
      </Paper>
    </Box>
  );
};
