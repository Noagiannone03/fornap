import {
    Container,
    Paper,
    Title,
    Text,
    Stack,
    Button,
    Group,
    ThemeIcon,
    Box,
} from '@mantine/core';
import { IconTool, IconClock, IconLogout } from '@tabler/icons-react';
import { useAdminAuth } from '../../shared/contexts/AdminAuthContext';
import type { MaintenanceConfig } from '../../shared/services/maintenanceService';
import { formatRemainingTime } from '../../shared/services/maintenanceService';

interface MaintenanceScreenProps {
    config: MaintenanceConfig;
}

/**
 * Écran affiché aux admins non-DEVELOPPEUR quand le mode maintenance est actif
 */
export function MaintenanceScreen({ config }: MaintenanceScreenProps) {
    const { logout } = useAdminAuth();

    const remainingTime = formatRemainingTime(config.estimatedEndTime);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <Container size="sm">
                <Paper
                    shadow="xl"
                    radius="lg"
                    p="xl"
                    style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <Stack align="center" gap="lg">
                        {/* Logo FOR+NAP */}
                        <img
                            src="/assets/logo-etendu-fornap.png"
                            alt="FOR+NAP"
                            style={{ height: 60, marginBottom: 8 }}
                        />

                        {/* Icon maintenance */}
                        <ThemeIcon
                            size={80}
                            radius="50%"
                            variant="light"
                            color="orange"
                            style={{
                                boxShadow: '0 4px 20px rgba(253, 126, 20, 0.3)',
                            }}
                        >
                            <IconTool size={40} stroke={1.5} />
                        </ThemeIcon>

                        {/* Titre */}
                        <Title order={2} ta="center" c="dark">
                            Maintenance en cours
                        </Title>

                        {/* Message */}
                        <Text size="lg" c="dimmed" ta="center" maw={400}>
                            {config.message || 'Une maintenance est en cours sur le panel administrateur.'}
                        </Text>

                        {/* Durée estimée */}
                        {remainingTime && (
                            <Paper
                                p="md"
                                radius="md"
                                style={{
                                    background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
                                    border: '1px solid #ffc107',
                                }}
                            >
                                <Group gap="xs">
                                    <IconClock size={20} color="#f57c00" />
                                    <Text size="sm" c="orange.8" fw={500}>
                                        Durée estimée : {remainingTime}
                                    </Text>
                                </Group>
                            </Paper>
                        )}

                        {/* Info activée par */}
                        {config.enabledByName && config.enabledAt && (
                            <Text size="xs" c="dimmed" ta="center">
                                Activée par {config.enabledByName} le{' '}
                                {config.enabledAt.toDate().toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        )}

                        {/* Message de patience */}
                        <Paper
                            p="md"
                            radius="md"
                            bg="gray.0"
                            style={{ borderLeft: '4px solid #228be6' }}
                        >
                            <Text size="sm" c="gray.7" ta="center">
                                Veuillez réessayer plus tard. Si le problème persiste, contactez le support technique.
                            </Text>
                        </Paper>

                        {/* Bouton déconnexion */}
                        <Button
                            variant="subtle"
                            color="gray"
                            size="lg"
                            leftSection={<IconLogout size={18} />}
                            onClick={handleLogout}
                            mt="md"
                        >
                            Se déconnecter
                        </Button>
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
