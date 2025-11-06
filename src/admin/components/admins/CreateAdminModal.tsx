/**
 * ============================================
 * CREATE ADMIN MODAL
 * ============================================
 * Modal pour créer un nouveau compte administrateur
 */

import { useState } from 'react';
import {
  Modal,
  TextInput,
  PasswordInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
  Textarea,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { AdminRole, ADMIN_ROLES_CONFIG } from '../../../shared/types/admin';
import type { CreateAdminData } from '../../../shared/types/admin';
import { createAdmin, getAssignableRoles } from '../../../shared/services/adminService';
import { notifications } from '@mantine/notifications';

interface CreateAdminModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAdminModal({ opened, onClose, onSuccess }: CreateAdminModalProps) {
  const { adminProfile } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateAdminData>({
    initialValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: AdminRole.SUPPORT,
      metadata: {
        phone: '',
        notes: '',
      },
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
      firstName: (value) => (!value ? 'Le prénom est requis' : null),
      lastName: (value) => (!value ? 'Le nom est requis' : null),
      role: (value) => (!value ? 'Le rôle est requis' : null),
    },
  });

  const handleSubmit = async (values: CreateAdminData) => {
    if (!adminProfile) return;

    try {
      setLoading(true);
      setError(null);

      await createAdmin(adminProfile.uid, values);

      notifications.show({
        title: 'Admin créé !',
        message: 'Vous allez être déconnecté. Reconnectez-vous avec vos identifiants.',
        color: 'blue',
        autoClose: 5000,
      });

      form.reset();
      onSuccess();
      onClose();

      // Informer l'utilisateur qu'il va être déconnecté
      setTimeout(() => {
        window.location.href = '/admin/login';
      }, 2000);
    } catch (err: any) {
      console.error('Create admin error:', err);
      setError(err.message || 'Erreur lors de la création de l\'administrateur');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setError(null);
    onClose();
  };

  // Récupérer les rôles assignables
  const assignableRoles = adminProfile
    ? getAssignableRoles(adminProfile.role).map((role) => ({
        value: role,
        label: ADMIN_ROLES_CONFIG[role].label,
        description: ADMIN_ROLES_CONFIG[role].description,
      }))
    : [];

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Créer un administrateur"
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Erreur" color="red">
              {error}
            </Alert>
          )}

          {/* Informations personnelles */}
          <Text size="sm" fw={600} c="dimmed">
            Informations personnelles
          </Text>

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
            label="Email"
            placeholder="admin@fornap.com"
            type="email"
            required
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Mot de passe"
            placeholder="Minimum 6 caractères"
            required
            {...form.getInputProps('password')}
          />

          {/* Rôle */}
          <Text size="sm" fw={600} c="dimmed" mt="md">
            Rôle et permissions
          </Text>

          <Select
            label="Rôle"
            placeholder="Sélectionner un rôle"
            data={assignableRoles}
            required
            {...form.getInputProps('role')}
            renderOption={({ option }) => {
              const roleOption = option as typeof option & { description?: string };
              return (
                <div>
                  <Text size="sm" fw={500}>
                    {roleOption.label}
                  </Text>
                  {roleOption.description && (
                    <Text size="xs" c="dimmed">
                      {roleOption.description}
                    </Text>
                  )}
                </div>
              );
            }}
          />

          {/* Métadonnées optionnelles */}
          <Text size="sm" fw={600} c="dimmed" mt="md">
            Informations supplémentaires (optionnel)
          </Text>

          <TextInput
            label="Téléphone"
            placeholder="+33 6 12 34 56 78"
            {...form.getInputProps('metadata.phone')}
          />

          <Textarea
            label="Notes"
            placeholder="Informations supplémentaires..."
            minRows={3}
            {...form.getInputProps('metadata.notes')}
          />

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              Créer l'administrateur
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
