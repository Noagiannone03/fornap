import {
  Stack,
  Text,
  TextInput,
  MultiSelect,
  NumberInput,
  Group,
  Badge,
  Accordion,
  Select,
  Button,
  Paper,
  Divider,
  LoadingOverlay,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconFilter,
  IconCreditCard,
  IconUser,
  IconTags,
  IconStar,
  IconCalendar,
  IconSearch,
  IconSettings,
  IconArrowRight,
} from '@tabler/icons-react';
import type { AdvancedFiltersStepProps } from './types';
import type { MembershipType, MembershipStatus, RegistrationSource } from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  REGISTRATION_SOURCE_LABELS,
} from '../../../shared/types/user';

export function AdvancedFiltersStep({
  filters,
  onFiltersChange,
  estimatedCount,
  isLoading,
  allTags,
  onNext,
}: AdvancedFiltersStepProps) {
  const resetFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof typeof filters];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined);
    }
    return value !== undefined && value !== '' && value !== 'all';
  });

  return (
    <Stack gap="md" pos="relative">
      <LoadingOverlay visible={isLoading} />

      {/* Header avec compteur */}
      <Paper p="md" withBorder bg="blue.0">
        <Group justify="space-between">
          <Group>
            <IconFilter size={24} color="blue" />
            <div>
              <Text fw={600}>Filtres avances</Text>
              <Text size="sm" c="dimmed">
                Definissez les criteres pour selectionner les utilisateurs
              </Text>
            </div>
          </Group>
          <Badge size="xl" color="blue" variant="filled">
            {estimatedCount} utilisateur{estimatedCount !== 1 ? 's' : ''}
          </Badge>
        </Group>
      </Paper>

      {/* Recherche textuelle */}
      <TextInput
        label="Recherche"
        description="Rechercher par nom, email ou telephone"
        placeholder="Nom, email ou telephone..."
        leftSection={<IconSearch size={16} />}
        value={filters.search || ''}
        onChange={(e) => onFiltersChange({ ...filters, search: e.currentTarget.value || undefined })}
        size="md"
      />

      <Accordion variant="contained" multiple defaultValue={['membership']}>
        {/* Abonnement */}
        <Accordion.Item value="membership">
          <Accordion.Control>
            <Group>
              <IconCreditCard size={18} />
              <Text fw={500}>Abonnement</Text>
              {(filters.membershipTypes?.length || filters.membershipStatus?.length) && (
                <Badge size="sm">
                  {(filters.membershipTypes?.length || 0) + (filters.membershipStatus?.length || 0)} filtre(s)
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <MultiSelect
                label="Types d'abonnement"
                placeholder="Selectionner les types..."
                data={Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={(filters.membershipTypes as string[]) || []}
                onChange={(value) =>
                  onFiltersChange({ ...filters, membershipTypes: value.length > 0 ? value as MembershipType[] : undefined })
                }
                clearable
                searchable
              />

              <MultiSelect
                label="Statuts d'abonnement"
                placeholder="Selectionner les statuts..."
                data={Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={(filters.membershipStatus as string[]) || []}
                onChange={(value) =>
                  onFiltersChange({ ...filters, membershipStatus: value.length > 0 ? value as MembershipStatus[] : undefined })
                }
                clearable
                searchable
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Tags */}
        <Accordion.Item value="tags">
          <Accordion.Control>
            <Group>
              <IconTags size={18} />
              <Text fw={500}>Tags</Text>
              {(filters.includeTags?.length || filters.excludeTags?.length) && (
                <Badge size="sm">
                  {(filters.includeTags?.length || 0) + (filters.excludeTags?.length || 0)} tag(s)
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <MultiSelect
                label="Inclure les tags"
                description="Les utilisateurs doivent avoir AU MOINS UN de ces tags"
                placeholder="Selectionner les tags..."
                data={allTags}
                value={(filters.includeTags as string[]) || []}
                onChange={(value) =>
                  onFiltersChange({ ...filters, includeTags: value.length > 0 ? value : undefined })
                }
                clearable
                searchable
              />

              <MultiSelect
                label="Exclure les tags"
                description="Les utilisateurs ne doivent PAS avoir ces tags"
                placeholder="Selectionner les tags..."
                data={allTags}
                value={(filters.excludeTags as string[]) || []}
                onChange={(value) =>
                  onFiltersChange({ ...filters, excludeTags: value.length > 0 ? value : undefined })
                }
                clearable
                searchable
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Dates */}
        <Accordion.Item value="dates">
          <Accordion.Control>
            <Group>
              <IconCalendar size={18} />
              <Text fw={500}>Dates</Text>
              {(filters.registrationDateRange || filters.expiryDateRange) && (
                <Badge size="sm">Actif</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text size="sm" fw={500}>Date d'inscription</Text>
              <Group grow>
                <DatePickerInput
                  label="Du"
                  placeholder="Date debut"
                  value={filters.registrationDateRange?.start ?? null}
                  onChange={(value) => {
                    const date = typeof value === 'string' && value ? new Date(value) : value as Date | null;
                    onFiltersChange({
                      ...filters,
                      registrationDateRange: {
                        start: date ?? undefined,
                        end: filters.registrationDateRange?.end,
                      },
                    });
                  }}
                  clearable
                />
                <DatePickerInput
                  label="Au"
                  placeholder="Date fin"
                  value={filters.registrationDateRange?.end ?? null}
                  onChange={(value) => {
                    const date = typeof value === 'string' && value ? new Date(value) : value as Date | null;
                    onFiltersChange({
                      ...filters,
                      registrationDateRange: {
                        start: filters.registrationDateRange?.start,
                        end: date ?? undefined,
                      },
                    });
                  }}
                  clearable
                />
              </Group>

              <Divider />

              <Text size="sm" fw={500}>Date d'expiration</Text>
              <Group grow>
                <DatePickerInput
                  label="Du"
                  placeholder="Date debut"
                  value={filters.expiryDateRange?.start ?? null}
                  onChange={(value) => {
                    const date = typeof value === 'string' && value ? new Date(value) : value as Date | null;
                    onFiltersChange({
                      ...filters,
                      expiryDateRange: {
                        start: date ?? undefined,
                        end: filters.expiryDateRange?.end,
                      },
                    });
                  }}
                  clearable
                />
                <DatePickerInput
                  label="Au"
                  placeholder="Date fin"
                  value={filters.expiryDateRange?.end ?? null}
                  onChange={(value) => {
                    const date = typeof value === 'string' && value ? new Date(value) : value as Date | null;
                    onFiltersChange({
                      ...filters,
                      expiryDateRange: {
                        start: filters.expiryDateRange?.start,
                        end: date ?? undefined,
                      },
                    });
                  }}
                  clearable
                />
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Demographique */}
        <Accordion.Item value="demographics">
          <Accordion.Control>
            <Group>
              <IconUser size={18} />
              <Text fw={500}>Demographie</Text>
              {(filters.ageRange || filters.postalCodes?.length || filters.registrationSources?.length) && (
                <Badge size="sm">Actif</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text size="sm" fw={500}>Age</Text>
              <Group grow>
                <NumberInput
                  label="Age minimum"
                  placeholder="Ex: 18"
                  min={0}
                  max={120}
                  value={filters.ageRange?.min}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      ageRange: {
                        ...filters.ageRange,
                        min: typeof value === 'number' ? value : undefined,
                      },
                    })
                  }
                />
                <NumberInput
                  label="Age maximum"
                  placeholder="Ex: 65"
                  min={0}
                  max={120}
                  value={filters.ageRange?.max}
                  onChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      ageRange: {
                        ...filters.ageRange,
                        max: typeof value === 'number' ? value : undefined,
                      },
                    })
                  }
                />
              </Group>

              <Divider />

              <TextInput
                label="Codes postaux"
                description="Separes par des virgules (ex: 75001, 75002, 69001)"
                placeholder="75001, 75002, 69001..."
                value={filters.postalCodes?.join(', ') || ''}
                onChange={(e) => {
                  const codes = e.currentTarget.value
                    .split(',')
                    .map((code) => code.trim())
                    .filter((code) => code.length > 0);
                  onFiltersChange({ ...filters, postalCodes: codes.length > 0 ? codes : undefined });
                }}
              />

              <Divider />

              <MultiSelect
                label="Sources d'inscription"
                placeholder="Selectionner les sources..."
                data={Object.entries(REGISTRATION_SOURCE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={(filters.registrationSources as string[]) || []}
                onChange={(value) =>
                  onFiltersChange({ ...filters, registrationSources: value.length > 0 ? value as RegistrationSource[] : undefined })
                }
                clearable
                searchable
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Fidelite */}
        <Accordion.Item value="loyalty">
          <Accordion.Control>
            <Group>
              <IconStar size={18} />
              <Text fw={500}>Points de fidelite</Text>
              {filters.loyaltyPointsRange && (
                <Badge size="sm">Actif</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Group grow>
              <NumberInput
                label="Points minimum"
                placeholder="Ex: 100"
                min={0}
                value={filters.loyaltyPointsRange?.min}
                onChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    loyaltyPointsRange: {
                      ...filters.loyaltyPointsRange,
                      min: typeof value === 'number' ? value : undefined,
                    },
                  })
                }
              />
              <NumberInput
                label="Points maximum"
                placeholder="Ex: 1000"
                min={0}
                value={filters.loyaltyPointsRange?.max}
                onChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    loyaltyPointsRange: {
                      ...filters.loyaltyPointsRange,
                      max: typeof value === 'number' ? value : undefined,
                    },
                  })
                }
              />
            </Group>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Options */}
        <Accordion.Item value="options">
          <Accordion.Control>
            <Group>
              <IconSettings size={18} />
              <Text fw={500}>Options avancees</Text>
              {(filters.accountBlockedStatus !== 'all' || filters.cardBlockedStatus !== 'all' || filters.emailSentStatus !== 'all') && (
                <Badge size="sm">Actif</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Select
                label="Statut de blocage du compte"
                data={[
                  { value: 'all', label: 'Tous' },
                  { value: 'blocked', label: 'Comptes bloques uniquement' },
                  { value: 'not_blocked', label: 'Comptes non bloques uniquement' },
                ]}
                value={filters.accountBlockedStatus || 'all'}
                onChange={(value) =>
                  onFiltersChange({ ...filters, accountBlockedStatus: value as any || undefined })
                }
              />

              <Select
                label="Statut de blocage de la carte"
                data={[
                  { value: 'all', label: 'Tous' },
                  { value: 'blocked', label: 'Cartes bloquees uniquement' },
                  { value: 'not_blocked', label: 'Cartes non bloquees uniquement' },
                ]}
                value={filters.cardBlockedStatus || 'all'}
                onChange={(value) =>
                  onFiltersChange({ ...filters, cardBlockedStatus: value as any || undefined })
                }
              />

              <Select
                label="Email de carte d'adherent"
                data={[
                  { value: 'all', label: 'Tous' },
                  { value: 'sent', label: 'Email envoye' },
                  { value: 'not_sent', label: 'Email non envoye' },
                ]}
                value={filters.emailSentStatus || 'all'}
                onChange={(value) =>
                  onFiltersChange({ ...filters, emailSentStatus: value as any || undefined })
                }
              />
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Actions */}
      <Group justify="space-between" mt="md">
        <Button
          variant="light"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
        >
          Reinitialiser les filtres
        </Button>
        <Button
          rightSection={<IconArrowRight size={16} />}
          onClick={onNext}
          disabled={estimatedCount === 0}
        >
          Previsualiser ({estimatedCount})
        </Button>
      </Group>
    </Stack>
  );
}
