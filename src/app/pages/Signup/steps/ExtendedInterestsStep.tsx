import { Stack, Title, Text, MultiSelect, Group, Button, Textarea } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconHeart } from '@tabler/icons-react';
import type { ExtendedSignupFormData } from '../../../../shared/types/user';
import { EVENT_TYPES, ARTISTIC_DOMAINS, MUSIC_GENRES } from '../../../../shared/types/user';

interface ExtendedInterestsStepProps {
  form: UseFormReturnType<ExtendedSignupFormData>;
  onNext: () => void;
  onBack: () => void;
}

export const ExtendedInterestsStep = ({
  form,
  onNext,
  onBack,
}: ExtendedInterestsStepProps) => {
  const eventTypeOptions = EVENT_TYPES.map((type) => ({
    value: type,
    label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  }));

  const artisticDomainOptions = ARTISTIC_DOMAINS.map((domain) => ({
    value: domain,
    label: domain.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  }));

  const musicGenreOptions = MUSIC_GENRES.map((genre) => ({
    value: genre,
    label: genre.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  }));

  const handleNext = () => {
    onNext();
  };

  return (
    <Stack gap="lg">
      <div style={{ textAlign: 'center' }}>
        <IconHeart
          size={48}
          style={{ color: '#000', marginBottom: '1rem' }}
        />
        <Title order={2} size="h3" fw={900} c="#000" mb="xs">
          GOÛTS & INTÉRÊTS
        </Title>
        <Text size="sm" c="dimmed">
          Aidez-nous à mieux connaître vos préférences culturelles
        </Text>
      </div>

      <MultiSelect
        label="Types d'événements préférés"
        placeholder="Sélectionnez vos préférences"
        data={eventTypeOptions}
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
        {...form.getInputProps('eventTypes')}
      />

      <MultiSelect
        label="Domaines artistiques / culturels d'intérêt"
        placeholder="Sélectionnez vos domaines"
        data={artisticDomainOptions}
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
        {...form.getInputProps('artisticDomains')}
      />

      <MultiSelect
        label="Genres musicaux préférés (optionnel)"
        placeholder="Sélectionnez vos genres"
        data={musicGenreOptions}
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
        {...form.getInputProps('musicGenres')}
      />

      <Textarea
        label="Thèmes de conférences / ateliers souhaités"
        placeholder="Décrivez les thèmes qui vous intéressent..."
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
        value={form.values.conferenceThemes?.join(', ') || ''}
        onChange={(e) =>
          form.setFieldValue(
            'conferenceThemes',
            e.currentTarget.value.split(',').map((t) => t.trim()).filter(Boolean)
          )
        }
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
