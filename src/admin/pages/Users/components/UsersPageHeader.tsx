import {
    Group,
    Title,
    Button,
    Menu,
    Badge,
    Paper,
    Text,
    Divider,
    ActionIcon,
    Tooltip,
} from '@mantine/core';
import {
    IconDownload,
    IconUpload,
    IconPlus,
    IconUsersGroup,
    IconSearch,
    IconSend,
    IconTags,
    IconDatabaseImport,
    IconCreditCard,
    IconWand,
    IconAlertTriangle,
    IconSettings,
    IconFileTypeCsv,
    IconTableExport,
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
    onExordeChecker,
    onQuickAdd,
    onMassiveSend,
    onNewUser,
}: UsersPageHeaderProps) {
    return (
        <Paper shadow="xs" p="md" radius="md" mb="xl" bg="white">
            <Group justify="space-between" mb="md">
                <div>
                    <Title order={2} fw={700}>Utilisateurs</Title>
                    <Text c="dimmed" size="sm">Gerez l'ensemble de vos membres</Text>
                </div>
                <Group>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={onNewUser}
                        color="black"
                        radius="md"
                    >
                        Nouvel utilisateur
                    </Button>
                </Group>
            </Group>

            <Divider mb="md" />

            {/* Action Bar - Clear & Explicit */}
            <Group justify="space-between" wrap="wrap">
                <Group gap="xs">
                    <Text size="sm" fw={500} c="dimmed" mr="xs">Outils :</Text>

                    <Button
                        variant="default"
                        size="sm"
                        leftSection={<IconTags size={16} color="var(--mantine-color-grape-6)" />}
                        onClick={onTagsManager}
                        radius="md"
                    >
                        Tags
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        leftSection={<IconUsersGroup size={16} color="var(--mantine-color-orange-6)" />}
                        onClick={onDuplicateCheck}
                        loading={loadingDuplicates}
                        radius="md"
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
                                variant="default"
                                size="sm"
                                leftSection={<IconSend size={16} color="var(--mantine-color-green-6)" />}
                                radius="md"
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

                    <Tooltip label="Ajout rapide">
                        <ActionIcon variant="default" size="lg" radius="md" onClick={onQuickAdd}>
                            <IconPlus size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>

                <Group gap="xs">
                    <Menu shadow="md" width={180}>
                        <Menu.Target>
                            <Button variant="subtle" size="sm" leftSection={<IconTableExport size={16} />}>
                                Donnees
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item leftSection={<IconDownload size={14} />} onClick={onExport}>
                                Exporter Excel
                            </Menu.Item>
                            <Menu.Item leftSection={<IconUpload size={14} />} onClick={onCsvImport}>
                                Importer CSV
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>

                    <Menu shadow="md" width={220} position="bottom-end">
                        <Menu.Target>
                            <Button variant="subtle" size="sm" leftSection={<IconSettings size={16} />}>
                                Maintenance
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Label>Verification</Menu.Label>
                            <Menu.Item leftSection={<IconSearch size={14} />} onClick={onExordeChecker}>
                                Checker EXORDE
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Label>Reparations</Menu.Label>
                            <Menu.Item leftSection={<IconDatabaseImport size={14} />} onClick={onPurchaseMigration}>
                                Migrer Achats
                            </Menu.Item>
                            <Menu.Item leftSection={<IconCreditCard size={14} />} onClick={onPaymentFix}>
                                Fix Paiements
                            </Menu.Item>
                            <Menu.Item leftSection={<IconWand size={14} />} onClick={onItemNormalization}>
                                Normaliser Items
                            </Menu.Item>
                            <Menu.Item leftSection={<IconAlertTriangle size={14} />} color="red" onClick={onContributionFix}>
                                Fix Inkipit
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Group>
        </Paper>
    );
}
