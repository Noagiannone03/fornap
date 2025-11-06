import { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Group,
  MultiSelect,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { notifications } from '@mantine/notifications';

const INTERESTS_OPTIONS = [
  { value: 'tech', label: 'Technologie' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'entrepreneurship', label: 'Entrepreneuriat' },
  { value: 'events', label: 'Événementiel' },
  { value: 'networking', label: 'Networking' },
  { value: 'education', label: 'Éducation' },
];

export const Profile = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userProfile, updateUserProfile } = useAuth();

  const form = useForm({
    initialValues: {
      firstName: userProfile?.firstName || '',
      lastName: userProfile?.lastName || '',
      dateOfBirth: userProfile?.birthDate ? userProfile.birthDate.toDate().toISOString().split('T')[0] : '',
      phone: userProfile?.phone || '',
      interests: userProfile?.extendedProfile?.interests?.eventTypes || [],
    },
    validate: {
      firstName: (value) => (value ? null : 'Prénom requis'),
      lastName: (value) => (value ? null : 'Nom requis'),
    },
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await updateUserProfile(values);
      notifications.show({
        title: 'Profil mis à jour !',
        message: 'Vos informations ont été enregistrées',
        color: 'green',
      });
      navigate('/dashboard');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py={40}>
      <Paper p={40} withBorder style={{ borderWidth: 2, borderColor: '#000' }}>
        <Stack gap="lg">
          <div>
            <Title order={1} size={32} fw={900} mb="xs">
              MODIFIER MON PROFIL
            </Title>
            <Text c="gray.7">Mettez à jour vos informations personnelles</Text>
          </div>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <Group grow>
                <TextInput
                  label="Prénom"
                  placeholder="Jean"
                  required
                  {...form.getInputProps('firstName')}
                />
                <TextInput
                  label="Nom"
                  placeholder="Dupont"
                  required
                  {...form.getInputProps('lastName')}
                />
              </Group>

              <TextInput
                label="Date de naissance"
                placeholder="01/01/1990"
                type="date"
                {...form.getInputProps('dateOfBirth')}
              />

              <TextInput
                label="Téléphone"
                placeholder="+33 6 12 34 56 78"
                {...form.getInputProps('phone')}
              />

              <MultiSelect
                label="Centres d'intérêt"
                placeholder="Choisissez vos domaines d'intérêt"
                data={INTERESTS_OPTIONS}
                {...form.getInputProps('interests')}
              />

              <Group justify="space-between" mt="xl">
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  ANNULER
                </Button>
                <Button type="submit" loading={loading}>
                  ENREGISTRER
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
};
