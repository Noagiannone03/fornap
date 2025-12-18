import { useState, useEffect, useRef } from 'react';
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
  FileInput,
  Alert,
  Loader,
  Center,
  Breadcrumbs,
  Anchor,
  Avatar,
  Box,
  Divider,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  Image,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSend,
  IconUpload,
  IconAlertCircle,
  IconClock,
  IconUser,
  IconShield,
  IconSettings,
  IconPaperclip,
  IconDownload,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../../shared/contexts/AuthContext';
import {
  getTicketById,
  getTicketMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToTicketMessages,
  reopenTicket,
} from '../../../shared/services/ticketService';
import type { Ticket, TicketMessage } from '../../../shared/types/ticket';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_COLORS,
  TICKET_TYPE_COLORS,
  TicketStatus,
  MessageSenderType,
  isTicketOpen,
  canReopenTicket,
} from '../../../shared/types/ticket';

export function TicketDetailPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { userProfile, currentUser } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Charger le ticket
  useEffect(() => {
    async function loadTicket() {
      if (!ticketId) return;
      try {
        const ticketData = await getTicketById(ticketId);
        if (ticketData) {
          setTicket(ticketData);
          // Marquer les messages comme lus
          await markMessagesAsRead(ticketId, false);
        }
      } catch (err) {
        console.error('Error loading ticket:', err);
        setError('Erreur lors du chargement du ticket');
      } finally {
        setLoading(false);
      }
    }
    loadTicket();
  }, [ticketId]);

  // Souscrire aux messages en temps réel
  useEffect(() => {
    if (!ticketId) return;

    const unsubscribe = subscribeToTicketMessages(ticketId, (newMessages) => {
      setMessages(newMessages);
      // Marquer comme lus
      markMessagesAsRead(ticketId, false);
    });

    return () => unsubscribe();
  }, [ticketId]);

  // Scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!ticketId || !currentUser || !userProfile || !newMessage.trim()) return;

    setSending(true);
    setError(null);

    try {
      const userName = `${userProfile.firstName} ${userProfile.lastName}`;
      const message = await sendMessage(
        ticketId,
        { content: newMessage.trim(), attachments: files },
        currentUser.uid,
        userName,
        userProfile.email,
        MessageSenderType.USER
      );

      setNewMessage('');
      setFiles([]);

      // Envoyer la notification email à l'admin
      try {
        await fetch('/api/tickets/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_message_to_admin',
            ticketId,
            ticketNumber: ticket?.ticketNumber,
            ticketSubject: ticket?.subject,
            ticketType: ticket?.type,
            ticketPriority: ticket?.priority,
            userName,
            userEmail: userProfile.email,
            messageContent: newMessage.trim(),
          }),
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      // Rafraîchir le ticket pour mettre à jour les compteurs
      const updatedTicket = await getTicketById(ticketId);
      if (updatedTicket) setTicket(updatedTicket);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!ticketId || !currentUser || !userProfile) return;

    try {
      const userName = `${userProfile.firstName} ${userProfile.lastName}`;
      await reopenTicket(ticketId, currentUser.uid, userName, false);

      notifications.show({
        title: 'Ticket réouvert',
        message: 'Vous pouvez à nouveau envoyer des messages',
        color: 'green',
      });

      // Rafraîchir le ticket
      const updatedTicket = await getTicketById(ticketId);
      if (updatedTicket) setTicket(updatedTicket);
    } catch (err: any) {
      console.error('Error reopening ticket:', err);
      notifications.show({
        title: 'Erreur',
        message: err.message || 'Erreur lors de la réouverture du ticket',
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

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
      <Container size="md" py={40}>
        <Alert icon={<IconAlertCircle size={16} />} title="Ticket non trouvé" color="red">
          Ce ticket n'existe pas ou vous n'y avez pas accès.
        </Alert>
        <Button mt="md" onClick={() => navigate('/dashboard/support')}>
          Retour à la liste
        </Button>
      </Container>
    );
  }

  const ticketIsOpen = isTicketOpen(ticket);
  const canReopen = canReopenTicket(ticket);

  return (
    <Container size="lg" py={40}>
      <Stack gap="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor onClick={() => navigate('/dashboard')} c="dimmed">
            Dashboard
          </Anchor>
          <Anchor onClick={() => navigate('/dashboard/support')} c="dimmed">
            Support
          </Anchor>
          <Text>{ticket.ticketNumber}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/dashboard/support')}
            >
              Retour
            </Button>
          </Group>
          {canReopen && (
            <Button
              variant="outline"
              color="blue"
              leftSection={<IconRefresh size={16} />}
              onClick={handleReopenTicket}
            >
              Réouvrir le ticket
            </Button>
          )}
        </Group>

        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Group gap="sm" mb="xs">
              <Badge color="dark" size="lg" variant="filled">
                {ticket.ticketNumber}
              </Badge>
              <Badge color={TICKET_STATUS_COLORS[ticket.status]} size="lg" variant="light">
                {TICKET_STATUS_LABELS[ticket.status]}
              </Badge>
            </Group>
            <Title order={2} size={24} fw={700}>
              {ticket.subject}
            </Title>
          </div>
          <Group gap="xs">
            <Badge color={TICKET_TYPE_COLORS[ticket.type]} variant="light">
              {TICKET_TYPE_LABELS[ticket.type]}
            </Badge>
            <Badge color={TICKET_PRIORITY_COLORS[ticket.priority]} variant="light">
              {TICKET_PRIORITY_LABELS[ticket.priority]}
            </Badge>
          </Group>
        </Group>

        {/* Infos du ticket */}
        <Paper p="md" withBorder style={{ borderRadius: '12px' }}>
          <Group gap="xl">
            <Group gap="xs">
              <IconClock size={16} color="gray" />
              <Text size="sm" c="dimmed">
                Créé le {formatDate(ticket.createdAt)}
              </Text>
            </Group>
            {ticket.resolvedAt && (
              <Group gap="xs">
                <IconClock size={16} color="green" />
                <Text size="sm" c="green">
                  Résolu le {formatDate(ticket.resolvedAt)}
                </Text>
              </Group>
            )}
            <Group gap="xs">
              <IconUser size={16} color="gray" />
              <Text size="sm" c="dimmed">
                {ticket.messageCount} message{ticket.messageCount > 1 ? 's' : ''}
              </Text>
            </Group>
          </Group>
        </Paper>

        {/* Description originale */}
        <Paper p="lg" withBorder style={{ borderRadius: '12px', backgroundColor: '#fafafa' }}>
          <Text size="sm" c="dimmed" mb="xs" fw={600}>
            Description originale
          </Text>
          <Text style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</Text>
          {ticket.attachments && ticket.attachments.length > 0 && (
            <>
              <Divider my="md" />
              <Text size="sm" c="dimmed" mb="xs" fw={600}>
                Pièces jointes
              </Text>
              <Group gap="xs">
                {ticket.attachments.map((attachment) => (
                  <Button
                    key={attachment.id}
                    variant="light"
                    size="xs"
                    leftSection={<IconPaperclip size={14} />}
                    rightSection={<IconDownload size={14} />}
                    component="a"
                    href={attachment.url}
                    target="_blank"
                  >
                    {attachment.fileName}
                  </Button>
                ))}
              </Group>
            </>
          )}
        </Paper>

        {/* Conversation */}
        <Paper
          p="lg"
          withBorder
          style={{ borderRadius: '16px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}
        >
          <Text size="lg" fw={700} mb="md">
            Conversation
          </Text>

          {/* Messages */}
          <Box
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '500px',
              paddingRight: '8px',
            }}
          >
            <Stack gap="md">
              {messages.filter(m => !m.isSystemMessage).length === 0 ? (
                <Center py="xl">
                  <Text c="dimmed">Aucun message pour le moment</Text>
                </Center>
              ) : (
                messages.map((message) => {
                  if (message.isSystemMessage) {
                    return (
                      <Center key={message.id}>
                        <Badge color="gray" variant="light" size="sm">
                          <Group gap={4}>
                            <IconSettings size={12} />
                            {message.content}
                          </Group>
                        </Badge>
                      </Center>
                    );
                  }

                  const isUser = message.senderType === MessageSenderType.USER;
                  const isAdmin = message.senderType === MessageSenderType.ADMIN;

                  return (
                    <Group
                      key={message.id}
                      align="flex-start"
                      justify={isUser ? 'flex-end' : 'flex-start'}
                      gap="sm"
                    >
                      {!isUser && (
                        <Avatar
                          size="md"
                          radius="xl"
                          color={isAdmin ? 'red' : 'blue'}
                        >
                          {isAdmin ? <IconShield size={20} /> : <IconUser size={20} />}
                        </Avatar>
                      )}
                      <Box
                        maw="70%"
                        style={{
                          backgroundColor: isUser ? '#1a1a1a' : '#f0f0f0',
                          color: isUser ? '#fff' : '#1a1a1a',
                          padding: '12px 16px',
                          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        }}
                      >
                        <Group justify="space-between" mb={4}>
                          <Text size="xs" fw={600} opacity={0.8}>
                            {message.senderName}
                            {isAdmin && ' (Support)'}
                          </Text>
                          <Text size="xs" opacity={0.6}>
                            {formatMessageDate(message.createdAt)}
                          </Text>
                        </Group>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                          {message.content}
                        </Text>
                        {message.attachments && message.attachments.length > 0 && (
                          <Stack gap="xs" mt="sm">
                            {message.attachments.map((attachment) => (
                              <Group key={attachment.id} gap="xs">
                                {attachment.mimeType.startsWith('image/') ? (
                                  <Image
                                    src={attachment.url}
                                    alt={attachment.fileName}
                                    maw={200}
                                    radius="md"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => window.open(attachment.url, '_blank')}
                                  />
                                ) : (
                                  <Button
                                    variant="light"
                                    size="xs"
                                    color={isUser ? 'gray' : 'dark'}
                                    leftSection={<IconPaperclip size={14} />}
                                    component="a"
                                    href={attachment.url}
                                    target="_blank"
                                  >
                                    {attachment.fileName}
                                  </Button>
                                )}
                              </Group>
                            ))}
                          </Stack>
                        )}
                      </Box>
                      {isUser && (
                        <Avatar size="md" radius="xl" color="dark">
                          <IconUser size={20} />
                        </Avatar>
                      )}
                    </Group>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          <Divider my="md" />

          {/* Zone de saisie */}
          {ticketIsOpen ? (
            <Stack gap="sm">
              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  onClose={() => setError(null)}
                  withCloseButton
                >
                  {error}
                </Alert>
              )}
              <Textarea
                placeholder="Écrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                minRows={2}
                maxRows={6}
                autosize
                disabled={sending}
              />
              <Group justify="space-between">
                <FileInput
                  placeholder="Ajouter des fichiers"
                  leftSection={<IconUpload size={16} />}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  value={files}
                  onChange={setFiles}
                  clearable
                  size="sm"
                  style={{ maxWidth: '300px' }}
                  disabled={sending}
                />
                <Button
                  leftSection={sending ? <Loader size={16} color="white" /> : <IconSend size={16} />}
                  color="dark"
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  {sending ? 'Envoi...' : 'Envoyer'}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light">
              Ce ticket est {TICKET_STATUS_LABELS[ticket.status].toLowerCase()}.
              {canReopen && " Vous pouvez le réouvrir si vous avez des questions supplémentaires."}
            </Alert>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
