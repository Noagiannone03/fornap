import { useState, useEffect } from 'react';
import {
    Modal,
    Stack,
    Text,
    Group,
    Button,
    Table,
    Badge,
    Progress,
    Alert,
    Select,
    Paper,
    LoadingOverlay,
    Checkbox,
    ActionIcon,
    Tooltip,
    Divider,
    TextInput,
} from '@mantine/core';
import {
    IconRefresh,
    IconCheck,
    IconX,
    IconArrowRight,
    IconAlertTriangle,
    IconWand,
    IconSearch,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    getAllItemNames,
    detectNonStandardItems,
    suggestNormalization,
    normalizeItemName,
    autoNormalizeAll,
    STANDARD_ITEM_NAMES,
    type ItemNameStats,
    type NormalizationResult,
} from '../../shared/services/itemNormalizationService';

interface ItemNormalizationModalProps {
    opened: boolean;
    onClose: () => void;
    onComplete?: () => void;
}

interface ItemWithSuggestion extends ItemNameStats {
    suggestion: string | null;
    selected: boolean;
    customTarget?: string;
}

export function ItemNormalizationModal({ opened, onClose, onComplete }: ItemNormalizationModalProps) {
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [normalizing, setNormalizing] = useState(false);
    const [allItems, setAllItems] = useState<ItemNameStats[]>([]);
    const [nonStandardItems, setNonStandardItems] = useState<ItemWithSuggestion[]>([]);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [result, setResult] = useState<NormalizationResult | null>(null);
    const [showAllItems, setShowAllItems] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    useEffect(() => {
        if (opened) {
            handleScan();
        }
    }, [opened]);

    const handleScan = async () => {
        setScanning(true);
        setResult(null);
        try {
            const items = await getAllItemNames();
            setAllItems(items);

            const nonStandard = detectNonStandardItems(items);
            const withSuggestions: ItemWithSuggestion[] = nonStandard.map(item => ({
                ...item,
                suggestion: suggestNormalization(item.itemName),
                selected: suggestNormalization(item.itemName) !== null,
            }));
            setNonStandardItems(withSuggestions);

            if (nonStandard.length === 0) {
                notifications.show({
                    title: 'Parfait !',
                    message: 'Tous les noms d\'items sont standards',
                    color: 'green',
                });
            }
        } catch (error) {
            console.error('Error scanning items:', error);
            notifications.show({
                title: 'Erreur',
                message: 'Impossible de scanner les items',
                color: 'red',
            });
        } finally {
            setScanning(false);
        }
    };

    const handleNormalizeItem = async (item: ItemWithSuggestion, dryRun: boolean = false) => {
        const targetName = item.customTarget || item.suggestion;
        if (!targetName) {
            notifications.show({
                title: 'Erreur',
                message: 'Veuillez selectionner un nom cible',
                color: 'red',
            });
            return;
        }

        setNormalizing(true);
        setProgress(0);
        setProgressMessage('');

        try {
            const result = await normalizeItemName(
                item.itemName,
                targetName,
                dryRun,
                (current, total, log) => {
                    setProgress((current / total) * 100);
                    setProgressMessage(log);
                }
            );

            setResult(result);

            if (!dryRun) {
                notifications.show({
                    title: 'Succes',
                    message: `${result.totalUpdated} documents mis a jour`,
                    color: 'green',
                });
                // Relancer le scan pour actualiser
                await handleScan();
                onComplete?.();
            }
        } catch (error) {
            console.error('Error normalizing item:', error);
            notifications.show({
                title: 'Erreur',
                message: 'Erreur lors de la normalisation',
                color: 'red',
            });
        } finally {
            setNormalizing(false);
        }
    };

    const handleAutoNormalizeAll = async (dryRun: boolean = false) => {
        const itemsToNormalize = nonStandardItems.filter(item => item.selected && (item.suggestion || item.customTarget));
        if (itemsToNormalize.length === 0) {
            notifications.show({
                title: 'Attention',
                message: 'Aucun item selectionne pour la normalisation',
                color: 'orange',
            });
            return;
        }

        setNormalizing(true);
        setProgress(0);
        setProgressMessage('');

        try {
            let totalUpdated = 0;
            let contributionsUpdated = 0;
            let purchasesUpdated = 0;
            const allLogs: string[] = [];

            for (let i = 0; i < itemsToNormalize.length; i++) {
                const item = itemsToNormalize[i];
                const targetName = item.customTarget || item.suggestion;
                if (!targetName) continue;

                setProgressMessage(`Traitement: ${item.itemName} -> ${targetName}`);
                setProgress(((i + 1) / itemsToNormalize.length) * 100);

                const result = await normalizeItemName(item.itemName, targetName, dryRun);
                totalUpdated += result.totalUpdated;
                contributionsUpdated += result.contributionsUpdated;
                purchasesUpdated += result.purchasesUpdated;
                allLogs.push(...result.logs);
            }

            setResult({
                totalUpdated,
                contributionsUpdated,
                purchasesUpdated,
                errors: 0,
                logs: allLogs,
            });

            if (!dryRun) {
                notifications.show({
                    title: 'Succes',
                    message: `${totalUpdated} documents mis a jour`,
                    color: 'green',
                });
                await handleScan();
                onComplete?.();
            }
        } catch (error) {
            console.error('Error auto-normalizing:', error);
            notifications.show({
                title: 'Erreur',
                message: 'Erreur lors de la normalisation automatique',
                color: 'red',
            });
        } finally {
            setNormalizing(false);
        }
    };

    const toggleItemSelection = (index: number) => {
        setNonStandardItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], selected: !updated[index].selected };
            return updated;
        });
    };

    const setItemTarget = (index: number, target: string) => {
        setNonStandardItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], customTarget: target };
            return updated;
        });
    };

    const selectAll = () => {
        setNonStandardItems(prev => prev.map(item => ({
            ...item,
            selected: item.suggestion !== null,
        })));
    };

    const deselectAll = () => {
        setNonStandardItems(prev => prev.map(item => ({
            ...item,
            selected: false,
        })));
    };

    const filteredAllItems = allItems.filter(item =>
        item.itemName.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const filteredNonStandard = nonStandardItems.filter(item =>
        item.itemName.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const selectedCount = nonStandardItems.filter(item => item.selected).length;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Normalisation des noms d'items"
            size="xl"
            centered
        >
            <LoadingOverlay visible={scanning} />

            <Stack gap="md">
                {/* Stats */}
                <Group grow>
                    <Paper withBorder p="sm" radius="md">
                        <Text size="sm" c="dimmed">Total items uniques</Text>
                        <Text size="xl" fw={700}>{allItems.length}</Text>
                    </Paper>
                    <Paper withBorder p="sm" radius="md" bg={nonStandardItems.length > 0 ? 'orange.0' : 'green.0'}>
                        <Text size="sm" c="dimmed">Non standards</Text>
                        <Text size="xl" fw={700} c={nonStandardItems.length > 0 ? 'orange' : 'green'}>
                            {nonStandardItems.length}
                        </Text>
                    </Paper>
                    <Paper withBorder p="sm" radius="md">
                        <Text size="sm" c="dimmed">Standards</Text>
                        <Text size="xl" fw={700} c="green">{STANDARD_ITEM_NAMES.length}</Text>
                    </Paper>
                </Group>

                {/* Actions */}
                <Group justify="space-between">
                    <Group>
                        <Button
                            leftSection={<IconRefresh size={16} />}
                            variant="light"
                            onClick={handleScan}
                            loading={scanning}
                        >
                            Re-scanner
                        </Button>
                        <Button
                            variant="subtle"
                            onClick={() => setShowAllItems(!showAllItems)}
                        >
                            {showAllItems ? 'Voir non-standards seulement' : 'Voir tous les items'}
                        </Button>
                    </Group>
                    {nonStandardItems.length > 0 && (
                        <Group>
                            <Button variant="subtle" size="xs" onClick={selectAll}>
                                Tout selectionner
                            </Button>
                            <Button variant="subtle" size="xs" onClick={deselectAll}>
                                Tout deselectionner
                            </Button>
                        </Group>
                    )}
                </Group>

                {/* Search */}
                <TextInput
                    leftSection={<IconSearch size={16} />}
                    placeholder="Rechercher un item..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.currentTarget.value)}
                />

                {/* Progress bar */}
                {normalizing && (
                    <Paper withBorder p="sm" radius="md">
                        <Text size="sm" mb="xs">{progressMessage}</Text>
                        <Progress value={progress} size="lg" animated />
                    </Paper>
                )}

                {/* Result */}
                {result && (
                    <Alert
                        color={result.errors > 0 ? 'orange' : 'green'}
                        title="Resultat"
                        icon={result.errors > 0 ? <IconAlertTriangle /> : <IconCheck />}
                    >
                        <Text size="sm">
                            {result.totalUpdated} documents mis a jour
                            ({result.contributionsUpdated} contributions, {result.purchasesUpdated} purchases)
                            {result.errors > 0 && ` - ${result.errors} erreurs`}
                        </Text>
                    </Alert>
                )}

                {/* Non-standard items table */}
                {!showAllItems && nonStandardItems.length > 0 && (
                    <>
                        <Divider label="Items a normaliser" labelPosition="center" />
                        <Paper withBorder radius="md" mah={400} style={{ overflow: 'auto' }}>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th w={40}></Table.Th>
                                        <Table.Th>Nom actuel</Table.Th>
                                        <Table.Th>Count</Table.Th>
                                        <Table.Th>Sources</Table.Th>
                                        <Table.Th>Normaliser vers</Table.Th>
                                        <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filteredNonStandard.map((item, index) => (
                                        <Table.Tr key={item.itemName}>
                                            <Table.Td>
                                                <Checkbox
                                                    checked={item.selected}
                                                    onChange={() => toggleItemSelection(index)}
                                                    disabled={!item.suggestion && !item.customTarget}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm" fw={500}>{item.itemName}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge size="sm" variant="light">{item.count}</Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    {item.sources.contributions > 0 && (
                                                        <Badge size="xs" color="blue" variant="light">
                                                            C: {item.sources.contributions}
                                                        </Badge>
                                                    )}
                                                    {item.sources.purchases > 0 && (
                                                        <Badge size="xs" color="green" variant="light">
                                                            P: {item.sources.purchases}
                                                        </Badge>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    size="xs"
                                                    placeholder="Choisir..."
                                                    data={STANDARD_ITEM_NAMES.map(name => ({ value: name, label: name }))}
                                                    value={item.customTarget || item.suggestion || null}
                                                    onChange={(value) => setItemTarget(index, value || '')}
                                                    clearable
                                                    searchable
                                                    maw={200}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    <Tooltip label="Simuler">
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="blue"
                                                            onClick={() => handleNormalizeItem(item, true)}
                                                            disabled={normalizing || (!item.suggestion && !item.customTarget)}
                                                        >
                                                            <IconSearch size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    <Tooltip label="Appliquer">
                                                        <ActionIcon
                                                            variant="subtle"
                                                            color="green"
                                                            onClick={() => handleNormalizeItem(item, false)}
                                                            disabled={normalizing || (!item.suggestion && !item.customTarget)}
                                                        >
                                                            <IconCheck size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Paper>

                        {/* Bulk actions */}
                        {selectedCount > 0 && (
                            <Group justify="center">
                                <Button
                                    leftSection={<IconSearch size={16} />}
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleAutoNormalizeAll(true)}
                                    loading={normalizing}
                                >
                                    Simuler ({selectedCount} items)
                                </Button>
                                <Button
                                    leftSection={<IconWand size={16} />}
                                    color="green"
                                    onClick={() => handleAutoNormalizeAll(false)}
                                    loading={normalizing}
                                >
                                    Normaliser ({selectedCount} items)
                                </Button>
                            </Group>
                        )}
                    </>
                )}

                {/* All items table */}
                {showAllItems && (
                    <>
                        <Divider label="Tous les items" labelPosition="center" />
                        <Paper withBorder radius="md" mah={400} style={{ overflow: 'auto' }}>
                            <Table striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Nom</Table.Th>
                                        <Table.Th>Count</Table.Th>
                                        <Table.Th>Montant total</Table.Th>
                                        <Table.Th>Sources</Table.Th>
                                        <Table.Th>Statut</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {filteredAllItems.map((item) => {
                                        const isStandard = STANDARD_ITEM_NAMES.includes(item.itemName as any) ||
                                            item.itemName.toLowerCase().includes('don');
                                        return (
                                            <Table.Tr key={item.itemName}>
                                                <Table.Td>
                                                    <Text size="sm" fw={500}>{item.itemName}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge size="sm" variant="light">{item.count}</Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm">{item.totalAmount.toFixed(2)} €</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap={4}>
                                                        {item.sources.contributions > 0 && (
                                                            <Badge size="xs" color="blue" variant="light">
                                                                Contrib: {item.sources.contributions}
                                                            </Badge>
                                                        )}
                                                        {item.sources.purchases > 0 && (
                                                            <Badge size="xs" color="green" variant="light">
                                                                Purch: {item.sources.purchases}
                                                            </Badge>
                                                        )}
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        size="sm"
                                                        color={isStandard ? 'green' : 'orange'}
                                                        variant="light"
                                                    >
                                                        {isStandard ? 'Standard' : 'A normaliser'}
                                                    </Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </Paper>
                    </>
                )}

                {/* No issues */}
                {!showAllItems && nonStandardItems.length === 0 && !scanning && (
                    <Alert color="green" title="Tout est en ordre" icon={<IconCheck />}>
                        Tous les noms d'items sont standards. Aucune normalisation necessaire.
                    </Alert>
                )}

                {/* Close button */}
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={onClose}>
                        Fermer
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
