import { useState, useEffect } from 'react';
import {
    Container,
    Title,
    Text,
    Paper,
    Stack,
    Group,
    Badge,
    Button,
    Textarea,
    Loader,
    Center,
    ThemeIcon,
    Divider,
    Box,
    Avatar,
    ScrollArea,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconSend,
    IconTicket,
    IconAlertCircle,
    IconCircleCheck,
    IconClock,
    IconMessage,
    IconUser,
    IconHeadset,
    IconTrash,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import {
    getTicketById,
    getTicketMessages,
    addTicketMessage,
    markTicketAsReadForUser,
    deleteTicket,
} from '../../../shared/services/ticketService';
import type { Ticket, TicketMessage } from '../../../shared/types/ticket';
import {
    TICKET_TYPE_LABELS,
    TICKET_STATUS_LABELS,
    TICKET_PRIORITY_LABELS,
    TICKET_STATUS_COLORS,
    TICKET_PRIORITY_COLORS,
    TICKET_TYPE_COLORS,
    MessageSenderType,
} from '../../../shared/types/ticket';

/**
 * Page pour voir le détail d'un ticket créé par l'admin
 * Sans capacités de gestion (pas de changement de statut, etc.)
 */
export function AdminTicketDetailPage() {
    const navigate = useNavigate();
    const { ticketId } = useParams<{ ticketId: string }>();
    const { adminProfile } = useAdminAuth();

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadTicketData();
    }, [ticketId]);

    async function loadTicketData() {
        if (!ticketId) return;

        setLoading(true);
        try {
            const [ticketData, messagesData] = await Promise.all([
                getTicketById(ticketId),
                getTicketMessages(ticketId),
            ]);

            setTicket(ticketData);
            setMessages(messagesData);

            // Marquer comme lu pour l'utilisateur (admin qui a créé le ticket)
            if (ticketData?.hasUnreadForUser) {
                await markTicketAsReadForUser(ticketId);
            }
        } catch (error) {
            console.error('Error loading ticket:', error);
            notifications.show({
                title: 'Erreur',
                message: 'Impossible de charger le ticket',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !ticketId || !adminProfile) return;

        setSending(true);
        try {
            await addTicketMessage(ticketId, {
                content: newMessage.trim(),
                senderId: adminProfile.uid,
                senderName: `${adminProfile.firstName} ${adminProfile.lastName}`,
                senderEmail: adminProfile.email,
                senderType: MessageSenderType.USER, // L'admin qui a créé le ticket est "user" dans ce contexte
            });

            setNewMessage('');
            await loadTicketData();

            notifications.show({
                title: 'Message envoyé',
                message: 'Votre message a été ajouté au ticket',
                color: 'green',
            });
        } catch (error: any) {
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Erreur lors de l\'envoi du message',
                color: 'red',
            });
        } finally {
            setSending(false);
        }
    };

    const handleDeleteTicket = async () => {
        if (!ticketId || !adminProfile) return;

        const confirmed = window.confirm(
            'Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.'
        );
        if (!confirmed) return;

        try {
            // Les admins peuvent supprimer leurs propres tickets
            // Les développeurs peuvent supprimer tous les tickets
            const isDeveloper = adminProfile.role === 'developpeur';
            await deleteTicket(ticketId, adminProfile.uid, isDeveloper);

            notifications.show({
                title: 'Ticket supprimé',
                message: 'Le ticket a été supprimé avec succès',
                color: 'green',
            });

            navigate('/admin/support');
        } catch (error: any) {
            notifications.show({
                title: 'Erreur',
                message: error.message || 'Erreur lors de la suppression du ticket',
                color: 'red',
            });
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open':
                return <IconAlertCircle size={16} />;
            case 'in_progress':
                return <IconClock size={16} />;
            case 'waiting_for_user':
                return <IconMessage size={16} />;
            case 'resolved':
            case 'closed':
                return <IconCircleCheck size={16} />;
            default:
                return <IconTicket size={16} />;
        }
    };

    if (loading) {
        return (
            <Center h={400}>
                <Loader size="lg" />
            </Center>
        );
    }

    if (!ticket) {
        return (
            <Container size="md" py="xl">
                <Center py={60}>
                    <Stack align="center" gap="md">
                        <ThemeIcon size={60} radius="xl" color="red" variant="light">
                            <IconAlertCircle size={30} />
                        </ThemeIcon>
                        <Text size="lg" fw={500}>
                            Ticket non trouvé
                        </Text>
                        <Button onClick={() => navigate('/admin/support')}>
                            Retour à mes demandes
                        </Button>
                    </Stack>
                </Center>
            </Container>
        );
    }

    // Vérifier que c'est bien un ticket créé par cet admin
    if (ticket.createdBy !== adminProfile?.uid) {
        return (
            <Container size="md" py="xl">
                <Center py={60}>
                    <Stack align="center" gap="md">
                        <ThemeIcon size={60} radius="xl" color="red" variant="light">
                            <IconAlertCircle size={30} />
                        </ThemeIcon>
                        <Text size="lg" fw={500}>
                            Vous n'avez pas accès à ce ticket
                        </Text>
                        <Button onClick={() => navigate('/admin/support')}>
                            Retour à mes demandes
                        </Button>
                    </Stack>
                </Center>
            </Container>
        );
    }

    const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved';

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                {/* Header */}
                <Group justify="space-between">
                    <Button
                        variant="subtle"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => navigate('/admin/support')}
                        color="gray"
                    >
                        Retour
                    </Button>
                    <Button
                        variant="outline"
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={handleDeleteTicket}
                    >
                        Supprimer
                    </Button>
                </Group>

                <Group justify="space-between" align="flex-start">
                    <div>
                        <Group gap="md">
                            <Title order={1} size={24} fw={900}>
                                {ticket.ticketNumber}
                            </Title>
                            <Badge
                                color={TICKET_STATUS_COLORS[ticket.status]}
                                variant="light"
                                size="lg"
                                leftSection={getStatusIcon(ticket.status)}
                            >
                                {TICKET_STATUS_LABELS[ticket.status]}
                            </Badge>
                        </Group>
                        <Text size="lg" mt={8}>
                            {ticket.subject}
                        </Text>
                    </div>
                </Group>

                {/* Ticket info */}
                <Paper p="md" withBorder style={{ borderRadius: '12px' }}>
                    <Group gap="xl">
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                Type
                            </Text>
                            <Badge color={TICKET_TYPE_COLORS[ticket.type]} variant="light" mt={4}>
                                {TICKET_TYPE_LABELS[ticket.type]}
                            </Badge>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                Priorité
                            </Text>
                            <Badge color={TICKET_PRIORITY_COLORS[ticket.priority]} variant="light" mt={4}>
                                {TICKET_PRIORITY_LABELS[ticket.priority]}
                            </Badge>
                        </div>
                        <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                Créé le
                            </Text>
                            <Text size="sm" mt={4}>
                                {formatDate(ticket.createdAt)}
                            </Text>
                        </div>
                        {ticket.assignedToName && (
                            <div>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                                    Assigné à
                                </Text>
                                <Text size="sm" mt={4}>
                                    {ticket.assignedToName}
                                </Text>
                            </div>
                        )}
                    </Group>
                </Paper>

                {/* Description originale */}
                <Paper p="xl" withBorder style={{ borderRadius: '12px' }}>
                    <Text size="sm" c="dimmed" mb="xs">
                        Description originale
                    </Text>
                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                        {ticket.description}
                    </Text>
                </Paper>

                {/* Messages */}
                <Paper p="xl" withBorder style={{ borderRadius: '12px' }}>
                    <Title order={3} size={18} mb="lg">
                        Conversation
                    </Title>

                    {messages.length === 0 ? (
                        <Center py="xl">
                            <Stack align="center" gap="sm">
                                <ThemeIcon size={40} radius="xl" color="gray" variant="light">
                                    <IconMessage size={20} />
                                </ThemeIcon>
                                <Text c="dimmed" size="sm">
                                    Aucun message pour le moment
                                </Text>
                            </Stack>
                        </Center>
                    ) : (
                        <ScrollArea.Autosize mah={400} offsetScrollbars>
                            <Stack gap="md">
                                {messages.map((message) => {
                                    const isFromAdmin = message.senderType === MessageSenderType.ADMIN;

                                    return (
                                        <Box
                                            key={message.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: isFromAdmin ? 'flex-start' : 'flex-end',
                                            }}
                                        >
                                            <Paper
                                                p="md"
                                                withBorder
                                                style={{
                                                    borderRadius: '12px',
                                                    maxWidth: '80%',
                                                    backgroundColor: isFromAdmin
                                                        ? 'var(--mantine-color-indigo-light)'
                                                        : 'var(--mantine-color-gray-0)',
                                                }}
                                            >
                                                <Group gap="xs" mb="xs">
                                                    <Avatar size="sm" color={isFromAdmin ? 'indigo' : 'blue'}>
                                                        {isFromAdmin ? <IconHeadset size={14} /> : <IconUser size={14} />}
                                                    </Avatar>
                                                    <div>
                                                        <Text size="sm" fw={600}>
                                                            {message.senderName}
                                                            {isFromAdmin && (
                                                                <Badge size="xs" color="indigo" variant="light" ml="xs">
                                                                    Support
                                                                </Badge>
                                                            )}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {formatDate(message.createdAt)}
                                                        </Text>
                                                    </div>
                                                </Group>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {message.content}
                                                </Text>
                                            </Paper>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </ScrollArea.Autosize>
                    )}

                    <Divider my="lg" />

                    {/* Nouveau message */}
                    {!isTicketClosed ? (
                        <Stack gap="sm">
                            <Textarea
                                placeholder="Écrivez votre message..."
                                minRows={3}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <Group justify="flex-end">
                                <Button
                                    leftSection={<IconSend size={16} />}
                                    onClick={handleSendMessage}
                                    loading={sending}
                                    disabled={!newMessage.trim()}
                                    color="indigo"
                                >
                                    Envoyer
                                </Button>
                            </Group>
                        </Stack>
                    ) : (
                        <Center py="md">
                            <Text c="dimmed" size="sm">
                                Ce ticket est fermé. Vous ne pouvez plus envoyer de messages.
                            </Text>
                        </Center>
                    )}
                </Paper>
            </Stack>
        </Container>
    );
}
