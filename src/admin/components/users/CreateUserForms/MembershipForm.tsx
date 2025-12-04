import { Stack, Select, TextInput, Switch, TagsInput, Group, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useMembershipPlans } from '../../../../shared/hooks/useMembershipPlans';
import { AVAILABLE_TAGS } from '../../../../shared/types/user';
import type { AdminCreateUserData } from '../../../../shared/types/user';

interface MembershipFormProps {
  form: UseFormReturnType<AdminCreateUserData>;
}

export function MembershipForm({ form }: MembershipFormProps) {
  const { plans, loading } = useMembershipPlans(false);

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - ${plan.price}€ (${plan.period === 'month' ? 'Mensuel' : plan.period === 'year' ? 'Annuel' : 'À vie'})`,
  }));

  return (
    <Stack gap="md" mt="md">
      <Select
        label="Plan d'abonnement"
        placeholder="Sélectionnez un plan"
        required
        data={planOptions}
        disabled={loading}
        {...form.getInputProps('planId')}
      />

      <Select
        label="Statut de paiement"
        required
        data={[
          { value: 'paid', label: 'Payé' },
          { value: 'pending', label: 'En attente' },
          { value: 'failed', label: 'Échec' },
        ]}
        {...form.getInputProps('paymentStatus')}
      />

      <Group grow>
        <TextInput
          label="Date de début"
          type="date"
          required
          {...form.getInputProps('startDate')}
        />
        <div style={{ paddingTop: '30px' }}>
          <Switch
            label="Renouvellement automatique"
            {...form.getInputProps('autoRenew', { type: 'checkbox' })}
          />
        </div>
      </Group>

      <TagsInput
        label="Tags"
        placeholder="Sélectionnez ou créez des tags"
        data={AVAILABLE_TAGS}
        clearable
        {...form.getInputProps('tags')}
      />

      <Group grow>
        <Switch
          label="Bloquer le compte"
          {...form.getInputProps('isAccountBlocked', { type: 'checkbox' })}
        />
        <Switch
          label="Bloquer la carte"
          {...form.getInputProps('isCardBlocked', { type: 'checkbox' })}
        />
      </Group>

      <Text size="sm" c="dimmed" fs="italic">
        Note : Si le plan sélectionné est un abonnement annuel, vous pourrez remplir le profil étendu à l'étape suivante.
        Le QR code sera généré automatiquement à partir de l'UID de l'utilisateur.
      </Text>
    </Stack>
  );
}
