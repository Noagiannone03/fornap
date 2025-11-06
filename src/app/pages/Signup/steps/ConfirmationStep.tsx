import { Stack, Title, Text, Button, Group, Paper, Divider } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { SignupFormData } from '../../../../shared/types';

interface ConfirmationStepProps {
  form: UseFormReturnType<SignupFormData>;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  planName: string;
  planPrice: number;
}

export const ConfirmationStep = ({
  form,
  onSubmit,
  onBack,
  loading,
  planName,
  planPrice,
}: ConfirmationStepProps) => {
  return (
    <div className="scale-in">
      <Stack gap={20}>
        <div style={{ textAlign: 'center' }}>
          <Title
            order={2}
            size={24}
            fw={900}
            mb={8}
            style={{ letterSpacing: '0.01em' }}
          >
            Prêt à rejoindre Fornap ?
          </Title>
          <Text size="sm" c="gray.6">
            Vérifiez vos informations
          </Text>
        </div>

        <Paper
          p="md"
          style={{
            borderRadius: '8px',
            border: '2px solid #000',
            background: '#fafafa',
          }}
        >
          <Stack gap="sm">
            {/* Abonnement */}
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" fw={700} c="gray.6" tt="uppercase">
                  Formule
                </Text>
                <Text size="md" fw={900}>
                  {planName}
                </Text>
              </div>
              <Text size="lg" fw={900}>
                {planPrice}€
              </Text>
            </Group>

            <Divider color="#e0e0e0" />

            {/* Informations essentielles */}
            <Stack gap={6}>
              <Group justify="space-between">
                <Text size="xs" c="gray.7">Nom</Text>
                <Text size="xs" fw={600}>
                  {form.values.firstName} {form.values.lastName}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="gray.7">Email</Text>
                <Text size="xs" fw={600}>{form.values.email}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="xs" c="gray.7">Téléphone</Text>
                <Text size="xs" fw={600}>{form.values.phone}</Text>
              </Group>
            </Stack>
          </Stack>
        </Paper>

        <Text size="10px" c="dimmed" ta="center" lh={1.4}>
          En créant un compte, vous acceptez nos conditions
        </Text>

        <Group justify="space-between">
          <Button
            variant="subtle"
            size="md"
            onClick={onBack}
            disabled={loading}
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
            onClick={onSubmit}
            loading={loading}
            styles={{
              root: {
                background: '#000',
                color: '#fff',
                borderRadius: '8px',
                height: '48px',
                fontSize: '15px',
                fontWeight: 700,
                minWidth: '180px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: '#212529',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
              },
            }}
          >
            Créer mon compte
          </Button>
        </Group>
      </Stack>
    </div>
  );
};
