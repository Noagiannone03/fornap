/**
 * ============================================
 * EDIT ADMIN MODAL
 * ============================================
 * Modal pour modifier un compte administrateur
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  Button,
  Stack,
  Group,
  Text,
  Textarea,
  Alert,
  Switch,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { AdminRole, ADMIN_ROLES_CONFIG, UpdateAdminData, AdminUser } from '../../../shared/types/admin';
import { updateAdmin, getAssignableRoles } from '../../../shared/services/adminService';
import { notifications } from '@mantine/notifications';

interface EditAdminModalProps {
  opened: boolean;
  onClose: () => void;
  admin: AdminUser;
  onSuccess: () => void;
}

export function EditAdminModal({ opened, onClose, admin, onSuccess }: EditAdminModalProps) {
  const { adminProfile } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UpdateAdminData>({
    initialValues: {
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      isActive: admin.isActive,
      metadata: {
        phone: admin.metadata?.phone || '',
        notes: admin.metadata?.notes || '',
      },
    },
    validate: {
      firstName: (value) => (!value ? 'Le prénom est requis' : null),
      lastName: (value) => (!value ? 'Le nom est requis' : null),
      role: (value) => (!value ? 'Le rôle est requis' : null),
    },
  });

  // Réinitialiser le formulaire quand l'admin change
  useEffect(() => {
    form.setValues({
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      isActive: admin.isActive,
      metadata: {
        phone: admin.metadata?.phone || '',
        notes: admin.metadata?.notes || '',
      },
    });
  }, [admin]);

  const handleSubmit = async (values: UpdateAdminData) => {
    if (!adminProfile) return;

    try {
      setLoading(true);
      setError(null);

      await updateAdmin(adminProfile.uid, admin.uid, values);

      notifications.show({
        title: 'Succès',
        message: 'Administrateur modifié avec succès',
        color: 'green',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Update admin error:', err);
      setError(err.message || 'Erreur lors de la modification de l\'administrateur');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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
      title={`Modifier ${admin.firstName} ${admin.lastName}`}
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
            value={admin.email}
            disabled
            description="L'email ne peut pas être modifié"
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
            renderOption={({ option }) => (
              <div>
                <Text size="sm" fw={500}>
                  {option.label}
                </Text>
                <Text size="xs" c="dimmed">
                  {option.description}
                </Text>
              </div>
            )}
          />

          <Switch
            label="Compte actif"
            description="Un compte inactif ne peut pas se connecter"
            {...form.getInputProps('isActive', { type: 'checkbox' })}
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
              Enregistrer les modifications
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
