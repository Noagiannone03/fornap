/**
 * Modal de migration des achats
 * Permet de lier les contributions existantes aux utilisateurs
 */

import { useState } from 'react';
import { Modal, Button, Text, Stack, Progress, ScrollArea, Paper, Group, Badge } from '@mantine/core';
import { IconDatabaseImport } from '@tabler/icons-react';
import { migrateContributionsToPurchases, type MigrationResult } from '../../shared/services/purchaseMigrationService';

interface PurchaseMigrationModalProps {
    opened: boolean;
    onClose: () => void;
}

export function PurchaseMigrationModal({ opened, onClose }: PurchaseMigrationModalProps) {
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [result, setResult] = useState<MigrationResult | null>(null);
    const [isDryRun, setIsDryRun] = useState(true);

    const handleMigrate = async (dryRun: boolean) => {
        setRunning(true);
        setIsDryRun(dryRun);
        setLogs([]);
        setProgress(0);
        setProgressText('Demarrage...');
        setResult(null);

        try {
            const migrationResult = await migrateContributionsToPurchases(dryRun, (current, total, log) => {
                setProgress((current / total) * 100);
                setProgressText(log);
            });

            setResult(migrationResult);
            setLogs(migrationResult.logs);
        } catch (error) {
            setLogs(prev => [...prev, `❌ Erreur: ${error}`]);
        } finally {
            setRunning(false);
            setProgress(100);
            setProgressText('Termine!');
        }
    };

    const handleClose = () => {
        if (!running) {
            setResult(null);
            setLogs([]);
            setProgress(0);
            onClose();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Migration des Achats"
            size="lg"
            closeOnClickOutside={!running}
            closeOnEscape={!running}
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Cette migration lie les contributions existantes aux utilisateurs par email
                    et cree les entrees dans la sous-collection <code>purchases</code>.
                </Text>

                {!result && !running && (
                    <Group>
                        <Button
                            leftSection={<IconDatabaseImport size={16} />}
                            variant="light"
                            color="blue"
                            onClick={() => handleMigrate(true)}
                            loading={running}
                        >
                            Preview (Dry Run)
                        </Button>
                        <Button
                            leftSection={<IconDatabaseImport size={16} />}
                            color="green"
                            onClick={() => handleMigrate(false)}
                            loading={running}
                        >
                            Executer la Migration
                        </Button>
                    </Group>
                )}

                {running && (
                    <Stack gap="xs">
                        <Text size="sm">{progressText}</Text>
                        <Progress value={progress} animated />
                    </Stack>
                )}

                {result && (
                    <Paper withBorder p="md" radius="md">
                        <Group mb="md">
                            <Badge color={isDryRun ? 'blue' : 'green'} size="lg">
                                {isDryRun ? 'Preview' : 'Execute'}
                            </Badge>
                        </Group>
                        <Group gap="lg">
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Total</Text>
                                <Text fw={700}>{result.totalContributions}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Migres</Text>
                                <Text fw={700} c="green">{result.matched}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Deja faits</Text>
                                <Text fw={700} c="gray">{result.alreadyMigrated}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Non trouves</Text>
                                <Text fw={700} c="orange">{result.notFound}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Erreurs</Text>
                                <Text fw={700} c="red">{result.errors}</Text>
                            </Stack>
                        </Group>
                    </Paper>
                )}

                {logs.length > 0 && (
                    <ScrollArea h={300} type="always">
                        <Paper withBorder p="sm" radius="sm" bg="gray.0">
                            <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {logs.join('\n')}
                            </pre>
                        </Paper>
                    </ScrollArea>
                )}

                {result && !running && (
                    <Group justify="flex-end">
                        {isDryRun && result.matched > 0 && (
                            <Button
                                color="green"
                                onClick={() => handleMigrate(false)}
                            >
                                Executer pour de vrai
                            </Button>
                        )}
                        <Button variant="light" onClick={handleClose}>
                            Fermer
                        </Button>
                    </Group>
                )}
            </Stack>
        </Modal>
    );
}
