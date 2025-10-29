import { useState } from 'react';
import { Button, Text, Modal, Stack, Group, Alert } from '@mantine/core';
import { IconDatabaseImport, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { initializeMembershipPlans } from '../../../shared/services/membershipService';

interface InitializeMembershipPlansButtonProps {
  onSuccess: () => void;
}

export function InitializeMembershipPlansButton({
  onSuccess,
}: InitializeMembershipPlansButtonProps) {
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInitialize = async () => {
    setLoading(true);
    try {
      await initializeMembershipPlans();
      notifications.show({
        title: 'Succès',
        message: 'Les formules par défaut ont été créées',
        color: 'green',
      });
      onSuccess();
      setOpened(false);
    } catch (error) {
      console.error('Error initializing membership plans:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue lors de l\'initialisation',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        leftSection={<IconDatabaseImport size={16} />}
        variant="light"
        onClick={() => setOpened(true)}
      >
        Initialiser les données
      </Button>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Initialiser les formules d'abonnement"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="blue">
            <Text size="sm">
              Cette action va créer les 3 formules d'abonnement par défaut si
              aucune formule n'existe déjà.
            </Text>
          </Alert>

          <Text size="sm">
            Les formules suivantes seront créées :
          </Text>

          <Stack gap="xs" style={{ paddingLeft: '1rem' }}>
            <Text size="sm">• Membre Mensuel (15€/mois)</Text>
            <Text size="sm">• Membre Annuel (150€/an)</Text>
            <Text size="sm">• Membre d'Honneur (500€ à vie)</Text>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setOpened(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button onClick={handleInitialize} loading={loading}>
              Initialiser
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
