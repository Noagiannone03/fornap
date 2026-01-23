import { useState } from 'react';
import {
    Paper,
    Stack,
    Group,
    TextInput,
    Select,
    TagsInput,
    Button,
    Collapse,
    ActionIcon,
    Badge,
    Divider,
    Text,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconSearch,
    IconFilter,
    IconFilterOff,
    IconChevronDown,
    IconChevronUp,
    IconCalendar,
    IconX,
} from '@tabler/icons-react';
import type { MembershipType, MembershipStatus } from '../../../../shared/types/user';
import {
    MEMBERSHIP_TYPE_LABELS,
    MEMBERSHIP_STATUS_LABELS,
} from '../../../../shared/types/user';

interface UsersFiltersPanelProps {
    search: string;
    membershipType: MembershipType | null;
    membershipStatus: MembershipStatus | null;
    selectedTags: string[];
    blockedFilter: string | null;
    sortBy: string;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
    allTags: string[];
    filteredLegacyCount: number;
    filteredUsersCount: number;
    onSearchChange: (value: string) => void;
    onMembershipTypeChange: (value: MembershipType | null) => void;
    onMembershipStatusChange: (value: MembershipStatus | null) => void;
    onSelectedTagsChange: (value: string[]) => void;
    onBlockedFilterChange: (value: string | null) => void;
    onSortByChange: (value: string) => void;
    onDateRangeStartChange: (value: Date | null) => void;
    onDateRangeEndChange: (value: Date | null) => void;
    onResetFilters: () => void;
}

export function UsersFiltersPanel({
    search,
    membershipType,
    membershipStatus,
    selectedTags,
    blockedFilter,
    sortBy,
    dateRangeStart,
    dateRangeEnd,
    allTags,
    filteredLegacyCount,
    filteredUsersCount,
    onSearchChange,
    onMembershipTypeChange,
    onMembershipStatusChange,
    onSelectedTagsChange,
    onBlockedFilterChange,
    onSortByChange,
    onDateRangeStartChange,
    onDateRangeEndChange,
    onResetFilters,
}: UsersFiltersPanelProps) {
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const activeFiltersCount = [
        membershipType,
        membershipStatus,
        selectedTags.length > 0,
        blockedFilter,
        dateRangeStart || dateRangeEnd,
        sortBy !== 'date_desc',
    ].filter(Boolean).length;

    const hasActiveFilters = activeFiltersCount > 0 || search.length > 0;

    return (
        <Paper shadow="xs" p="md" radius="md" mb="xl" bg="white">
            <Stack gap="sm">
                {/* Search Bar Row */}
                <Group justify="space-between" align="center">
                    <TextInput
                        placeholder="Rechercher par nom, email..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => onSearchChange(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />

                    <Group gap="xs">
                        <Button
                            variant={showAdvancedFilters ? 'light' : 'default'}
                            leftSection={<IconFilter size={16} />}
                            rightSection={
                                activeFiltersCount > 0 ? (
                                    <Badge size="xs" circle color="blue">
                                        {activeFiltersCount}
                                    </Badge>
                                ) : showAdvancedFilters ? (
                                    <IconChevronUp size={16} />
                                ) : (
                                    <IconChevronDown size={16} />
                                )
                            }
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        >
                            Filtres
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                variant="subtle"
                                color="red"
                                size="xs"
                                leftSection={<IconX size={14} />}
                                onClick={onResetFilters}
                            >
                                Reset
                            </Button>
                        )}
                    </Group>
                </Group>

                {/* Advanced Filters */}
                <Collapse in={showAdvancedFilters}>
                    <Stack gap="md" mt="md" pt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                        <Group grow align="flex-start">
                            <Select
                                label="Type"
                                placeholder="Tous"
                                data={[
                                    { value: '', label: 'Tous' },
                                    { value: 'monthly', label: MEMBERSHIP_TYPE_LABELS.monthly },
                                    { value: 'annual', label: MEMBERSHIP_TYPE_LABELS.annual },
                                    { value: 'lifetime', label: MEMBERSHIP_TYPE_LABELS.lifetime },
                                ]}
                                value={membershipType || ''}
                                onChange={(value) => onMembershipTypeChange((value as MembershipType) || null)}
                                clearable
                            />
                            <Select
                                label="Statut"
                                placeholder="Tous"
                                data={[
                                    { value: '', label: 'Tous' },
                                    { value: 'active', label: MEMBERSHIP_STATUS_LABELS.active },
                                    { value: 'expired', label: MEMBERSHIP_STATUS_LABELS.expired },
                                    { value: 'pending', label: MEMBERSHIP_STATUS_LABELS.pending },
                                    { value: 'cancelled', label: MEMBERSHIP_STATUS_LABELS.cancelled },
                                ]}
                                value={membershipStatus || ''}
                                onChange={(value) => onMembershipStatusChange((value as MembershipStatus) || null)}
                                clearable
                            />
                            <Select
                                label="Blocage"
                                placeholder="Tous"
                                data={[
                                    { value: '', label: 'Tous' },
                                    { value: 'not_blocked', label: 'Non bloqués' },
                                    { value: 'account_blocked', label: 'Compte bloqué' },
                                    { value: 'card_blocked', label: 'Carte bloquée' },
                                ]}
                                value={blockedFilter || ''}
                                onChange={onBlockedFilterChange}
                                clearable
                            />
                        </Group>

                        <Group grow align="flex-start">
                            <TagsInput
                                label="Tags"
                                placeholder="Rechercher des tags"
                                data={allTags}
                                value={selectedTags}
                                onChange={onSelectedTagsChange}
                                clearable
                            />
                            <Select
                                label="Trier par"
                                data={[
                                    { value: 'date_desc', label: "Récent d'abord" },
                                    { value: 'date_asc', label: "Ancien d'abord" },
                                    { value: 'name_asc', label: 'Nom (A-Z)' },
                                    { value: 'name_desc', label: 'Nom (Z-A)' },
                                ]}
                                value={sortBy}
                                onChange={(value) => onSortByChange(value || 'date_desc')}
                            />
                        </Group>

                        <Group align="flex-end">
                            <DatePickerInput
                                label="Période"
                                placeholder="Début"
                                value={dateRangeStart}
                                onChange={(value) => onDateRangeStartChange(typeof value === 'string' && value ? new Date(value) : value as Date | null)}
                                clearable
                                valueFormat="DD/MM/YYYY"
                                leftSection={<IconCalendar size={16} />}
                                style={{ flex: 1 }}
                            />
                            <DatePickerInput
                                label=" "
                                placeholder="Fin"
                                value={dateRangeEnd}
                                onChange={(value) => onDateRangeEndChange(typeof value === 'string' && value ? new Date(value) : value as Date | null)}
                                clearable
                                valueFormat="DD/MM/YYYY"
                                minDate={dateRangeStart || undefined}
                                style={{ flex: 1 }}
                            />
                        </Group>
                    </Stack>
                </Collapse>

                {/* Results Summary */}
                {hasActiveFilters && (
                    <Group justify="space-between" mt="xs">
                        <Group gap="xs">
                            <Text size="sm" c="dimmed">Résultats :</Text>
                            <Badge variant="dot" color="blue">{filteredUsersCount} utilisateurs</Badge>
                            {filteredLegacyCount > 0 && (
                                <Badge variant="dot" color="orange">{filteredLegacyCount} anciens</Badge>
                            )}
                        </Group>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}
