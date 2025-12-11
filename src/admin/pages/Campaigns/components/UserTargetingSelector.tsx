import { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Text,
  Select,
  MultiSelect,
  NumberInput,
  Group,
  Badge,
  Table,
  Checkbox,
  TextInput,
  Accordion,
  Box,
  Button,
  ScrollArea,
  Pagination,
  LoadingOverlay,
  Divider,
  Textarea,
  Alert,
} from '@mantine/core';
import {
  IconUsers,
  IconFilter,
  IconSearch,
  IconCreditCard,
  IconUser,
  IconTags,
  IconStar,
  IconBriefcase,
  IconSettings,
  IconMail,
} from '@tabler/icons-react';
import type { TargetingMode, TargetingFilters } from '../../../../shared/types/campaign';
import type { User, MembershipType, MembershipStatus, RegistrationSource } from '../../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  AVAILABLE_TAGS,
  REGISTRATION_SOURCE_LABELS,
} from '../../../../shared/types/user';
import { getAllUsersForList, getAllUniqueTags } from '../../../../shared/services/userService';
import { estimateRecipients, getTargetedUsers } from '../../../../shared/services/campaignService';
import { getTagNames } from '../../../../shared/services/tagService';

interface UserTargetingSelectorProps {
  targetingMode: TargetingMode;
  onTargetingModeChange: (mode: TargetingMode) => void;
  filters: TargetingFilters;
  onFiltersChange: (filters: TargetingFilters) => void;
  selectedUserIds: string[];
  onSelectedUsersChange: (userIds: string[]) => void;
  onEstimatedCountChange: (count: number) => void;
}

