import { Stack, TextInput, Group } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { AdminCreateUserData } from '../../../../shared/types/user';

interface BasicInfoFormProps {
  form: UseFormReturnType<AdminCreateUserData>;
}

export function BasicInfoForm({ form }: BasicInfoFormProps) {
  return (
    <Stack gap="md" mt="md">
      <TextInput
        label="Email"
        placeholder="utilisateur@example.com"
        required
        {...form.getInputProps('email')}
      />

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

      <Group grow>
        <TextInput
          label="Date de naissance"
          type="date"
          required
          {...form.getInputProps('birthDate')}
        />
        <TextInput
          label="Code postal"
          placeholder="75001"
          required
          maxLength={5}
          {...form.getInputProps('postalCode')}
        />
      </Group>

      <TextInput
        label="Téléphone"
        placeholder="06 12 34 56 78"
        required
        {...form.getInputProps('phone')}
      />
    </Stack>
  );
}
