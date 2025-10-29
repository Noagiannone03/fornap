import { Stack, Title, Text, TextInput, Checkbox, Textarea, Group, Button } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconUsers } from '@tabler/icons-react';
import type { ExtendedSignupFormData } from '../../../../shared/types/user';

interface EngagementStepProps {
  form: UseFormReturnType<ExtendedSignupFormData>;
  onNext: () => void;
  onBack: () => void;
}

export const EngagementStep = ({
  form,
  onNext,
  onBack,
}: EngagementStepProps) => {
  const handleNext = () => {
    const errors = form.validate();
    if (!errors.hasErrors || !form.values.howDidYouKnowUs) {
      // howDidYouKnowUs est le seul champ requis dans cette section
      onNext();
    }
  };

  return (
    <Stack gap="lg">
      <div style={{ textAlign: 'center' }}>
        <IconUsers
          size={48}
          style={{ color: '#000', marginBottom: '1rem' }}
        />
        <Title order={2} size="h3" fw={900} c="#000" mb="xs">
          IMPLICATION & FEEDBACK
        </Title>
        <Text size="sm" c="dimmed">
          Aidez-nous à mieux vous connaître et à améliorer notre communauté
        </Text>
      </div>

      <TextInput
        label="Comment nous avez-vous connus ?"
        placeholder="Ex: Réseaux sociaux, bouche-à-oreille, événement..."
        required
        size="md"
        styles={{
          input: {
            borderRadius: '12px',
            height: '48px',
            border: '2px solid #000',
          },
          label: {
            fontWeight: 700,
            color: '#000',
          },
        }}
        {...form.getInputProps('howDidYouKnowUs')}
      />

      <Textarea
        label="Suggestions ou idées pour le Fort (optionnel)"
        placeholder="Partagez vos idées pour améliorer notre espace..."
        minRows={3}
        size="md"
        styles={{
          input: {
            borderRadius: '12px',
            border: '2px solid #000',
          },
          label: {
            fontWeight: 700,
            color: '#000',
          },
        }}
        {...form.getInputProps('suggestions')}
      />

      <div>
        <Checkbox
          label="Je souhaite participer aux décisions et orientations du Fort"
          size="md"
          mb="md"
          styles={{
            label: {
              fontWeight: 600,
            },
          }}
          {...form.getInputProps('participationInterested', { type: 'checkbox' })}
        />

        {form.values.participationInterested && (
          <TextInput
            label="Dans quel(s) domaine(s) précis ?"
            placeholder="Ex: Programmation culturelle, communication, gestion..."
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
              label: {
                fontWeight: 700,
                color: '#000',
              },
            }}
            value={form.values.participationDomains?.join(', ') || ''}
            onChange={(e) =>
              form.setFieldValue(
                'participationDomains',
                e.currentTarget.value.split(',').map((d) => d.trim()).filter(Boolean)
              )
            }
          />
        )}
      </div>

      <Group justify="space-between" mt="xl">
        <Button
          variant="outline"
          color="dark"
          onClick={onBack}
          styles={{
            root: {
              borderRadius: '12px',
              borderWidth: '2px',
              fontWeight: 700,
            },
          }}
        >
          ← Retour
        </Button>
        <Button
          onClick={handleNext}
          styles={{
            root: {
              borderRadius: '12px',
              background: '#000',
              fontWeight: 900,
              '&:hover': {
                background: '#333',
              },
            },
          }}
        >
          Suivant →
        </Button>
      </Group>
    </Stack>
  );
};
