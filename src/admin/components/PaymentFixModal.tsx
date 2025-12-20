/**
 * Modal pour corriger les statuts de paiement
 */

import { useState } from 'react';
import { Modal, Button, Text, Stack, Progress, ScrollArea, Paper, Group, Badge } from '@mantine/core';
import { IconCreditCard } from '@tabler/icons-react';
import { fixAllPaymentStatuses, type PaymentFixResult } from '../../shared/services/paymentFixService';

interface PaymentFixModalProps {
    opened: boolean;
    onClose: () => void;
}

export function PaymentFixModal({ opened, onClose }: PaymentFixModalProps) {
    const [running, setRunning] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [result, setResult] = useState<PaymentFixResult | null>(null);
    const [isDryRun, setIsDryRun] = useState(true);

    const handleFix = async (dryRun: boolean) => {
        setRunning(true);
        setIsDryRun(dryRun);
        setLogs([]);
        setResult(null);

        try {
            const fixResult = await fixAllPaymentStatuses(dryRun, (log) => {
                setLogs(prev => [...prev, log]);
            });

            setResult(fixResult);
        } catch (error) {
            setLogs(prev => [...prev, `❌ Erreur: ${error}`]);
        } finally {
            setRunning(false);
        }
    };

    const handleClose = () => {
        if (!running) {
            setResult(null);
            setLogs([]);
            onClose();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Corriger les Statuts de Paiement"
            size="lg"
            closeOnClickOutside={!running}
            closeOnEscape={!running}
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Cette action met tous les paiements en statut <code>paid</code>/<code>completed</code>:
                </Text>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#666' }}>
                    <li>Contributions: <code>paymentStatus</code> → <code>paid</code></li>
                    <li>Purchases (users): <code>paymentStatus</code> → <code>completed</code></li>
                    <li>Users: <code>currentMembership.status</code> → <code>active</code></li>
                </ul>

                {!result && !running && (
                    <Group>
                        <Button
                            leftSection={<IconCreditCard size={16} />}
                            variant="light"
                            color="blue"
                            onClick={() => handleFix(true)}
                            loading={running}
                        >
                            Preview (Dry Run)
                        </Button>
                        <Button
                            leftSection={<IconCreditCard size={16} />}
                            color="green"
                            onClick={() => handleFix(false)}
                            loading={running}
                        >
                            Corriger les Paiements
                        </Button>
                    </Group>
                )}

                {running && (
                    <Stack gap="xs">
                        <Text size="sm">Correction en cours...</Text>
                        <Progress value={100} animated />
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
                                <Text size="xs" c="dimmed">Contributions</Text>
                                <Text fw={700} c="green">{result.contributionsFixed}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Purchases</Text>
                                <Text fw={700} c="green">{result.purchasesFixed}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Users</Text>
                                <Text fw={700}>{result.usersProcessed}</Text>
                            </Stack>
                            <Stack gap={2}>
                                <Text size="xs" c="dimmed">Erreurs</Text>
                                <Text fw={700} c="red">{result.errors}</Text>
                            </Stack>
                        </Group>
                    </Paper>
                )}

                {logs.length > 0 && (
                    <ScrollArea h={250} type="always">
                        <Paper withBorder p="sm" radius="sm" bg="gray.0">
                            <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                {logs.join('\n')}
                            </pre>
                        </Paper>
                    </ScrollArea>
                )}

                {result && !running && (
                    <Group justify="flex-end">
                        {isDryRun && (result.contributionsFixed > 0 || result.purchasesFixed > 0) && (
                            <Button
                                color="green"
                                onClick={() => handleFix(false)}
                            >
                                Appliquer les corrections
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
