import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Stack,
  TextInput,
  LoadingOverlay,
} from '@mantine/core';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getUserById, updateUser } from '../../../shared/services/userService';
import type { User } from '../../../shared/types/user';

export function UserEditPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    if (uid) {
      loadUser();
    }
  }, [uid]);

  const loadUser = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const userData = await getUserById(uid);

      if (!userData) {
        notifications.show({
          title: 'Erreur',
          message: 'Utilisateur introuvable',
          color: 'red',
        });
        navigate('/admin/users');
        return;
      }

      setUser(userData);
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
      setPhone(userData.phone || '');
      setPostalCode(userData.postalCode || '');
    } catch (error) {
      console.error('Error loading user:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger l\'utilisateur',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!uid) return;

    try {
      setSaving(true);
      await updateUser(
        uid,
        {
          firstName,
          lastName,
          email,
          phone,
          postalCode,
        },
        'current-admin-id' // TODO: Utiliser l'ID de l'admin connecté
      );

      notifications.show({
        title: 'Succès',
        message: 'Utilisateur mis à jour',
        color: 'green',
      });

      navigate(`/admin/users/${uid}`);
    } catch (error) {
      console.error('Error updating user:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de mettre à jour l\'utilisateur',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <Container size="md" pos="relative">
        <LoadingOverlay visible={loading} />
      </Container>
    );
  }

  return (
    <Container size="md">
      <Group justify="space-between" mb="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(`/admin/users/${uid}`)}
          >
            Retour
          </Button>
          <Title order={1}>Modifier Utilisateur</Title>
        </Group>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Stack gap="md">
          <TextInput
            label="Prénom"
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Nom"
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Email"
            placeholder="email@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Téléphone"
            placeholder="+33 6 12 34 56 78"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
          />

          <TextInput
            label="Code Postal"
            placeholder="75001"
            value={postalCode}
            onChange={(e) => setPostalCode(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => navigate(`/admin/users/${uid}`)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              leftSection={<IconCheck size={16} />}
              onClick={handleSave}
              loading={saving}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
