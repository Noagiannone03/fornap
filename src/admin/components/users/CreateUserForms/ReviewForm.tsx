import { Stack, Text, Paper, Group, Badge, Divider, Title } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { AdminCreateUserData } from '../../../../shared/types/user';
import { PAYMENT_STATUS_LABELS } from '../../../../shared/types/user';

interface ReviewFormProps {
  form: UseFormReturnType<AdminCreateUserData>;
}

export function ReviewForm({ form }: ReviewFormProps) {
  const { values } = form;

  return (
    <Stack gap="md" mt="md">
      <Paper withBorder p="md">
        <Title order={4} mb="md">Informations de base</Title>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Nom complet</Text>
            <Text size="sm" fw={600}>{values.firstName} {values.lastName}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Email</Text>
            <Text size="sm">{values.email}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Téléphone</Text>
            <Text size="sm">{values.phone}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Code postal</Text>
            <Text size="sm">{values.postalCode}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Date de naissance</Text>
            <Text size="sm">{new Date(values.birthDate).toLocaleDateString('fr-FR')}</Text>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md">
        <Title order={4} mb="md">Abonnement</Title>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Plan</Text>
            <Text size="sm" fw={600}>{values.planId}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Statut de paiement</Text>
            <Badge size="sm" color={values.paymentStatus === 'paid' ? 'green' : 'orange'}>
              {PAYMENT_STATUS_LABELS[values.paymentStatus]}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Date de début</Text>
            <Text size="sm">{new Date(values.startDate).toLocaleDateString('fr-FR')}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Renouvellement auto</Text>
            <Badge size="sm" color={values.autoRenew ? 'green' : 'gray'}>
              {values.autoRenew ? 'Oui' : 'Non'}
            </Badge>
          </Group>
        </Stack>
      </Paper>

      {values.tags.length > 0 && (
        <Paper withBorder p="md">
          <Title order={4} mb="md">Tags</Title>
          <Group gap="xs">
            {values.tags.map((tag) => (
              <Badge key={tag} variant="light">
                {tag}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      <Paper withBorder p="md">
        <Title order={4} mb="md">Statut de la carte et du compte</Title>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Compte</Text>
            <Badge size="sm" color={values.isAccountBlocked ? 'red' : 'green'}>
              {values.isAccountBlocked ? 'Bloqué' : 'Actif'}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Carte</Text>
            <Badge size="sm" color={values.isCardBlocked ? 'red' : 'green'}>
              {values.isCardBlocked ? 'Bloquée' : 'Active'}
            </Badge>
          </Group>
        </Stack>
      </Paper>

      {values.extendedProfile && (
        <Paper withBorder p="md">
          <Title order={4} mb="md">Profil étendu</Title>
          <Text size="sm" c="dimmed">
            Le profil étendu a été rempli et sera inclus dans la création.
          </Text>
        </Paper>
      )}

      {values.adminNotes && (
        <Paper withBorder p="md">
          <Title order={4} mb="md">Notes administratives</Title>
          <Text size="sm">{values.adminNotes}</Text>
        </Paper>
      )}

      <Divider />

      <Text size="sm" c="dimmed" fs="italic">
        Vérifiez attentivement toutes les informations avant de créer l'utilisateur.
        Un QR code unique sera généré automatiquement à partir de l'UID.
      </Text>
    </Stack>
  );
}