export function UserTargetingSelector({
  targetingMode,
  onTargetingModeChange,
  filters,
  onFiltersChange,
  selectedUserIds,
  onSelectedUsersChange,
  onEstimatedCountChange,
}: UserTargetingSelectorProps) {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsersForManual, setFilteredUsersForManual] = useState<any[]>([]);
  const [manualSearchTerm, setManualSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [manualPage, setManualPage] = useState(1);
  const manualItemsPerPage = 10;
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredPage, setFilteredPage] = useState(1);
  const filteredItemsPerPage = 10;
  const [allTags, setAllTags] = useState<string[]>(AVAILABLE_TAGS);

  // Load all tags on mount
  useEffect(() => {
    loadAllTags();
  }, []);

  const loadAllTags = async () => {
    try {
      const [uniqueTags, configTags] = await Promise.all([
        getAllUniqueTags(),
        getTagNames(),
      ]);
      const mergedTags = Array.from(new Set([...AVAILABLE_TAGS, ...configTags, ...uniqueTags]));
      setAllTags(mergedTags.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  // Charger tous les users pour la sélection manuelle
  useEffect(() => {
    if (targetingMode === 'manual') {
      loadAllUsers();
    }
  }, [targetingMode]);

  // Mettre à jour l'estimation quand les filtres changent
  useEffect(() => {
    updateEstimation();
  }, [targetingMode, filters, selectedUserIds]);

  // Filtrer les users pour la sélection manuelle
  useEffect(() => {
    if (targetingMode === 'manual') {
      let filtered = [...allUsers];

      if (manualSearchTerm) {
        const searchLower = manualSearchTerm.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.firstName?.toLowerCase().includes(searchLower) ||
            user.lastName?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.postalCode?.includes(searchLower)
        );
      }

      setFilteredUsersForManual(filtered);
      setManualPage(1);
    }
  }, [allUsers, manualSearchTerm, targetingMode]);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const users = await getAllUsersForList();
      // Exclure les legacy members car ils ne sont pas dans la collection 'users'
      // et ne peuvent pas recevoir d'emails de campagne
      const nonLegacyUsers = users.filter(user => !user.isLegacy);
      setAllUsers(nonLegacyUsers);
      setFilteredUsersForManual(nonLegacyUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateEstimation = async () => {
    try {
      const count = await estimateRecipients(
        targetingMode,
        targetingMode === 'manual' ? selectedUserIds : undefined,
        targetingMode === 'filtered' ? filters : undefined
      );
      setEstimatedCount(count);
      onEstimatedCountChange(count);

      // Charger la liste complète des users ciblés pour les modes "filtered" et "all"
      if (targetingMode === 'filtered' || targetingMode === 'all') {
        const users = await getTargetedUsers(
          targetingMode,
          undefined,
          targetingMode === 'filtered' ? filters : undefined
        );
        setFilteredUsers(users);
      } else {
        setFilteredUsers([]);
      }
    } catch (error) {
      console.error('Error estimating recipients:', error);
    }
  };

  const handleUserToggle = (userId: string) => {
    const newSelection = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    onSelectedUsersChange(newSelection);
  };

  const handleFilteredUserToggle = (userId: string) => {
    const currentExcluded = filters.excludedUserIds || [];
    const newExcluded = currentExcluded.includes(userId)
      ? currentExcluded.filter((id) => id !== userId)
      : [...currentExcluded, userId];

    onFiltersChange({
      ...filters,
      excludedUserIds: newExcluded.length > 0 ? newExcluded : undefined
    });
  };

  const isUserExcluded = (userId: string) => {
    return filters.excludedUserIds?.includes(userId) || false;
  };

  const handleSelectAll = () => {
    const currentPageUserIds = paginatedManualUsers.map((u) => u.uid);
    const allSelected = currentPageUserIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      onSelectedUsersChange(selectedUserIds.filter((id) => !currentPageUserIds.includes(id)));
    } else {
      onSelectedUsersChange([...new Set([...selectedUserIds, ...currentPageUserIds])]);
    }
  };

  const totalManualPages = Math.ceil(filteredUsersForManual.length / manualItemsPerPage);
  const paginatedManualUsers = filteredUsersForManual.slice(
    (manualPage - 1) * manualItemsPerPage,
    manualPage * manualItemsPerPage
  );

  return (
    <Stack gap="md">
      <Select
        label="Mode de ciblage"
        description="Choisissez comment sélectionner vos destinataires"
        data={[
          { value: 'all', label: 'Tous les utilisateurs actifs' },
          { value: 'filtered', label: 'Filtrer par critères avancés' },
          { value: 'manual', label: 'Sélection manuelle' },
        ]}
        value={targetingMode}
        onChange={(value) => onTargetingModeChange(value as TargetingMode)}
        size="md"
        required
      />

      {targetingMode === 'filtered' && (
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group>
              <IconFilter size={20} />
              <Text fw={600} size="lg">Filtres de ciblage avancés</Text>
            </Group>

            <Accordion variant="contained" defaultValue="membership">
              {/* Filtres d'abonnement */}
              <Accordion.Item value="membership">
                <Accordion.Control>
                  <Group>
                    <IconCreditCard size={18} />
                    <Text fw={500}>Abonnement</Text>
                    {(filters.membershipTypes?.length || filters.membershipStatus?.length) && (
                      <Badge size="sm">{(filters.membershipTypes?.length || 0) + (filters.membershipStatus?.length || 0)} filtres actifs</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <MultiSelect
                      label="Types d'abonnement"
                      placeholder="Sélectionner les types..."
                      data={Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={filters.membershipTypes as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, membershipTypes: value as MembershipType[] })
                      }
                      clearable
                    />

                    <MultiSelect
                      label="Statuts d'abonnement"
                      placeholder="Sélectionner les statuts..."
                      data={Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={filters.membershipStatus as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, membershipStatus: value as MembershipStatus[] })
                      }
                      clearable
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Filtres démographiques */}
              <Accordion.Item value="demographics">
                <Accordion.Control>
                  <Group>
                    <IconUser size={18} />
                    <Text fw={500}>Démographie</Text>
                    {(filters.ageRange || filters.postalCodes?.length) && (
                      <Badge size="sm">Actif</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Text size="sm" fw={500}>Âge</Text>
                    <Group grow>
                      <NumberInput
                        label="Âge minimum"
                        placeholder="Ex: 18"
                        min={0}
                        max={120}
                        value={filters.ageRange?.min}
                        onChange={(value) =>
                          onFiltersChange({
                            ...filters,
                            ageRange: { ...filters.ageRange, min: value as number || undefined },
                          })
                        }
                      />
                      <NumberInput
                        label="Âge maximum"
                        placeholder="Ex: 65"
                        min={0}
                        max={120}
                        value={filters.ageRange?.max}
                        onChange={(value) =>
                          onFiltersChange({
                            ...filters,
                            ageRange: { ...filters.ageRange, max: value as number || undefined },
                          })
                        }
                      />
                    </Group>

                    <Divider />

                    <TextInput
                      label="Codes postaux"
                      description="Entrez les codes postaux séparés par des virgules (ex: 75001, 75002, 69001)"
                      placeholder="75001, 75002, 69001..."
                      value={filters.postalCodes?.join(', ') || ''}
                      onChange={(e) => {
                        const codes = e.currentTarget.value
                          .split(',')
                          .map((code) => code.trim())
                          .filter((code) => code.length > 0);
                        onFiltersChange({ ...filters, postalCodes: codes });
                      }}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Filtre de source d'inscription */}
              <Accordion.Item value="registration">
                <Accordion.Control>
                  <Group>
                    <IconUser size={18} />
                    <Text fw={500}>Source d'inscription</Text>
                    {filters.registrationSources?.length && (
                      <Badge size="sm">{filters.registrationSources.length} source{filters.registrationSources.length !== 1 ? 's' : ''}</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <MultiSelect
                    label="Sources d'inscription"
                    description="Filtrer par la provenance des utilisateurs"
                    placeholder="Sélectionner les sources..."
                    data={Object.entries(REGISTRATION_SOURCE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={filters.registrationSources as string[] || []}
                    onChange={(value) =>
                      onFiltersChange({ ...filters, registrationSources: value as RegistrationSource[] })
                    }
                    clearable
                  />
                </Accordion.Panel>
              </Accordion.Item>

              {/* Filtres de tags */}
              <Accordion.Item value="tags">
                <Accordion.Control>
                  <Group>
                    <IconTags size={18} />
                    <Text fw={500}>Tags</Text>
                    {(filters.includeTags?.length || filters.excludeTags?.length) && (
                      <Badge size="sm">{(filters.includeTags?.length || 0) + (filters.excludeTags?.length || 0)} tags</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <MultiSelect
                      label="Inclure les tags"
                      description="Les utilisateurs doivent avoir au moins un de ces tags"
                      placeholder="Selectionner les tags..."
                      data={allTags}
                      value={filters.includeTags as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, includeTags: value as string[] })
                      }
                      clearable
                      searchable
                    />

                    <MultiSelect
                      label="Exclure les tags"
                      description="Les utilisateurs ne doivent PAS avoir ces tags"
                      placeholder="Selectionner les tags..."
                      data={allTags}
                      value={filters.excludeTags as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, excludeTags: value as string[] })
                      }
                      clearable
                      searchable
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Filtres de points de fidélité */}
              <Accordion.Item value="loyalty">
                <Accordion.Control>
                  <Group>
                    <IconStar size={18} />
                    <Text fw={500}>Points de fidélité</Text>
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
                            min: value as number || undefined,
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
                            max: value as number || undefined,
                          },
                        })
                      }
                    />
                  </Group>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Profils étendus */}
              <Accordion.Item value="extended">
                <Accordion.Control>
                  <Group>
                    <IconBriefcase size={18} />
                    <Text fw={500}>Profils étendus</Text>
                    {(filters.hasExtendedProfile !== undefined ||
                      filters.professionalStatus?.length ||
                      filters.eventTypes?.length ||
                      filters.artisticDomains?.length ||
                      filters.skills?.length) && (
                        <Badge size="sm">Actif</Badge>
                      )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Checkbox
                      label="Uniquement les profils étendus (membres annuels)"
                      checked={filters.hasExtendedProfile || false}
                      onChange={(e) =>
                        onFiltersChange({ ...filters, hasExtendedProfile: e.currentTarget.checked || undefined })
                      }
                    />

                    <MultiSelect
                      label="Statut professionnel"
                      placeholder="Sélectionner..."
                      data={[
                        { value: 'salaried', label: 'Salarié' },
                        { value: 'independent', label: 'Indépendant' },
                        { value: 'student', label: 'Étudiant' },
                        { value: 'retired', label: 'Retraité' },
                        { value: 'unemployed', label: 'Sans emploi' },
                      ]}
                      value={filters.professionalStatus as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, professionalStatus: value as any[] })
                      }
                      clearable
                    />

                    <MultiSelect
                      label="Types d'événements favoris"
                      placeholder="Sélectionner..."
                      data={[
                        { value: 'concerts', label: 'Concerts' },
                        { value: 'expositions', label: 'Expositions' },
                        { value: 'ateliers', label: 'Ateliers' },
                        { value: 'conferences', label: 'Conférences' },
                        { value: 'projections_cinema', label: 'Projections cinéma' },
                        { value: 'spectacles_vivants', label: 'Spectacles vivants' },
                      ]}
                      value={filters.eventTypes as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, eventTypes: value })
                      }
                      clearable
                    />

                    <MultiSelect
                      label="Domaines artistiques"
                      placeholder="Sélectionner..."
                      data={[
                        { value: 'musique', label: 'Musique' },
                        { value: 'arts_visuels', label: 'Arts visuels' },
                        { value: 'litterature', label: 'Littérature' },
                        { value: 'theatre', label: 'Théâtre' },
                        { value: 'danse', label: 'Danse' },
                        { value: 'cinema', label: 'Cinéma' },
                      ]}
                      value={filters.artisticDomains as string[] || []}
                      onChange={(value) =>
                        onFiltersChange({ ...filters, artisticDomains: value })
                      }
                      clearable
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Filtre par liste d'emails */}
              <Accordion.Item value="emailWhitelist">
                <Accordion.Control>
                  <Group>
                    <IconMail size={18} />
                    <Text fw={500}>Filtre par liste d'emails</Text>
                    {filters.emailWhitelist && filters.emailWhitelist.length > 0 && (
                      <Badge size="sm">{filters.emailWhitelist.length} emails</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Textarea
                      label="Liste d'emails autorisés"
                      description="Entrez une liste d'emails (un par ligne ou séparés par des virgules). Seuls les utilisateurs dont l'email figure dans cette liste seront inclus dans la sélection déjà filtrée."
                      placeholder="exemple1@gmail.com&#10;exemple2@gmail.com&#10;exemple3@orange.fr"
                      value={filters.emailWhitelist?.join('\n') || ''}
                      onChange={(e) => {
                        const rawText = e.currentTarget.value;
                        if (!rawText.trim()) {
                          onFiltersChange({ ...filters, emailWhitelist: undefined });
                          return;
                        }

                        // Accepter les emails séparés par des virgules ou des retours à la ligne
                        const emails = rawText
                          .split(/[\n,]/) // Split par nouvelle ligne ou virgule
                          .map((email) => email.trim().toLowerCase()) // Trim et lowercase
                          .filter((email) => {
                            // Validation basique d'email
                            return email.length > 0 && email.includes('@');
                          });

                        onFiltersChange({
                          ...filters,
                          emailWhitelist: emails.length > 0 ? emails : undefined
                        });
                      }}
                      minRows={8}
                      autosize
                      maxRows={15}
                    />
                    {filters.emailWhitelist && filters.emailWhitelist.length > 0 && (
                      <Alert color="blue" variant="light">
                        <Text size="sm">
                          <strong>{filters.emailWhitelist.length}</strong> email{filters.emailWhitelist.length > 1 ? 's' : ''} dans la liste de filtrage
                        </Text>
                        <Text size="xs" mt="xs" c="dimmed">
                          Seuls les utilisateurs dont l'email apparaît dans cette liste seront inclus (après application des autres filtres).
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Options supplémentaires */}
              <Accordion.Item value="options">
                <Accordion.Control>
                  <Group>
                    <IconSettings size={18} />
                    <Text fw={500}>Options</Text>
                    {(filters.includeBlocked || filters.membershipCardNotSent || filters.membershipCardSent) && (
                      <Badge size="sm">Actif</Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Checkbox
                      label="Inclure les comptes bloqués"
                      checked={filters.includeBlocked || false}
                      onChange={(e) =>
                        onFiltersChange({ ...filters, includeBlocked: e.currentTarget.checked })
                      }
                    />
                    <Checkbox
                      label="Uniquement les utilisateurs n'ayant pas reçu leur carte d'adhérent"
                      description="Filtre les utilisateurs de la collection 'users' qui n'ont pas encore reçu leur email de carte"
                      checked={filters.membershipCardNotSent || false}
                      onChange={(e) =>
                        onFiltersChange({ ...filters, membershipCardNotSent: e.currentTarget.checked || undefined })
                      }
                    />
                    <Checkbox
                      label="Envoyer un email aux utilisateurs ayant reçu par erreur un email de carte erroné"
                      description="Cible uniquement les utilisateurs ayant déjà reçu leur carte d'adhérent"
                      checked={filters.membershipCardSent || false}
                      onChange={(e) =>
                        onFiltersChange({ ...filters, membershipCardSent: e.currentTarget.checked || undefined })
                      }
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <Button
              variant="light"
              onClick={() => {
                onFiltersChange({ includeBlocked: false });
              }}
            >
              Réinitialiser tous les filtres
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Liste des utilisateurs filtrés avec exclusion manuelle */}
      {(targetingMode === 'filtered' || targetingMode === 'all') && filteredUsers.length > 0 && (
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <div>
              <Group justify="space-between" mb="xs">
                <Group>
                  <IconUsers size={24} />
                  <div>
                    <Text fw={600} size="lg">Destinataires de la campagne</Text>
                    <Text size="sm" c="dimmed">
                      {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''} correspondant aux filtres
                      {(filters.excludedUserIds?.length || 0) > 0 && (
                        <> · {filters.excludedUserIds?.length} exclu{(filters.excludedUserIds?.length || 0) !== 1 ? 's' : ''} manuellement</>
                      )}
                    </Text>
                  </div>
                </Group>
                <Group>
                  {(filters.excludedUserIds?.length || 0) > 0 && (
                    <Badge size="lg" color="red" variant="filled">
                      {filters.excludedUserIds?.length} exclu{(filters.excludedUserIds?.length || 0) !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Badge size="lg" color="blue" variant="filled">
                    {filteredUsers.length - (filters.excludedUserIds?.length || 0)} final{filteredUsers.length - (filters.excludedUserIds?.length || 0) !== 1 ? 'aux' : ''}
                  </Badge>
                </Group>
              </Group>

              <Divider mb="md" />

              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed">
                  💡 Décochez les utilisateurs que vous souhaitez exclure de cette campagne
                </Text>
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => {
                    const allIncluded = filteredUsers.every((u) => !isUserExcluded(u.uid));
                    if (allIncluded) {
                      onFiltersChange({
                        ...filters,
                        excludedUserIds: filteredUsers.map(u => u.uid)
                      });
                    } else {
                      onFiltersChange({
                        ...filters,
                        excludedUserIds: undefined
                      });
                    }
                  }}
                >
                  {filteredUsers.every((u) => !isUserExcluded(u.uid)) ? 'Tout décocher' : 'Tout cocher'}
                </Button>
              </Group>
            </div>

            <ScrollArea h={500}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 50 }}>
                      <Checkbox
                        checked={
                          filteredUsers.length > 0 &&
                          filteredUsers.every((u) => !isUserExcluded(u.uid))
                        }
                        indeterminate={
                          filteredUsers.some((u) => !isUserExcluded(u.uid)) &&
                          !filteredUsers.every((u) => !isUserExcluded(u.uid))
                        }
                        onChange={() => {
                          const allIncluded = filteredUsers.every((u) => !isUserExcluded(u.uid));
                          if (allIncluded) {
                            onFiltersChange({
                              ...filters,
                              excludedUserIds: filteredUsers.map(u => u.uid)
                            });
                          } else {
                            onFiltersChange({
                              ...filters,
                              excludedUserIds: undefined
                            });
                          }
                        }}
                      />
                    </Table.Th>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Abonnement</Table.Th>
                    <Table.Th>Code postal</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredUsers
                    .slice(
                      (filteredPage - 1) * filteredItemsPerPage,
                      filteredPage * filteredItemsPerPage
                    )
                    .map((user) => (
                      <Table.Tr
                        key={user.uid}
                        style={{
                          opacity: isUserExcluded(user.uid) ? 0.5 : 1,
                          backgroundColor: isUserExcluded(user.uid) ? 'var(--mantine-color-red-0)' : undefined,
                        }}
                      >
                        <Table.Td>
                          <Checkbox
                            checked={!isUserExcluded(user.uid)}
                            onChange={() => handleFilteredUserToggle(user.uid)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} style={{ textDecoration: isUserExcluded(user.uid) ? 'line-through' : 'none' }}>
                            {user.firstName} {user.lastName}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed" style={{ textDecoration: isUserExcluded(user.uid) ? 'line-through' : 'none' }}>
                            {user.email}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" color={user.currentMembership.status === 'active' ? 'green' : 'gray'}>
                            {MEMBERSHIP_TYPE_LABELS[user.currentMembership.planType as MembershipType]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ textDecoration: isUserExcluded(user.uid) ? 'line-through' : 'none' }}>
                            {user.postalCode}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {Math.ceil(filteredUsers.length / filteredItemsPerPage) > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={filteredPage}
                  onChange={setFilteredPage}
                  total={Math.ceil(filteredUsers.length / filteredItemsPerPage)}
                  size="lg"
                />
              </Group>
            )}
          </Stack>
        </Paper>
      )}

      {targetingMode === 'manual' && (
        <Paper p="lg" withBorder style={{ position: 'relative' }}>
          <LoadingOverlay visible={loading} />
          <Stack gap="md">
            <Group justify="space-between">
              <Group>
                <IconUsers size={20} />
                <Text fw={600} size="lg">Sélection manuelle des destinataires</Text>
              </Group>
              <Badge size="lg">{selectedUserIds.length} sélectionné(s)</Badge>
            </Group>

            <TextInput
              placeholder="Rechercher par nom, email ou code postal..."
              leftSection={<IconSearch size={16} />}
              value={manualSearchTerm}
              onChange={(e) => setManualSearchTerm(e.currentTarget.value)}
            />

            <ScrollArea h={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 50 }}>
                      <Checkbox
                        checked={
                          paginatedManualUsers.length > 0 &&
                          paginatedManualUsers.every((u) => selectedUserIds.includes(u.uid))
                        }
                        indeterminate={
                          paginatedManualUsers.some((u) => selectedUserIds.includes(u.uid)) &&
                          !paginatedManualUsers.every((u) => selectedUserIds.includes(u.uid))
                        }
                        onChange={handleSelectAll}
                      />
                    </Table.Th>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Abonnement</Table.Th>
                    <Table.Th>Code postal</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {paginatedManualUsers.map((user) => (
                    <Table.Tr key={user.uid}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedUserIds.includes(user.uid)}
                          onChange={() => handleUserToggle(user.uid)}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {user.firstName} {user.lastName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {user.email}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" color={user.membership.status === 'active' ? 'green' : 'gray'}>
                          {MEMBERSHIP_TYPE_LABELS[user.membership.type as MembershipType]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{user.postalCode}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {filteredUsersForManual.length === 0 && (
                <Box p="xl">
                  <Text ta="center" c="dimmed">
                    Aucun utilisateur trouvé
                  </Text>
                </Box>
              )}
            </ScrollArea>

            {totalManualPages > 1 && (
              <Group justify="center">
                <Pagination
                  value={manualPage}
                  onChange={setManualPage}
                  total={totalManualPages}
                />
              </Group>
            )}
          </Stack>
        </Paper>
      )}

      {/* Résumé du ciblage - Affiché uniquement pour la sélection manuelle */}
      {targetingMode === 'manual' && (
        <Paper p="md" withBorder bg="blue.0">
          <Group>
            <IconUsers size={32} color="blue" />
            <Box>
              <Text fw={700} size="xl" c="blue">
                {estimatedCount} destinataire{estimatedCount !== 1 ? 's' : ''}
              </Text>
              <Text size="sm" c="dimmed">
                Sélection manuelle
              </Text>
            </Box>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
