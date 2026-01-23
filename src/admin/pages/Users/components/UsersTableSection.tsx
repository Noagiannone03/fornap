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
    Box,
} from '@mantine/core';
import {
    IconUsers,
    IconTags,
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

interface UsersTableSectionProps {
    users: UserListItem[];
    paginatedUsers: UserListItem[];
    tagsConfig: TagConfig[];
    selectedUsers: Set<string>;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    loading: boolean;
    onSelectUser: (uid: string, checked: boolean) => void;
    onSelectAllUsers: (checked: boolean) => void;
    onPageChange: (page: number) => void;
    onBulkAddTags: () => void;
    onViewUser: (uid: string) => void;
    onEditUser: (uid: string) => void;
    onDeleteUser: (uid: string, name: string) => void;
    onSendEmail: (email: string) => void;
    onToggleAccountBlock: (uid: string, current: boolean) => void;
    onToggleCardBlock: (uid: string, current: boolean) => void;
    onSendMembershipCard: (uid: string, userName: string, isResend: boolean) => void;
    UserRowComponent: React.ComponentType<UserTableRowProps>;
}

export function UsersTableSection({
    users,
    paginatedUsers,
    tagsConfig,
    selectedUsers,
    currentPage,
    totalPages,
    itemsPerPage,
    loading,
    onSelectUser,
    onSelectAllUsers,
    onPageChange,
    onBulkAddTags,
    onViewUser,
    onEditUser,
    onDeleteUser,
    onSendEmail,
    onToggleAccountBlock,
    onToggleCardBlock,
    onSendMembershipCard,
    UserRowComponent,
}: UsersTableSectionProps) {
    return (
        <Stack gap="sm" mb="xl">
            {/* Section header */}
            <Paper
                withBorder
                p="md"
                radius="md"
                style={{
                    borderLeft: '4px solid var(--mantine-color-blue-6)',
                }}
            >
                <Group justify="space-between" wrap="wrap" gap="sm">
                    <Group gap="md">
                        <Box
                            p={8}
                            style={{
                                background: 'var(--mantine-color-blue-0)',
                                borderRadius: 'var(--mantine-radius-md)',
                            }}
                        >
                            <IconUsers size={24} color="var(--mantine-color-blue-6)" stroke={1.5} />
                        </Box>
                        <div>
                            <Group gap="xs">
                                <Title order={3} size="h4">Utilisateurs</Title>
                                <Badge size="lg" color="blue" variant="light" radius="sm">
                                    {users.length}
                                </Badge>
                            </Group>
                            <Text size="sm" c="dimmed">
                                Membres du nouveau systeme
                            </Text>
                        </div>
                    </Group>

                    {selectedUsers.size > 0 && (
                        <Group gap="sm">
                            <Badge size="lg" color="green" variant="filled" radius="sm">
                                {selectedUsers.size} selectionne{selectedUsers.size > 1 ? 's' : ''}
                            </Badge>
                            <Button
                                leftSection={<IconTags size={16} />}
                                color="green"
                                size="sm"
                                variant="light"
                                onClick={onBulkAddTags}
                            >
                                Ajouter des tags
                            </Button>
                        </Group>
                    )}
                </Group>
            </Paper>

            {/* Table */}
            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <Table.ScrollContainer minWidth={1000}>
                    <Table striped highlightOnHover verticalSpacing="sm">
                        <Table.Thead style={{ background: 'var(--mantine-color-gray-0)' }}>
                            <Table.Tr>
                                <Table.Th style={{ width: 40 }}>
                                    <Checkbox
                                        checked={
                                            paginatedUsers.length > 0 &&
                                            paginatedUsers.every((u) => selectedUsers.has(u.uid))
                                        }
                                        indeterminate={
                                            paginatedUsers.some((u) => selectedUsers.has(u.uid)) &&
                                            !paginatedUsers.every((u) => selectedUsers.has(u.uid))
                                        }
                                        onChange={(e) => onSelectAllUsers(e.currentTarget.checked)}
                                    />
                                </Table.Th>
                                <Table.Th>Utilisateur</Table.Th>
                                <Table.Th>Email</Table.Th>
                                <Table.Th>Abonnement</Table.Th>
                                <Table.Th>Statut</Table.Th>
                                <Table.Th>Tags</Table.Th>
                                <Table.Th>Source</Table.Th>
                                <Table.Th>Inscription</Table.Th>
                                <Table.Th style={{ width: 80 }}>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {paginatedUsers.map((user) => (
                                <UserRowComponent
                                    key={user.uid}
                                    user={user}
                                    isLegacy={false}
                                    tagsConfig={tagsConfig}
                                    isSelected={selectedUsers.has(user.uid)}
                                    onSelect={onSelectUser}
                                    onView={onViewUser}
                                    onEdit={onEditUser}
                                    onDelete={onDeleteUser}
                                    onSendEmail={onSendEmail}
                                    onToggleAccountBlock={onToggleAccountBlock}
                                    onToggleCardBlock={onToggleCardBlock}
                                    onSendMembershipCard={onSendMembershipCard}
                                />
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>

                {users.length === 0 && !loading && (
                    <Box py="xl" ta="center">
                        <IconUsers size={48} color="var(--mantine-color-gray-4)" stroke={1} />
                        <Text c="dimmed" mt="sm">Aucun utilisateur trouve</Text>
                    </Box>
                )}

                {users.length > 0 && (
                    <Group
                        justify="space-between"
                        p="md"
                        style={{
                            borderTop: '1px solid var(--mantine-color-gray-2)',
                            background: 'var(--mantine-color-gray-0)',
                        }}
                    >
                        <Text size="sm" c="dimmed">
                            Affichage de <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a{' '}
                            <strong>{Math.min(currentPage * itemsPerPage, users.length)}</strong> sur{' '}
                            <strong>{users.length}</strong> utilisateurs
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
