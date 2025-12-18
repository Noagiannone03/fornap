import { useState } from 'react';
import {
    Container,
    Title,
    Text,
    Paper,
    Stack,
    Group,
    Button,
    TextInput,
    Textarea,
    Select,
    Loader,
    Center,
    Alert,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconSend,
    IconAlertCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { createAdminTicket } from '../../../shared/services/ticketService';
import {
    TicketType,
    TicketPriority,
    TICKET_TYPE_LABELS,
    TICKET_PRIORITY_LABELS,
} from '../../../shared/types/ticket';
import { ADMIN_ROLES_CONFIG } from '../../../shared/types/admin';

/**
 * Page pour créer un nouveau ticket de support depuis le panel admin
 */
export function AdminNewTicketPage() {
    const navigate = useNavigate();
    const { adminProfile } = useAdminAuth();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        subject: '',
        type: TicketType.BUG_REPORT as string,
        priority: TicketPriority.MEDIUM as string,
        description: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const typeOptions = Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const priorityOptions = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
        value,
        label,
    }));

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.subject.trim()) {
            newErrors.subject = 'Le sujet est requis';
        } else if (formData.subject.length < 5) {
            newErrors.subject = 'Le sujet doit contenir au moins 5 caractères';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'La description est requise';
        } else if (formData.description.length < 20) {
            newErrors.description = 'La description doit contenir au moins 20 caractères';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm() || !adminProfile) return;

        setLoading(true);
        try {
            const roleConfig = ADMIN_ROLES_CONFIG[adminProfile.role];

            await createAdminTicket({
                subject: formData.subject.trim(),
                type: formData.type as TicketType,
                priority: formData.priority as TicketPriority,
                description: formData.description.trim(),
                createdBy: adminProfile.uid,
                userEmail: adminProfile.email,
                userName: `${adminProfile.firstName} ${adminProfile.lastName}`,
                source: 'admin',
                adminRole: adminProfile.role,
                adminRoleLabel: roleConfig.label,
            });

            notifications.show({
                title: 'Demande créée',
                message: 'Votre demande de support a été envoyée avec succès',
                color: 'green',
            });

            navigate('/admin/support');
        } catch (error: any) {
            console.error('Error creating ticket:', error);
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Erreur lors de la création de la demande',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!adminProfile) {
        return (
            <Center h={400}>
                <Loader size="lg" />
            </Center>
        );
    }

    return (
        <Container size="md" py="xl">
            <Stack gap="xl">
                {/* Header */}
                <Group>
                    <Button
                        variant="subtle"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => navigate('/admin/support')}
                        color="gray"
                    >
                        Retour
                    </Button>
                </Group>

                <div>
                    <Title order={1} size={28} fw={900}>
                        Nouvelle demande de support
                    </Title>
                    <Text c="dimmed" size="md" mt={4}>
                        Décrivez le problème ou la demande que vous souhaitez soumettre
                    </Text>
                </div>

                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    Cette demande sera traitée par l'administrateur principal.
                    Vous recevrez une notification lorsqu'une réponse sera disponible.
                </Alert>

                <Paper p="xl" withBorder style={{ borderRadius: '16px' }}>
                    <Stack gap="lg">
                        <TextInput
                            label="Sujet"
                            placeholder="Résumez votre demande en quelques mots"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            error={errors.subject}
                        />

                        <Group grow>
                            <Select
                                label="Type de demande"
                                data={typeOptions}
                                value={formData.type}
                                onChange={(value) => setFormData({ ...formData, type: value || TicketType.BUG_REPORT })}
                                required
                            />
                            <Select
                                label="Priorité"
                                data={priorityOptions}
                                value={formData.priority}
                                onChange={(value) => setFormData({ ...formData, priority: value || TicketPriority.MEDIUM })}
                                required
                            />
                        </Group>

                        <Textarea
                            label="Description"
                            placeholder="Décrivez en détail votre demande ou le problème rencontré..."
                            required
                            minRows={6}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            error={errors.description}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/admin/support')}
                            >
                                Annuler
                            </Button>
                            <Button
                                leftSection={<IconSend size={16} />}
                                onClick={handleSubmit}
                                loading={loading}
                                color="indigo"
                            >
                                Envoyer la demande
                            </Button>
                        </Group>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
}
