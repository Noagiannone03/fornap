import { Stack, Title, Text, TextInput, Select, Radio, Group, Button, Checkbox } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconDeviceMobile } from '@tabler/icons-react';
import type { ExtendedSignupFormData } from '../../../../shared/types/user';

interface CommunicationPreferencesStepProps {
  form: UseFormReturnType<ExtendedSignupFormData>;
  onNext: () => void;
  onBack: () => void;
}

export const CommunicationPreferencesStep = ({
  form,
  onNext,
  onBack,
}: CommunicationPreferencesStepProps) => {
  const handleNext = () => {
    onNext();
  };

  return (
    <Stack gap="lg">
      <div style={{ textAlign: 'center' }}>
        <IconDeviceMobile
          size={48}
          style={{ color: '#000', marginBottom: '1rem' }}
        />
        <Title order={2} size="h3" fw={900} c="#000" mb="xs">
          COMMUNICATION
        </Title>
        <Text size="sm" c="dimmed">
          Préférences de contact et réseaux sociaux
        </Text>
      </div>

      <Select
        label="Préférence de contact pour les infos générales"
        placeholder="Comment souhaitez-vous être contacté ?"
        required
        data={[
          { value: 'email', label: 'Email' },
          { value: 'sms', label: 'SMS' },
          { value: 'social', label: 'Réseaux sociaux' },
          { value: 'app', label: 'Application mobile' },
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
        {...form.getInputProps('preferredContact')}
      />

      <div>
        <Text size="sm" fw={700} c="#000" mb="md">
          Comptes sociaux (optionnel)
        </Text>
        <Stack gap="sm">
          <TextInput
            placeholder="@votre_compte"
            label="Instagram"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('instagram')}
          />
          <TextInput
            placeholder="@votre_compte"
            label="Facebook"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('facebook')}
          />
          <TextInput
            placeholder="@votre_compte"
            label="LinkedIn"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('linkedin')}
          />
          <TextInput
            placeholder="@votre_compte"
            label="TikTok"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('tiktok')}
          />
          <TextInput
            placeholder="https://youtube.com/@votre_chaine"
            label="YouTube"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('youtube')}
          />
          <TextInput
            placeholder="https://votre-blog.com"
            label="Blog"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('blog')}
          />
          <TextInput
            placeholder="https://votre-site.com"
            label="Site web personnel"
            size="md"
            styles={{
              input: {
                borderRadius: '12px',
                height: '48px',
                border: '2px solid #000',
              },
            }}
            {...form.getInputProps('website')}
          />
        </Stack>
      </div>

      <div>
        <Text size="sm" fw={700} c="#000" mb="md">
          Visibilité du profil
        </Text>
        <Checkbox
          label="J'accepte que mon profil soit visible par d'autres membres"
          size="md"
          mb="md"
          styles={{
            label: {
              fontWeight: 600,
            },
          }}
          {...form.getInputProps('publicProfileConsent', { type: 'checkbox' })}
        />

        {form.values.publicProfileConsent && (
          <Radio.Group
            label="Niveau de visibilité"
            {...form.getInputProps('publicProfileLevel')}
          >
            <Stack gap="sm" mt="sm">
              <Radio
                value="none"
                label="Aucune visibilité"
                styles={{
                  label: {
                    fontWeight: 600,
                  },
                }}
              />
              <Radio
                value="friends_only"
                label="Seulement si nous sommes connectés/amis"
                styles={{
                  label: {
                    fontWeight: 600,
                  },
                }}
              />
              <Radio
                value="all"
                label="Visible par tous les membres"
                styles={{
                  label: {
                    fontWeight: 600,
                  },
                }}
              />
            </Stack>
          </Radio.Group>
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
