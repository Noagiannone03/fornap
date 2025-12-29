/**
 * ============================================
 * CHANGE PASSWORD PANEL
 * ============================================
 * Panel pour permettre aux admins de changer leur mot de passe
 */

import { useState } from 'react';
import {
    Paper,
    Title,
    Text,
    Stack,
    PasswordInput,
    Button,
    Group,
    Divider,
    Grid,
    Progress,
    List,
    ThemeIcon,
} from '@mantine/core';
import { IconKey, IconCheck, IconX, IconShieldCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';

// Validation des criteres du mot de passe
function getPasswordStrength(password: string) {
    const criteria = [
        { label: 'Au moins 6 caracteres', met: password.length >= 6 },
        { label: 'Au moins une majuscule', met: /[A-Z]/.test(password) },
        { label: 'Au moins une minuscule', met: /[a-z]/.test(password) },
        { label: 'Au moins un chiffre', met: /[0-9]/.test(password) },
    ];

    const metCount = criteria.filter(c => c.met).length;
    const strength = (metCount / criteria.length) * 100;

    return { criteria, strength, metCount };
}

function getStrengthColor(strength: number) {
    if (strength < 50) return 'red';
    if (strength < 75) return 'yellow';
    return 'green';
}

export function ChangePasswordPanel() {
    const { changePassword, adminProfile } = useAdminAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Validation
    const { criteria, strength } = getPasswordStrength(newPassword);
    const isNewPasswordValid = strength >= 50; // Au moins 50% des criteres (min 6 chars + 1 autre)
    const doPasswordsMatch = newPassword === confirmPassword && newPassword.length > 0;
    const isFormValid = currentPassword.length > 0 && isNewPasswordValid && doPasswordsMatch;

    const handleSubmit = async () => {
        if (!isFormValid) return;

        setLoading(true);
        try {
            await changePassword(currentPassword, newPassword);

            // Reset form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            notifications.show({
                title: 'Mot de passe modifie',
                message: 'Votre mot de passe a ete change avec succes',
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (error: any) {
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Impossible de changer le mot de passe',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper withBorder radius="md" p="xl" bg="gray.0">
            <Grid gutter="xl">
                {/* Colonne gauche - Info */}
                <Grid.Col span={{ base: 12, md: 4 }}>
                    <Stack gap="md">
                        <Group gap="sm">
                            <ThemeIcon size={48} radius="md" variant="light" color="indigo">
                                <IconShieldCheck size={28} />
                            </ThemeIcon>
                            <div>
                                <Title order={4}>Securite du compte</Title>
                                <Text size="sm" c="dimmed">
                                    {adminProfile?.email}
                                </Text>
                            </div>
                        </Group>

                        <Text size="sm" c="dimmed">
                            Pour votre securite, choisissez un mot de passe fort que vous n'utilisez pas ailleurs.
                        </Text>

                        {newPassword.length > 0 && (
                            <Paper withBorder p="md" radius="md">
                                <Text size="sm" fw={500} mb="xs">Force du mot de passe</Text>
                                <Progress
                                    value={strength}
                                    color={getStrengthColor(strength)}
                                    size="sm"
                                    mb="sm"
                                />
                                <List size="xs" spacing="xs">
                                    {criteria.map((c, i) => (
                                        <List.Item
                                            key={i}
                                            icon={
                                                <ThemeIcon
                                                    size={16}
                                                    radius="xl"
                                                    color={c.met ? 'green' : 'gray'}
                                                    variant={c.met ? 'filled' : 'light'}
                                                >
                                                    {c.met ? <IconCheck size={10} /> : <IconX size={10} />}
                                                </ThemeIcon>
                                            }
                                            c={c.met ? 'green' : 'dimmed'}
                                        >
                                            {c.label}
                                        </List.Item>
                                    ))}
                                </List>
                            </Paper>
                        )}
                    </Stack>
                </Grid.Col>

                {/* Colonne droite - Formulaire */}
                <Grid.Col span={{ base: 12, md: 8 }}>
                    <Paper withBorder p="xl" radius="md" shadow="xs">
                        <Title order={4} mb="xs">Changer le mot de passe</Title>
                        <Text size="sm" c="dimmed" mb="lg">
                            Entrez votre mot de passe actuel puis choisissez un nouveau mot de passe.
                        </Text>

                        <Divider mb="lg" />

                        <Stack gap="md">
                            <PasswordInput
                                label="Mot de passe actuel"
                                placeholder="Votre mot de passe actuel"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                size="md"
                            />

                            <PasswordInput
                                label="Nouveau mot de passe"
                                placeholder="Choisissez un mot de passe fort"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                size="md"
                                error={newPassword.length > 0 && !isNewPasswordValid ? 'Le mot de passe ne respecte pas les criteres minimum' : null}
                            />

                            <PasswordInput
                                label="Confirmer le nouveau mot de passe"
                                placeholder="Retapez le nouveau mot de passe"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                size="md"
                                error={confirmPassword.length > 0 && !doPasswordsMatch ? 'Les mots de passe ne correspondent pas' : null}
                            />

                            <Group justify="flex-end" mt="md">
                                <Button
                                    size="md"
                                    leftSection={<IconKey size={18} />}
                                    onClick={handleSubmit}
                                    loading={loading}
                                    disabled={!isFormValid}
                                >
                                    Mettre a jour le mot de passe
                                </Button>
                            </Group>
                        </Stack>
                    </Paper>
                </Grid.Col>
            </Grid>
        </Paper>
    );
}
