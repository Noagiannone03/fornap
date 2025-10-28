import { Stack, Title, Text, TextInput, PasswordInput, Button, Group } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { SignupFormData } from '../../../../shared/types';

interface CredentialsStepProps {
  form: UseFormReturnType<SignupFormData>;
  onNext: () => void;
  onBack: () => void;
}

export const CredentialsStep = ({ form, onNext, onBack }: CredentialsStepProps) => {
  const handleNext = () => {
    // Valider uniquement les champs de cette étape
    if (form.values.email && form.values.password && form.values.confirmPassword) {
      if (form.values.password === form.values.confirmPassword) {
        onNext();
      }
    }
  };

  return (
    <div className="slide-in-right">
      <Stack gap={24}>
        <div style={{ textAlign: 'center' }}>
          <Title
            order={2}
            size={24}
            fw={900}
            mb={8}
            style={{ letterSpacing: '0.01em' }}
          >
            Créez votre compte
          </Title>
          <Text size="sm" c="gray.6">
            Votre email et mot de passe
          </Text>
        </div>

        <Stack gap="md">
          <TextInput
            label="Email"
            placeholder="votre@email.com"
            size="lg"
            required
            styles={{
              input: {
                borderRadius: '8px',
                height: '48px',
                border: '2px solid #000',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                '&:focus': {
                  borderColor: '#000',
                  boxShadow: '0 0 0 3px rgba(0,0,0,0.08)',
                },
              },
              label: {
                fontWeight: 700,
                color: '#000',
                fontSize: '14px',
                marginBottom: '8px',
              },
            }}
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Mot de passe"
            placeholder="Minimum 8 caractères"
            size="lg"
            required
            styles={{
              input: {
                borderRadius: '8px',
                height: '48px',
                border: '2px solid #000',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                '&:focus': {
                  borderColor: '#000',
                  boxShadow: '0 0 0 3px rgba(0,0,0,0.08)',
                },
              },
              label: {
                fontWeight: 700,
                color: '#000',
                fontSize: '14px',
                marginBottom: '8px',
              },
            }}
            {...form.getInputProps('password')}
          />

          <PasswordInput
            label="Confirmation"
            placeholder="Retapez votre mot de passe"
            size="lg"
            required
            styles={{
              input: {
                borderRadius: '8px',
                height: '48px',
                border: '2px solid #000',
                fontSize: '16px',
                transition: 'all 0.3s ease',
                '&:focus': {
                  borderColor: '#000',
                  boxShadow: '0 0 0 3px rgba(0,0,0,0.08)',
                },
              },
              label: {
                fontWeight: 700,
                color: '#000',
                fontSize: '14px',
                marginBottom: '8px',
              },
            }}
            {...form.getInputProps('confirmPassword')}
          />
        </Stack>

        <Group justify="space-between" mt="lg">
          <Button
            variant="subtle"
            size="md"
            onClick={onBack}
            c="gray.7"
            styles={{
              root: {
                fontWeight: 600,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'transparent',
                  color: '#000',
                },
              },
            }}
          >
            ← Retour
          </Button>
          <Button
            size="lg"
            onClick={handleNext}
            disabled={
              !form.values.email ||
              !form.values.password ||
              !form.values.confirmPassword ||
              form.values.password !== form.values.confirmPassword
            }
            styles={{
              root: {
                background: '#000',
                color: '#fff',
                borderRadius: '8px',
                height: '48px',
                fontWeight: 700,
                minWidth: '160px',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: '#212529',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
                '&:disabled': {
                  background: '#e9ecef',
                  color: '#adb5bd',
                  cursor: 'not-allowed',
                },
              },
            }}
          >
            Continuer →
          </Button>
        </Group>
      </Stack>
    </div>
  );
};
