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
} from '@tabler/icons-react';
import type { TargetingMode, TargetingFilters } from '../../../../shared/types/campaign';
import type { User, MembershipType, MembershipStatus } from '../../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  AVAILABLE_TAGS,
} from '../../../../shared/types/user';
import { getAllUsersForList } from '../../../../shared/services/userService';
import { estimateRecipients, getTargetedUsers } from '../../../../shared/services/campaignService';

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
  const [previewUsers, setPreviewUsers] = useState<User[]>([]);
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [manualPage, setManualPage] = useState(1);
  const manualItemsPerPage = 10;

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
            user.firstName.toLowerCase().includes(searchLower) ||
            user.lastName.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.postalCode.includes(searchLower)
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
      setAllUsers(users);
      setFilteredUsersForManual(users);
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

      // Charger un aperçu des users ciblés
      if (targetingMode !== 'manual') {
        const users = await getTargetedUsers(
          targetingMode,
          undefined,
          targetingMode === 'filtered' ? filters : undefined
        );
        setPreviewUsers(users.slice(0, 5));
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
                      placeholder="Sélectionner les tags..."
                      data={AVAILABLE_TAGS}
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
                      placeholder="Sélectionner les tags..."
                      data={AVAILABLE_TAGS}
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

              {/* Options supplémentaires */}
              <Accordion.Item value="options">
                <Accordion.Control>
                  <Group>
                    <IconSettings size={18} />
                    <Text fw={500}>Options</Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Checkbox
                    label="Inclure les comptes bloqués"
                    checked={filters.includeBlocked || false}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, includeBlocked: e.currentTarget.checked })
                    }
                  />
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

      {/* Résumé du ciblage */}
      <Paper p="md" withBorder bg="blue.0">
        <Group>
          <IconUsers size={32} color="blue" />
          <Box>
            <Text fw={700} size="xl" c="blue">
              {estimatedCount} destinataire{estimatedCount !== 1 ? 's' : ''}
            </Text>
            <Text size="sm" c="dimmed">
              {targetingMode === 'all' && 'Tous les utilisateurs actifs'}
              {targetingMode === 'filtered' && 'Selon les filtres sélectionnés'}
              {targetingMode === 'manual' && 'Sélection manuelle'}
            </Text>
          </Box>
        </Group>
      </Paper>

      {/* Aperçu des destinataires (pour filtré et tous) */}
      {targetingMode !== 'manual' && previewUsers.length > 0 && (
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Text fw={600} size="sm">
              Aperçu des destinataires (5 premiers)
            </Text>
            {previewUsers.map((user) => (
              <Group key={user.uid} gap="xs">
                <Text size="sm">
                  {user.firstName} {user.lastName}
                </Text>
                <Text size="sm" c="dimmed">
                  ({user.email})
                </Text>
              </Group>
            ))}
            {estimatedCount > 5 && (
              <Text size="xs" c="dimmed">
                ... et {estimatedCount - 5} autres
              </Text>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
