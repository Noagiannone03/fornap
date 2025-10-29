import { Stack, Title, Text, TextInput, Select, Checkbox, MultiSelect, Group, Button } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconBriefcase } from '@tabler/icons-react';
import type { ExtendedSignupFormData } from '../../../../shared/types/user';
import { AVAILABLE_SKILLS } from '../../../../shared/types/user';

interface ProfessionalInfoStepProps {
  form: UseFormReturnType<ExtendedSignupFormData>;
  onNext: () => void;
  onBack: () => void;
}

export const ProfessionalInfoStep = ({
  form,
  onNext,
  onBack,
}: ProfessionalInfoStepProps) => {
  const skillOptions = AVAILABLE_SKILLS.map((skill) => ({
    value: skill,
    label: skill.charAt(0).toUpperCase() + skill.slice(1).replace('_', ' '),
  }));

  const handleNext = () => {
    const errors = form.validate();
    if (!errors.hasErrors) {
      onNext();
    }
  };

  return (
    <Stack gap="lg">
      <div style={{ textAlign: 'center' }}>
        <IconBriefcase
          size={48}
          style={{ color: '#000', marginBottom: '1rem' }}
        />
        <Title order={2} size="h3" fw={900} c="#000" mb="xs">
          VIE ACTIVE & ENGAGEMENT
        </Title>
        <Text size="sm" c="dimmed">
          Partagez votre expérience professionnelle et vos compétences
        </Text>
      </div>

      <TextInput
        label="Profession / Domaine d'activité principal"
        placeholder="Ex: Développeur web, Enseignant, Artiste..."
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
        {...form.getInputProps('profession')}
      />

      <TextInput
        label="Domaine d'activité"
        placeholder="Ex: Technologie, Éducation, Arts..."
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
        {...form.getInputProps('activityDomain')}
      />

      <Select
        label="Statut professionnel"
        placeholder="Sélectionnez votre statut"
        required
        data={[
          { value: 'salaried', label: 'Salarié' },
          { value: 'independent', label: 'Indépendant' },
          { value: 'student', label: 'Étudiant' },
          { value: 'retired', label: 'Retraité' },
          { value: 'unemployed', label: 'Sans emploi' },
        ]}
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
        {...form.getInputProps('professionalStatus')}
      />

      <div>
        <Checkbox
          label="Je suis bénévole dans une autre organisation"
          size="md"
          styles={{
            label: {
              fontWeight: 600,
            },
          }}
          {...form.getInputProps('isVolunteer', { type: 'checkbox' })}
        />

        {form.values.isVolunteer && (
          <TextInput
            label="Dans quel(s) domaine(s) ?"
            placeholder="Ex: Environnement, Social, Culture..."
            mt="md"
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
            value={form.values.volunteerDomains?.join(', ') || ''}
            onChange={(e) =>
              form.setFieldValue(
                'volunteerDomains',
                e.currentTarget.value.split(',').map((d) => d.trim())
              )
            }
          />
        )}
      </div>

      <MultiSelect
        label="Compétences à mettre à disposition (bénévolement)"
        placeholder="Sélectionnez vos compétences"
        data={skillOptions}
        searchable
        size="md"
        styles={{
          input: {
            borderRadius: '12px',
            minHeight: '48px',
            border: '2px solid #000',
          },
          label: {
            fontWeight: 700,
            color: '#000',
          },
        }}
        {...form.getInputProps('skills')}
      />

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
