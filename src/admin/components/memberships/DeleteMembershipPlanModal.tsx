import { useState } from 'react';
import { Modal, Text, Button, Group, Stack, Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { MembershipPlan } from '../../../shared/types/membership';
import { deleteMembershipPlan } from '../../../shared/services/membershipService';

interface DeleteMembershipPlanModalProps {
  opened: boolean;
  onClose: () => void;
  plan: MembershipPlan | null;
  onSuccess: () => void;
}

export function DeleteMembershipPlanModal({
  opened,
  onClose,
  plan,
  onSuccess,
}: DeleteMembershipPlanModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!plan) return;

    setLoading(true);
    try {
      await deleteMembershipPlan(plan.id);
      notifications.show({
        title: 'Succès',
        message: 'La formule a été supprimée',
        color: 'green',
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting membership plan:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la suppression',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Supprimer la formule"
      centered
    >
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="red">
          <Text size="sm">
            Cette action est irréversible. Assurez-vous qu'aucun utilisateur n'est
            actuellement abonné à cette formule.
          </Text>
        </Alert>

        <Text size="sm">
          Êtes-vous sûr de vouloir supprimer la formule{' '}
          <Text component="span" fw={700}>
            {plan?.name}
          </Text>{' '}
          ?
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button color="red" onClick={handleDelete} loading={loading}>
            Supprimer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
