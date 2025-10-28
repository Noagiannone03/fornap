import { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  Badge,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { SignupFormData } from '../../../../shared/types';

interface InterestsStepProps {
  form: UseFormReturnType<SignupFormData>;
  onNext: () => void;
  onBack: () => void;
}

const AVAILABLE_INTERESTS = [
  'Coworking',
  'Entrepreneuriat',
  'Technologie',
  'Design',
  'Marketing',
  'Événementiel',
  'Networking',
  'Innovation',
  'Créativité',
  'Développement personnel',
  'Art',
  'Musique',
];

export const InterestsStep = ({ form, onNext, onBack }: InterestsStepProps) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    form.values.interests || []
  );

  const toggleInterest = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter((i) => i !== interest)
      : [...selectedInterests, interest];
    setSelectedInterests(newInterests);
    form.setFieldValue('interests', newInterests);
  };

  const handleNext = () => {
    onNext();
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
            Vos centres d'intérêt
          </Title>
          <Text size="sm" c="gray.6">
            Sélectionnez ce qui vous passionne (optionnel)
          </Text>
        </div>

        <div>
          <Group gap={8} justify="center">
            {AVAILABLE_INTERESTS.map((interest) => (
              <Badge
                key={interest}
                size="lg"
                variant={
                  selectedInterests.includes(interest) ? 'filled' : 'outline'
                }
                color="dark"
                style={{
                  borderRadius: '16px',
                  borderWidth: 2,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '10px 18px',
                  transition: 'all 0.2s ease',
                  background: selectedInterests.includes(interest)
                    ? '#000'
                    : 'transparent',
                  color: selectedInterests.includes(interest)
                    ? '#fff'
                    : '#000',
                  transform: selectedInterests.includes(interest)
                    ? 'scale(1.03)'
                    : 'scale(1)',
                }}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
          </Group>
        </div>

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
