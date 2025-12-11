import { useState, useEffect } from 'react';
import { Stack, Select, TextInput, Switch, TagsInput, Group, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useMembershipPlans } from '../../../../shared/hooks/useMembershipPlans';
import { AVAILABLE_TAGS } from '../../../../shared/types/user';
import type { AdminCreateUserData } from '../../../../shared/types/user';
import { getAllUniqueTags } from '../../../../shared/services/userService';
import { getTagNames } from '../../../../shared/services/tagService';

interface MembershipFormProps {
  form: UseFormReturnType<AdminCreateUserData>;
}

export function MembershipForm({ form }: MembershipFormProps) {
  const { plans, loading } = useMembershipPlans(false);
  const [allTags, setAllTags] = useState<string[]>(AVAILABLE_TAGS);

  useEffect(() => {
    loadAllTags();
  }, []);

  const loadAllTags = async () => {
    try {
      const [uniqueTags, configTags] = await Promise.all([
        getAllUniqueTags(),
        getTagNames(),
      ]);
      const mergedTags = Array.from(new Set([...AVAILABLE_TAGS, ...configTags, ...uniqueTags]));
      setAllTags(mergedTags.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} - ${plan.price}€ (${plan.period === 'month' ? 'Mensuel' : plan.period === 'year' ? 'Annuel' : 'A vie'})`,
  }));

  return (
    <Stack gap="md" mt="md">
      <Select
        label="Plan d'abonnement"
        placeholder="Selectionnez un plan"
        required
        data={planOptions}
        disabled={loading}
        {...form.getInputProps('planId')}
      />

      <Select
        label="Statut de paiement"
        required
        data={[
          { value: 'paid', label: 'Paye' },
          { value: 'pending', label: 'En attente' },
          { value: 'failed', label: 'Echec' },
        ]}
        {...form.getInputProps('paymentStatus')}
      />

      <Group grow>
        <TextInput
          label="Date de debut"
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
        placeholder="Selectionnez ou creez des tags"
        data={allTags}
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
        Note : Si le plan selectionne est un abonnement annuel, vous pourrez remplir le profil etendu a l'etape suivante.
        Le QR code sera genere automatiquement a partir de l'UID de l'utilisateur.
      </Text>
    </Stack>
  );
}
