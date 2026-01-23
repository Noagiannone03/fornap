import { useState } from 'react';
import {
    Paper,
    Stack,
    Group,
    Title,
    Text,
    Badge,
    Button,
    Table,
    Checkbox,
    Pagination,
    Collapse,
    Box,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
    IconArrowRight,
    IconChevronDown,
    IconChevronUp,
    IconCalendar,
    IconUserExclamation,
} from '@tabler/icons-react';
import type { UserListItem } from '../../../../shared/types/user';
import type { TagConfig } from '../../../../shared/services/tagService';

interface UserTableRowProps {
    user: UserListItem;
    isLegacy: boolean;
    tagsConfig: TagConfig[];
    isSelected?: boolean;
    onSelect?: (uid: string, checked: boolean) => void;
    onView?: (uid: string) => void;
    onEdit?: (uid: string) => void;
    onDelete?: (uid: string, name: string) => void;
    onSendEmail?: (email: string) => void;
    onToggleAccountBlock?: (uid: string, current: boolean) => void;
    onToggleCardBlock?: (uid: string, current: boolean) => void;
    onMigrate?: (uid: string, name: string) => void;
    onSendMembershipCard?: (uid: string, userName: string, isResend: boolean) => void;
}

interface LegacyMembersSectionProps {
    legacyMembers: UserListItem[];
    paginatedLegacyMembers: UserListItem[];
    tagsConfig: TagConfig[];
    selectedLegacyUsers: Set<string>;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    legacyDateRangeStart: Date | null;
    legacyDateRangeEnd: Date | null;
    onLegacyDateRangeStartChange: (value: Date | null) => void;
    onLegacyDateRangeEndChange: (value: Date | null) => void;
    onSelectLegacyUser: (uid: string, checked: boolean) => void;
    onSelectAllLegacyUsers: (checked: boolean) => void;
    onPageChange: (page: number) => void;
    onBulkMigration: () => void;
    onSendEmail: (email: string) => void;
    onMigrateLegacyMember: (uid: string, name: string) => void;
    UserRowComponent: React.ComponentType<UserTableRowProps>;
}

