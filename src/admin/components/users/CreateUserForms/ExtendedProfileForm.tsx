import { Stack, TextInput, Select, MultiSelect, Textarea, Text, Accordion } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { AVAILABLE_SKILLS, EVENT_TYPES, ARTISTIC_DOMAINS, MUSIC_GENRES } from '../../../../shared/types/user';
import type { AdminCreateUserData } from '../../../../shared/types/user';

interface ExtendedProfileFormProps {
  form: UseFormReturnType<AdminCreateUserData>;
}

export function ExtendedProfileForm({ form }: ExtendedProfileFormProps) {
  const skillOptions = AVAILABLE_SKILLS.map((skill) => ({
    value: skill,
    label: skill.charAt(0).toUpperCase() + skill.slice(1).replace('_', ' '),
  }));

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

  return (
    <Stack gap="md" mt="md">
      <Text size="sm" c="dimmed" fs="italic">
        Le profil étendu est optionnel mais recommandé pour les abonnements annuels.
      </Text>

      <Accordion defaultValue="professional">
        <Accordion.Item value="professional">
          <Accordion.Control>Informations Professionnelles</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <TextInput
                label="Profession"
                placeholder="Ex: Développeur web, Enseignant..."
                value={form.values.extendedProfile?.professional?.profession || ''}
                onChange={(e) =>
                  form.setFieldValue('extendedProfile.professional.profession', e.currentTarget.value)
                }
              />

              <TextInput
                label="Domaine d'activité"
                placeholder="Ex: Technologie, Éducation..."
                value={form.values.extendedProfile?.professional?.activityDomain || ''}
                onChange={(e) =>
                  form.setFieldValue('extendedProfile.professional.activityDomain', e.currentTarget.value)
                }
              />

              <Select
                label="Statut professionnel"
                data={[
                  { value: 'salaried', label: 'Salarié' },
                  { value: 'independent', label: 'Indépendant' },
                  { value: 'student', label: 'Étudiant' },
                  { value: 'retired', label: 'Retraité' },
                  { value: 'unemployed', label: 'Sans emploi' },
                ]}
                value={form.values.extendedProfile?.professional?.status || 'salaried'}
                onChange={(value) =>
                  form.setFieldValue('extendedProfile.professional.status', (value || 'salaried') as any)
                }
              />

              <MultiSelect
                label="Compétences"
                placeholder="Sélectionnez les compétences"
                data={skillOptions}
                searchable
                value={form.values.extendedProfile?.professional?.skills || []}
                onChange={(value) =>
                  form.setFieldValue('extendedProfile.professional.skills', value)
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="interests">
          <Accordion.Control>Centres d'Intérêt</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <MultiSelect
                label="Types d'événements préférés"
                data={eventTypeOptions}
                searchable
                value={form.values.extendedProfile?.interests?.eventTypes || []}
                onChange={(value) =>
                  form.setFieldValue('extendedProfile.interests.eventTypes', value)
                }
              />

              <MultiSelect
                label="Domaines artistiques"
                data={artisticDomainOptions}
                searchable
                value={form.values.extendedProfile?.interests?.artisticDomains || []}
                onChange={(value) =>
                  form.setFieldValue('extendedProfile.interests.artisticDomains', value)
                }
              />

              <MultiSelect
                label="Genres musicaux"
                data={musicGenreOptions}
                searchable
                value={form.values.extendedProfile?.interests?.musicGenres || []}
                onChange={(value) =>
                  form.setFieldValue('extendedProfile.interests.musicGenres', value)
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="communication">
          <Accordion.Control>Communication & Réseaux Sociaux</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Select
                label="Préférence de contact"
                data={[
                  { value: 'email', label: 'Email' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'social', label: 'Réseaux sociaux' },
                  { value: 'app', label: 'Application mobile' },
                ]}
                value={form.values.extendedProfile?.communication?.preferredContact || 'email'}
                onChange={(value) =>
                  form.setFieldValue('extendedProfile.communication.preferredContact', (value || 'email') as any)
                }
              />

              <TextInput
                label="Instagram"
                placeholder="@username"
                value={form.values.extendedProfile?.communication?.socialMedia?.instagram || ''}
                onChange={(e) =>
                  form.setFieldValue('extendedProfile.communication.socialMedia.instagram', e.currentTarget.value)
                }
              />

              <TextInput
                label="Facebook"
                placeholder="@username"
                value={form.values.extendedProfile?.communication?.socialMedia?.facebook || ''}
                onChange={(e) =>
                  form.setFieldValue('extendedProfile.communication.socialMedia.facebook', e.currentTarget.value)
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="engagement">
          <Accordion.Control>Engagement</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <TextInput
                label="Comment nous avez-vous connus ?"
                value={form.values.extendedProfile?.engagement?.howDidYouKnowUs || ''}
                onChange={(e) =>
                  form.setFieldValue('extendedProfile.engagement.howDidYouKnowUs', e.currentTarget.value)
                }
              />

              <Textarea
                label="Suggestions"
                value={form.values.extendedProfile?.engagement?.suggestions || ''}
                onChange={(e) =>
                  form.setFieldValue('extendedProfile.engagement.suggestions', e.currentTarget.value)
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Textarea
        label="Notes administratives (optionnel)"
        placeholder="Informations supplémentaires pour l'équipe admin..."
        minRows={3}
        {...form.getInputProps('adminNotes')}
      />
    </Stack>
  );
}
