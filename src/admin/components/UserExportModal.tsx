import { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    Stack,
    Text,
    SegmentedControl,
    Accordion,
    Group,
    Checkbox,
    Button,
    MultiSelect,
    Select,
    NumberInput,
    TextInput,
    Badge,
    Paper,
    Divider,
    Alert,
    LoadingOverlay,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconDownload,
    IconFilter,
    IconFileSpreadsheet,
    IconCsv,
    IconRefresh,
    IconUsers,
    IconCreditCard,
    IconTags,
    IconCalendar,
    IconSettings,
    IconDatabase,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { UserListItem, MembershipType, MembershipStatus, RegistrationSource } from '../../shared/types/user';
import {
    MEMBERSHIP_TYPE_LABELS,
    MEMBERSHIP_STATUS_LABELS,
    REGISTRATION_SOURCE_LABELS,
    AVAILABLE_TAGS,
} from '../../shared/types/user';
import type { UserExportField, UserExportFilters } from '../types/exportTypes';
import {
    EXPORT_FIELDS,
    EXPORT_FIELD_GROUPS,
    createDefaultExportFilters,
    getDefaultSelectedFields,
} from '../types/exportTypes';
import {
    countFilteredUsers,
    downloadUserExport,
} from '../../shared/services/userExportService';
import { getAllUniqueTags } from '../../shared/services/userService';
import { getTagNames } from '../../shared/services/tagService';

interface UserExportModalProps {
    opened: boolean;
    onClose: () => void;
    users: UserListItem[];
}

export function UserExportModal({ opened, onClose, users }: UserExportModalProps) {
    // Format d'export
    const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');

    // Champs sélectionnés
    const [selectedFields, setSelectedFields] = useState<UserExportField[]>(getDefaultSelectedFields());

    // Filtres
    const [filters, setFilters] = useState<UserExportFilters>(createDefaultExportFilters());

    // État
    const [exporting, setExporting] = useState(false);
    const [allTags, setAllTags] = useState<string[]>(AVAILABLE_TAGS);

    // Charger les tags au montage
    useEffect(() => {
        if (opened) {
            loadAllTags();
        }
    }, [opened]);

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

    // Calculer le nombre d'utilisateurs filtrés
    const filteredCount = useMemo(() => {
        return countFilteredUsers(users, filters);
    }, [users, filters]);

    // Grouper les champs par catégorie
    const fieldsByGroup = useMemo(() => {
        const groups: Record<string, typeof EXPORT_FIELDS> = {};
        for (const field of EXPORT_FIELDS) {
            if (!groups[field.group]) {
                groups[field.group] = [];
            }
            groups[field.group].push(field);
        }
        return groups;
    }, []);

    // Toggle un champ
    const toggleField = (field: UserExportField) => {
        setSelectedFields((prev) =>
            prev.includes(field)
                ? prev.filter((f) => f !== field)
                : [...prev, field]
        );
    };

    // Sélectionner/désélectionner tous les champs d'un groupe
    const toggleGroup = (group: string, checked: boolean) => {
        const groupFields = fieldsByGroup[group]?.map((f) => f.key) || [];
        if (checked) {
            setSelectedFields((prev) => [...new Set([...prev, ...groupFields])]);
        } else {
            setSelectedFields((prev) => prev.filter((f) => !groupFields.includes(f)));
        }
    };

    // Vérifier si tous les champs d'un groupe sont sélectionnés
    const isGroupFullySelected = (group: string) => {
        const groupFields = fieldsByGroup[group]?.map((f) => f.key) || [];
        return groupFields.every((f) => selectedFields.includes(f));
    };

    const isGroupPartiallySelected = (group: string) => {
        const groupFields = fieldsByGroup[group]?.map((f) => f.key) || [];
        const selected = groupFields.filter((f) => selectedFields.includes(f));
        return selected.length > 0 && selected.length < groupFields.length;
    };

    // Réinitialiser les filtres
    const handleResetFilters = () => {
        setFilters(createDefaultExportFilters());
    };

    // Réinitialiser les champs
    const handleResetFields = () => {
        setSelectedFields(getDefaultSelectedFields());
    };

    // Exporter
    const handleExport = async () => {
        if (selectedFields.length === 0) {
            notifications.show({
                title: 'Attention',
                message: 'Veuillez sélectionner au moins un champ à exporter',
                color: 'orange',
            });
            return;
        }

        if (filteredCount === 0) {
            notifications.show({
                title: 'Attention',
                message: 'Aucun utilisateur ne correspond aux filtres',
                color: 'orange',
            });
            return;
        }

        setExporting(true);

        try {
            downloadUserExport(users, {
                format,
                selectedFields,
                filters,
            });

            notifications.show({
                title: 'Export réussi',
                message: `${filteredCount} utilisateur${filteredCount > 1 ? 's' : ''} exporté${filteredCount > 1 ? 's' : ''} en ${format.toUpperCase()}`,
                color: 'green',
            });

            onClose();
        } catch (error: any) {
            console.error('Export error:', error);
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Une erreur est survenue lors de l\'export',
                color: 'red',
            });
        } finally {
            setExporting(false);
        }
    };

    // Compter les filtres actifs
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search?.trim()) count++;
        if (filters.membershipTypes?.length) count++;
        if (filters.membershipStatus?.length) count++;
        if (filters.includeTags?.length) count++;
        if (filters.excludeTags?.length) count++;
        if (filters.registrationDateRange?.start || filters.registrationDateRange?.end) count++;
        if (filters.registrationSources?.length) count++;
        if (filters.loyaltyPointsRange?.min !== undefined || filters.loyaltyPointsRange?.max !== undefined) count++;
        if (filters.blockedFilter && filters.blockedFilter !== 'all') count++;
        if (filters.emailCardFilter && filters.emailCardFilter !== 'all') count++;
        return count;
    }, [filters]);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <IconDownload size={24} />
                    <Text fw={600} size="lg">Exporter les utilisateurs</Text>
                </Group>
            }
            size="xl"
            centered
        >
            <LoadingOverlay visible={exporting} />

            <Stack gap="lg">
                {/* Format d'export */}
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" mb="xs">
                        <Text fw={600}>Format d'export</Text>
                    </Group>
                    <SegmentedControl
                        fullWidth
                        value={format}
                        onChange={(v) => setFormat(v as 'csv' | 'xlsx')}
                        data={[
                            {
                                value: 'csv',
                                label: (
                                    <Group gap="xs" justify="center">
                                        <IconCsv size={18} />
                                        <Text>CSV (.csv)</Text>
                                    </Group>
                                ),
                            },
                            {
                                value: 'xlsx',
                                label: (
                                    <Group gap="xs" justify="center">
                                        <IconFileSpreadsheet size={18} />
                                        <Text>Excel (.xlsx)</Text>
                                    </Group>
                                ),
                            },
                        ]}
                    />
                </Paper>

                {/* Champs à exporter */}
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <IconDatabase size={20} />
                            <Text fw={600}>Champs à exporter</Text>
                            <Badge size="sm" variant="light">
                                {selectedFields.length} sélectionné{selectedFields.length > 1 ? 's' : ''}
                            </Badge>
                        </Group>
                        <Button
                            variant="subtle"
                            size="xs"
                            onClick={handleResetFields}
                            leftSection={<IconRefresh size={14} />}
                        >
                            Par défaut
                        </Button>
                    </Group>

                    <Accordion variant="contained" multiple>
                        {Object.entries(fieldsByGroup).map(([group, fields]) => (
                            <Accordion.Item key={group} value={group}>
                                <Accordion.Control>
                                    <Group justify="space-between" w="100%">
                                        <Group gap="xs">
                                            <Checkbox
                                                checked={isGroupFullySelected(group)}
                                                indeterminate={isGroupPartiallySelected(group)}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    toggleGroup(group, e.currentTarget.checked);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <Text fw={500}>{EXPORT_FIELD_GROUPS[group as keyof typeof EXPORT_FIELD_GROUPS]}</Text>
                                        </Group>
                                        <Badge size="sm" variant="light" color="gray">
                                            {fields.filter((f) => selectedFields.includes(f.key)).length}/{fields.length}
                                        </Badge>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <Group gap="sm" wrap="wrap">
                                        {fields.map((field) => (
                                            <Checkbox
                                                key={field.key}
                                                label={field.label}
                                                checked={selectedFields.includes(field.key)}
                                                onChange={() => toggleField(field.key)}
                                            />
                                        ))}
                                    </Group>
                                </Accordion.Panel>
                            </Accordion.Item>
                        ))}
                    </Accordion>
                </Paper>

                {/* Filtres */}
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <IconFilter size={20} />
                            <Text fw={600}>Filtres (optionnel)</Text>
                            {activeFiltersCount > 0 && (
                                <Badge size="sm" color="blue">
                                    {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                                </Badge>
                            )}
                        </Group>
                        {activeFiltersCount > 0 && (
                            <Button
                                variant="subtle"
                                size="xs"
                                onClick={handleResetFilters}
                                leftSection={<IconRefresh size={14} />}
                            >
                                Réinitialiser
                            </Button>
                        )}
                    </Group>

                    <Accordion variant="contained" multiple>
                        {/* Recherche textuelle */}
                        <Accordion.Item value="search">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconUsers size={18} />
                                    <Text fw={500}>Recherche</Text>
                                    {filters.search?.trim() && <Badge size="sm">Actif</Badge>}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <TextInput
                                    placeholder="Rechercher par nom, email, UID..."
                                    value={filters.search || ''}
                                    onChange={(e) =>
                                        setFilters({ ...filters, search: e.currentTarget.value })
                                    }
                                />
                            </Accordion.Panel>
                        </Accordion.Item>

                        {/* Abonnement */}
                        <Accordion.Item value="membership">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconCreditCard size={18} />
                                    <Text fw={500}>Abonnement</Text>
                                    {(filters.membershipTypes?.length || filters.membershipStatus?.length) ? (
                                        <Badge size="sm">
                                            {(filters.membershipTypes?.length || 0) + (filters.membershipStatus?.length || 0)} filtre(s)
                                        </Badge>
                                    ) : null}
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
                                            setFilters({ ...filters, membershipTypes: value as MembershipType[] })
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
                                            setFilters({ ...filters, membershipStatus: value as MembershipStatus[] })
                                        }
                                        clearable
                                    />
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>

                        {/* Tags */}
                        <Accordion.Item value="tags">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconTags size={18} />
                                    <Text fw={500}>Tags</Text>
                                    {(filters.includeTags?.length || filters.excludeTags?.length) ? (
                                        <Badge size="sm">
                                            {(filters.includeTags?.length || 0) + (filters.excludeTags?.length || 0)} tag(s)
                                        </Badge>
                                    ) : null}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap="md">
                                    <MultiSelect
                                        label="Inclure les tags"
                                        description="Les utilisateurs doivent avoir au moins un de ces tags"
                                        placeholder="Sélectionner les tags..."
                                        data={allTags}
                                        value={filters.includeTags || []}
                                        onChange={(value) =>
                                            setFilters({ ...filters, includeTags: value })
                                        }
                                        clearable
                                        searchable
                                    />
                                    <MultiSelect
                                        label="Exclure les tags"
                                        description="Les utilisateurs NE doivent PAS avoir ces tags"
                                        placeholder="Sélectionner les tags..."
                                        data={allTags}
                                        value={filters.excludeTags || []}
                                        onChange={(value) =>
                                            setFilters({ ...filters, excludeTags: value })
                                        }
                                        clearable
                                        searchable
                                    />
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>

                        {/* Période d'inscription */}
                        <Accordion.Item value="dates">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconCalendar size={18} />
                                    <Text fw={500}>Période d'inscription</Text>
                                    {(filters.registrationDateRange?.start || filters.registrationDateRange?.end) && (
                                        <Badge size="sm">Actif</Badge>
                                    )}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Group grow>
                                    <DatePickerInput
                                        label="Date de début"
                                        placeholder="Sélectionnez une date"
                                        value={filters.registrationDateRange?.start || null}
                                        onChange={(value) =>
                                            setFilters({
                                                ...filters,
                                                registrationDateRange: {
                                                    ...filters.registrationDateRange,
                                                    start: value,
                                                },
                                            })
                                        }
                                        clearable
                                        valueFormat="DD/MM/YYYY"
                                    />
                                    <DatePickerInput
                                        label="Date de fin"
                                        placeholder="Sélectionnez une date"
                                        value={filters.registrationDateRange?.end || null}
                                        onChange={(value) =>
                                            setFilters({
                                                ...filters,
                                                registrationDateRange: {
                                                    ...filters.registrationDateRange,
                                                    end: value,
                                                },
                                            })
                                        }
                                        clearable
                                        valueFormat="DD/MM/YYYY"
                                        minDate={filters.registrationDateRange?.start || undefined}
                                    />
                                </Group>
                            </Accordion.Panel>
                        </Accordion.Item>

                        {/* Source d'inscription */}
                        <Accordion.Item value="source">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconUsers size={18} />
                                    <Text fw={500}>Source d'inscription</Text>
                                    {filters.registrationSources?.length ? (
                                        <Badge size="sm">{filters.registrationSources.length} source(s)</Badge>
                                    ) : null}
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
                                        setFilters({ ...filters, registrationSources: value as RegistrationSource[] })
                                    }
                                    clearable
                                />
                            </Accordion.Panel>
                        </Accordion.Item>

                        {/* Points de fidélité */}
                        <Accordion.Item value="loyalty">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconSettings size={18} />
                                    <Text fw={500}>Points de fidélité</Text>
                                    {(filters.loyaltyPointsRange?.min !== undefined || filters.loyaltyPointsRange?.max !== undefined) && (
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
                                        value={filters.loyaltyPointsRange?.min ?? ''}
                                        onChange={(value) =>
                                            setFilters({
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
                                        value={filters.loyaltyPointsRange?.max ?? ''}
                                        onChange={(value) =>
                                            setFilters({
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

                        {/* Options supplémentaires */}
                        <Accordion.Item value="options">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconSettings size={18} />
                                    <Text fw={500}>Options</Text>
                                    {(filters.blockedFilter !== 'all' || filters.emailCardFilter !== 'all') && (
                                        <Badge size="sm">Actif</Badge>
                                    )}
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack gap="md">
                                    <Select
                                        label="Statut de blocage"
                                        data={[
                                            { value: 'all', label: 'Tous les utilisateurs' },
                                            { value: 'not_blocked', label: 'Non bloqués uniquement' },
                                            { value: 'account_blocked', label: 'Comptes bloqués uniquement' },
                                            { value: 'card_blocked', label: 'Cartes bloquées uniquement' },
                                        ]}
                                        value={filters.blockedFilter || 'all'}
                                        onChange={(value) =>
                                            setFilters({ ...filters, blockedFilter: value as any })
                                        }
                                    />
                                    <Select
                                        label="Email carte d'adhérent"
                                        data={[
                                            { value: 'all', label: 'Tous les utilisateurs' },
                                            { value: 'sent', label: 'Carte envoyée' },
                                            { value: 'not_sent', label: 'Carte non envoyée' },
                                        ]}
                                        value={filters.emailCardFilter || 'all'}
                                        onChange={(value) =>
                                            setFilters({ ...filters, emailCardFilter: value as any })
                                        }
                                    />
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>
                </Paper>

                {/* Prévisualisation */}
                <Alert
                    variant="light"
                    color={filteredCount > 0 ? 'blue' : 'orange'}
                    icon={<IconUsers size={20} />}
                >
                    <Group justify="space-between">
                        <Text fw={500}>
                            {filteredCount > 0
                                ? `${filteredCount} utilisateur${filteredCount > 1 ? 's' : ''} correspond${filteredCount > 1 ? 'ent' : ''} aux filtres`
                                : 'Aucun utilisateur ne correspond aux filtres'}
                        </Text>
                        <Text size="sm" c="dimmed">
                            sur {users.length} au total
                        </Text>
                    </Group>
                </Alert>

                <Divider />

                {/* Actions */}
                <Group justify="flex-end">
                    <Button
                        variant="subtle"
                        onClick={() => {
                            handleResetFilters();
                            handleResetFields();
                        }}
                    >
                        Tout réinitialiser
                    </Button>
                    <Button
                        leftSection={<IconDownload size={18} />}
                        onClick={handleExport}
                        disabled={selectedFields.length === 0 || filteredCount === 0}
                        loading={exporting}
                    >
                        Exporter ({filteredCount})
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