export function LegacyMembersSection({
    legacyMembers,
    paginatedLegacyMembers,
    tagsConfig,
    selectedLegacyUsers,
    currentPage,
    totalPages,
    itemsPerPage,
    legacyDateRangeStart,
    legacyDateRangeEnd,
    onLegacyDateRangeStartChange,
    onLegacyDateRangeEndChange,
    onSelectLegacyUser,
    onSelectAllLegacyUsers,
    onPageChange,
    onBulkMigration,
    onSendEmail,
    onMigrateLegacyMember,
    UserRowComponent,
}: LegacyMembersSectionProps) {
    const [showDateFilter, setShowDateFilter] = useState(false);

    if (legacyMembers.length === 0) {
        return null;
    }

    return (
        <Stack gap="sm">
            {/* Section header */}
            <Paper
                withBorder
                p="md"
                radius="md"
                style={{
                    borderLeft: '4px solid var(--mantine-color-orange-6)',
                }}
            >
                <Stack gap="sm">
                    <Group justify="space-between" wrap="wrap" gap="sm">
                        <Group gap="md">
                            <Box
                                p={8}
                                style={{
                                    background: 'var(--mantine-color-orange-0)',
                                    borderRadius: 'var(--mantine-radius-md)',
                                }}
                            >
                                <IconUserExclamation size={24} color="var(--mantine-color-orange-6)" stroke={1.5} />
                            </Box>
                            <div>
                                <Group gap="xs">
                                    <Title order={3} size="h4">Membres a migrer</Title>
                                    <Badge size="lg" color="orange" variant="light" radius="sm">
                                        {legacyMembers.length}
                                    </Badge>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Anciens membres non migres
                                </Text>
                            </div>
                        </Group>

                        <Group gap="sm" wrap="wrap">
                            <Button
                                variant="subtle"
                                size="xs"
                                leftSection={<IconCalendar size={14} />}
                                rightSection={showDateFilter ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                onClick={() => setShowDateFilter(!showDateFilter)}
                            >
                                Filtrer par date
                            </Button>

                            {selectedLegacyUsers.size > 0 && (
                                <>
                                    <Badge size="lg" color="blue" variant="filled" radius="sm">
                                        {selectedLegacyUsers.size} selectionne{selectedLegacyUsers.size > 1 ? 's' : ''}
                                    </Badge>
                                    <Button
                                        leftSection={<IconArrowRight size={16} />}
                                        color="blue"
                                        size="sm"
                                        onClick={onBulkMigration}
                                    >
                                        Migrer la selection
                                    </Button>
                                </>
                            )}
                        </Group>
                    </Group>

                    {/* Date filter */}
                    <Collapse in={showDateFilter}>
                        <Paper withBorder p="sm" radius="sm" bg="gray.0">
                            <Group align="flex-end" wrap="wrap" gap="sm">
                                <DatePickerInput
                                    label="Du"
                                    placeholder="Date debut"
                                    value={legacyDateRangeStart}
                                    onChange={(value) => {
                                        if (typeof value === 'string') {
                                            onLegacyDateRangeStartChange(value ? new Date(value) : null);
                                        } else {
                                            onLegacyDateRangeStartChange(value);
                                        }
                                    }}
                                    clearable
                                    valueFormat="DD/MM/YYYY"
                                    size="xs"
                                    style={{ minWidth: 140 }}
                                />
                                <DatePickerInput
                                    label="Au"
                                    placeholder="Date fin"
                                    value={legacyDateRangeEnd}
                                    onChange={(value) => {
                                        if (typeof value === 'string') {
                                            onLegacyDateRangeEndChange(value ? new Date(value) : null);
                                        } else {
                                            onLegacyDateRangeEndChange(value);
                                        }
                                    }}
                                    clearable
                                    valueFormat="DD/MM/YYYY"
                                    minDate={legacyDateRangeStart || undefined}
                                    size="xs"
                                    style={{ minWidth: 140 }}
                                />
                                {(legacyDateRangeStart || legacyDateRangeEnd) && (
                                    <Button
                                        variant="subtle"
                                        size="xs"
                                        color="red"
                                        onClick={() => {
                                            onLegacyDateRangeStartChange(null);
                                            onLegacyDateRangeEndChange(null);
                                        }}
                                    >
                                        Effacer
                                    </Button>
                                )}
                            </Group>
                        </Paper>
                    </Collapse>
                </Stack>
            </Paper>

            {/* Table */}
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <Table.ScrollContainer minWidth={1000}>
                    <Table striped highlightOnHover verticalSpacing="sm">
                        <Table.Thead style={{ background: 'var(--mantine-color-orange-0)' }}>
                            <Table.Tr>
                                <Table.Th style={{ width: 40 }}>
                                    <Checkbox
                                        checked={
                                            paginatedLegacyMembers.length > 0 &&
                                            paginatedLegacyMembers.every((m) => selectedLegacyUsers.has(m.uid))
                                        }
                                        indeterminate={
                                            paginatedLegacyMembers.some((m) => selectedLegacyUsers.has(m.uid)) &&
                                            !paginatedLegacyMembers.every((m) => selectedLegacyUsers.has(m.uid))
                                        }
                                        onChange={(e) => onSelectAllLegacyUsers(e.currentTarget.checked)}
                                    />
                                </Table.Th>
                                <Table.Th>Membre</Table.Th>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Type</Table.Th>
                                <Table.Th>Statut</Table.Th>
                                <Table.Th>Tags</Table.Th>
                                <Table.Th>Source</Table.Th>
                                <Table.Th>Inscription</Table.Th>
                                <Table.Th style={{ width: 80 }}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {paginatedLegacyMembers.map((member) => (
                                <UserRowComponent
                                    key={member.uid}
                                    user={member}
                                    isLegacy={true}
                                    tagsConfig={tagsConfig}
                                    isSelected={selectedLegacyUsers.has(member.uid)}
                                    onSelect={onSelectLegacyUser}
                                    onSendEmail={onSendEmail}
                                    onMigrate={onMigrateLegacyMember}
                                />
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>

                {paginatedLegacyMembers.length > 0 && (
                    <Group
                        justify="space-between"
                        p="md"
                        style={{
                            borderTop: '1px solid var(--mantine-color-orange-2)',
                            background: 'var(--mantine-color-orange-0)',
                        }}
                    >
                        <Text size="sm" c="dimmed">
                            Affichage de <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
                            <strong>{Math.min(currentPage * itemsPerPage, legacyMembers.length)}</strong> sur{' '}
                            <strong>{legacyMembers.length}</strong> membres
                        </Text>
                        <Pagination
                            total={totalPages}
                            value={currentPage}
                            onChange={onPageChange}
                            size="sm"
                            radius="md"
                            withEdges
                        />
                    </Group>
                )}
            </Paper>
        </Stack>
    );
}
