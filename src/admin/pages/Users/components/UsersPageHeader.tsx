import {
    Group,
    Title,
    Button,
    Menu,
    Badge,
    Paper,
    Text,
    ActionIcon,
    Tooltip,
    Divider,
} from '@mantine/core';
import {
    IconUpload,
    IconPlus,
    IconUsersGroup,
    IconSend,
    IconTags,
    IconDatabaseImport,
    IconCreditCard,
    IconWand,
    IconAlertTriangle,
    IconTool,
    IconTableExport,
    IconUserSearch,
} from '@tabler/icons-react';

interface UsersPageHeaderProps {
    duplicateGroupsCount: number;
    loadingDuplicates: boolean;
    unsentUsersCount: number;
    totalUsersCount: number;
    onTagsManager: () => void;
    onPurchaseMigration: () => void;
    onPaymentFix: () => void;
    onItemNormalization: () => void;
    onContributionFix: () => void;
    onDuplicateCheck: () => void;
    onExport: () => void;
    onCsvImport: () => void;
    onExordeChecker: () => void;
    onQuickAdd: () => void;
    onMassiveSend: (mode: 'all' | 'force' | 'unsent') => void;
    onNewUser: () => void;
    onBulkEdit: () => void;
}

export function UsersPageHeader({
    duplicateGroupsCount,
    loadingDuplicates,
    unsentUsersCount,
    totalUsersCount,
    onTagsManager,
    onPurchaseMigration,
    onPaymentFix,
    onItemNormalization,
    onContributionFix,
    onDuplicateCheck,
    onExport,
    onCsvImport,
    onExordeChecker: _onExordeChecker,
    onQuickAdd: _onQuickAdd,
    onMassiveSend,
    onNewUser,
    onBulkEdit,
}: UsersPageHeaderProps) {
    return (
        <div style={{ marginBottom: 'var(--mantine-spacing-xl)' }}>
            {/* 1. Header Line: Title + Primary Action */}
            <Group justify="space-between" mb="lg" align="center">
                <div>
                    <Title order={2} fw={800} style={{ fontSize: '2rem' }}>Utilisateurs</Title>
                    <Text c="dimmed" size="sm">Gestion des membres et abonnements</Text>
                </div>
                <Button
                    leftSection={<IconPlus size={18} />}
                    size="md"
                    color="black"
                    radius="md"
                    onClick={onNewUser}
                >
                    Nouvel Utilisateur
                </Button>
            </Group>

            {/* 2. Toolbar Line: Categorized Tools */}
            <Paper p="sm" radius="md" withBorder bg="white">
                <Group justify="space-between">

                    {/* Left: Common Management Tools */}
                    <Group gap="xs">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mr={8}>Gestion:</Text>

                        <Button
                            variant="light"
                            color="grape"
                            size="sm"
                            leftSection={<IconTags size={16} />}
                            onClick={onTagsManager}
                        >
                            Tags
                        </Button>

                        <Button
                            variant="light"
                            color="orange"
                            size="sm"
                            leftSection={<IconUsersGroup size={16} />}
                            onClick={onDuplicateCheck}
                            loading={loadingDuplicates}
                            rightSection={
                                duplicateGroupsCount > 0 ? (
                                    <Badge size="xs" color="red" variant="filled" circle>
                                        {duplicateGroupsCount}
                                    </Badge>
                                ) : null
                            }
                        >
                            Doublons
                        </Button>

                        <Menu shadow="md" width={240}>
                            <Menu.Target>
                                <Button
                                    variant="light"
                                    color="green"
                                    size="sm"
                                    leftSection={<IconSend size={16} />}
                                >
                                    Cartes
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Envoi de cartes membres</Menu.Label>
                                <Menu.Item leftSection={<IconSend size={14} />} color="orange" onClick={() => onMassiveSend('unsent')}>
                                    Aux non-envoyés ({unsentUsersCount})
                                </Menu.Item>
                                <Menu.Item leftSection={<IconSend size={14} />} onClick={() => onMassiveSend('all')}>
                                    À tous ({totalUsersCount})
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>

                        <Button
                            variant="light"
                            color="indigo"
                            size="sm"
                            leftSection={<IconUserSearch size={16} />}
                            onClick={onBulkEdit}
                        >
                            Modification en masse
                        </Button>
                    </Group>

                    {/* Right: Technical & Data Tools */}
                    <Group gap="xs">
                        <Divider orientation="vertical" />

                        {/* Split Import/Export for clarity */}
                        <Tooltip label="Exporter en Excel">
                            <ActionIcon variant="subtle" color="gray" size="lg" onClick={onExport}>
                                <IconTableExport size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Importer CSV">
                            <ActionIcon variant="subtle" color="gray" size="lg" onClick={onCsvImport}>
                                <IconUpload size={18} />
                            </ActionIcon>
                        </Tooltip>

                        <Divider orientation="vertical" />

                        <Menu shadow="md" width={240} position="bottom-end">
                            <Menu.Target>
                                <Button variant="subtle" color="gray" size="sm" leftSection={<IconTool size={16} />}>
                                    Réparations
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Outils Techniques</Menu.Label>
                                <Menu.Item leftSection={<IconDatabaseImport size={14} />} onClick={onPurchaseMigration}>
                                    Migrer les achats
                                </Menu.Item>
                                <Menu.Item leftSection={<IconCreditCard size={14} />} onClick={onPaymentFix}>
                                    Corriger paiements
                                </Menu.Item>
                                <Menu.Item leftSection={<IconWand size={14} />} onClick={onItemNormalization}>
                                    Normaliser les données
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item leftSection={<IconAlertTriangle size={14} />} color="red" onClick={onContributionFix}>
                                    Fix Inkipit Bug
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>

                </Group>
            </Paper>
        </div>
    );
}
