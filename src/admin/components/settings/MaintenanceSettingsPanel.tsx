import { useState, useEffect } from 'react';
import {
    Paper,
    Title,
    Text,
    Stack,
    Group,
    Switch,
    Textarea,
    Select,
    Button,
    Alert,
    Badge,
    Divider,
} from '@mantine/core';
import { IconTool, IconAlertCircle, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { AdminRole } from '../../../shared/types/admin';
import {
    MaintenanceConfig,
    getMaintenanceStatus,
    enableMaintenance,
    disableMaintenance,
    formatRemainingTime,
    DURATION_OPTIONS,
} from '../../../shared/services/maintenanceService';

/**
 * Panel de configuration du mode maintenance
 * Visible uniquement pour le rôle DEVELOPPEUR
 */
export function MaintenanceSettingsPanel() {
    const { adminProfile } = useAdminAuth();
    const [config, setConfig] = useState<MaintenanceConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [message, setMessage] = useState('');
    const [duration, setDuration] = useState('60');

    // Check if user is DEVELOPPEUR
    const isDeveloppeur = adminProfile?.role === AdminRole.DEVELOPPEUR;

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const status = await getMaintenanceStatus();
            setConfig(status);
            if (status.message) {
                setMessage(status.message);
            }
        } catch (error) {
            console.error('Error loading maintenance config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnableMaintenance = async () => {
        if (!adminProfile) return;

        setSaving(true);
        try {
            const durationMinutes = duration === '0' ? null : parseInt(duration);
            await enableMaintenance(
                message || 'Une maintenance est en cours sur le panel administrateur.',
                durationMinutes,
                adminProfile.uid,
                `${adminProfile.firstName} ${adminProfile.lastName}`
            );

            notifications.show({
                title: 'Mode maintenance activé',
                message: 'Les autres administrateurs ne peuvent plus accéder au panel.',
                color: 'orange',
                icon: <IconTool size={16} />,
            });

            await loadConfig();
        } catch (error: any) {
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Impossible d\'activer le mode maintenance',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDisableMaintenance = async () => {
        setSaving(true);
        try {
            await disableMaintenance();

            notifications.show({
                title: 'Mode maintenance désactivé',
                message: 'Tous les administrateurs peuvent à nouveau accéder au panel.',
                color: 'green',
            });

            setMessage('');
            await loadConfig();
        } catch (error: any) {
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Impossible de désactiver le mode maintenance',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    // Don't render for non-DEVELOPPEUR
    if (!isDeveloppeur) {
        return null;
    }

    if (loading) {
        return (
            <Paper withBorder radius="md" shadow="sm" p="xl">
                <Text c="dimmed">Chargement...</Text>
            </Paper>
        );
    }

    return (
        <Paper withBorder radius="md" shadow="sm" p="xl">
            <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                    <Group gap="sm">
                        <IconTool size={24} color="var(--mantine-color-orange-6)" />
                        <div>
                            <Title order={3}>Mode Maintenance</Title>
                            <Text size="sm" c="dimmed">
                                Bloquer l'accès au panel pour les autres administrateurs
                            </Text>
                        </div>
                    </Group>

                    {config?.enabled && (
                        <Badge color="orange" size="lg" variant="filled">
                            ACTIF
                        </Badge>
                    )}
                </Group>

                <Divider />

                {/* Current status */}
                {config?.enabled ? (
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        title="Mode maintenance activé"
                        color="orange"
                    >
                        <Stack gap="xs">
                            <Text size="sm">
                                <strong>Message affiché :</strong> {config.message}
                            </Text>
                            {config.estimatedEndTime && (
                                <Group gap="xs">
                                    <IconClock size={14} />
                                    <Text size="sm">
                                        Durée estimée : {formatRemainingTime(config.estimatedEndTime)}
                                    </Text>
                                </Group>
                            )}
                            {config.enabledByName && config.enabledAt && (
                                <Text size="xs" c="dimmed">
                                    Activé par {config.enabledByName} le{' '}
                                    {config.enabledAt.toDate().toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            )}
                        </Stack>
                    </Alert>
                ) : (
                    <Alert title="Mode maintenance désactivé" color="gray">
                        <Text size="sm">
                            Tous les administrateurs ont accès au panel.
                        </Text>
                    </Alert>
                )}

                {/* Configuration form */}
                {!config?.enabled && (
                    <>
                        <Textarea
                            label="Message de maintenance"
                            description="Ce message sera affiché aux administrateurs bloqués"
                            placeholder="Une maintenance est en cours sur le panel administrateur. Veuillez réessayer plus tard."
                            value={message}
                            onChange={(e) => setMessage(e.currentTarget.value)}
                            rows={3}
                        />

                        <Select
                            label="Durée estimée"
                            description="Durée approximative de la maintenance"
                            data={DURATION_OPTIONS}
                            value={duration}
                            onChange={(value) => setDuration(value || '60')}
                        />
                    </>
                )}

                {/* Action buttons */}
                <Group justify="flex-end">
                    {config?.enabled ? (
                        <Button
                            color="green"
                            onClick={handleDisableMaintenance}
                            loading={saving}
                            leftSection={<IconTool size={16} />}
                        >
                            Désactiver le mode maintenance
                        </Button>
                    ) : (
                        <Button
                            color="orange"
                            onClick={handleEnableMaintenance}
                            loading={saving}
                            leftSection={<IconTool size={16} />}
                        >
                            Activer le mode maintenance
                        </Button>
                    )}
                </Group>

                {/* Warning */}
                <Text size="xs" c="dimmed" ta="center">
                    ⚠️ Le mode maintenance bloque l'accès à tous les administrateurs sauf les Développeurs.
                </Text>
            </Stack>
        </Paper>
    );
}
