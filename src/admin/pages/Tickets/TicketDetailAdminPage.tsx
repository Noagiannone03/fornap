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
  Select,
  FileInput,
  Alert,
  Loader,
  Center,
  Avatar,
  Box,
  Divider,
  Grid,
  Card,
  ActionIcon,
  Tooltip,
  Menu,
  Image,
  Breadcrumbs,
  Anchor,
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
  IconChevronDown,
  IconCircleCheck,
  IconHistory,
  IconMail,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import {
  getTicketById,
  sendMessage,
  markMessagesAsRead,
  subscribeToTicketMessages,
  updateTicket,
  getTicketHistory,
  deleteTicket,
} from '../../../shared/services/ticketService';
import type { Ticket, TicketMessage, TicketHistoryEntry, UpdateTicketData } from '../../../shared/types/ticket';
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_COLORS,
  TICKET_TYPE_COLORS,
  TicketStatus,
  TicketPriority,
  MessageSenderType,
  isTicketOpen,
} from '../../../shared/types/ticket';
import { AdminPermission } from '../../../shared/types/admin';

export function TicketDetailAdminPage() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { adminUser, checkPermission } = useAdminAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [history, setHistory] = useState<TicketHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const canChangeStatus = checkPermission(AdminPermission.TICKETS_CHANGE_STATUS);
  const canRespond = checkPermission(AdminPermission.TICKETS_RESPOND);
  const canDelete = checkPermission(AdminPermission.TICKETS_DELETE);
  const canAssign = checkPermission(AdminPermission.TICKETS_ASSIGN);

  // Charger le ticket
  useEffect(() => {
    async function loadTicket() {
      if (!ticketId) return;
      try {
        const [ticketData, historyData] = await Promise.all([
          getTicketById(ticketId),
          getTicketHistory(ticketId),
        ]);
        if (ticketData) {
          setTicket(ticketData);
          setHistory(historyData);
          // Marquer les messages comme lus par l'admin
          await markMessagesAsRead(ticketId, true);
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
      // Marquer comme lus par l'admin
      markMessagesAsRead(ticketId, true);
    });

    return () => unsubscribe();
  }, [ticketId]);

  // Scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!ticketId || !adminUser || !newMessage.trim() || !canRespond) return;

    setSending(true);
    setError(null);

    try {
      const adminName = `${adminUser.firstName} ${adminUser.lastName}`;
      await sendMessage(
        ticketId,
        { content: newMessage.trim(), attachments: files },
        adminUser.uid,
        adminName,
        adminUser.email,
        MessageSenderType.ADMIN
      );

      setNewMessage('');
      setFiles([]);

      // Envoyer la notification email à l'utilisateur
      try {
        await fetch('/api/tickets/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_message_to_user',
            ticketId,
            ticketNumber: ticket?.ticketNumber,
            ticketSubject: ticket?.subject,
            ticketType: ticket?.type,
            ticketPriority: ticket?.priority,
            userName: ticket?.userName,
            userEmail: ticket?.userEmail,
            messageContent: newMessage.trim(),
            senderName: adminName,
          }),
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      // Rafraîchir le ticket
      const updatedTicket = await getTicketById(ticketId);
      if (updatedTicket) setTicket(updatedTicket);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || "Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!ticketId || !adminUser || !canChangeStatus) return;

    setUpdating(true);
    try {
      const adminName = `${adminUser.firstName} ${adminUser.lastName}`;
      const previousStatus = ticket?.status;

      await updateTicket(
        ticketId,
        { status: newStatus },
        adminUser.uid,
        adminName,
        true
      );

      // Envoyer la notification email à l'utilisateur
      try {
        await fetch('/api/tickets/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'status_change',
            ticketId,
            ticketNumber: ticket?.ticketNumber,
            ticketSubject: ticket?.subject,
            ticketType: ticket?.type,
            ticketPriority: ticket?.priority,
            ticketStatus: newStatus,
            previousStatus,
            userName: ticket?.userName,
            userEmail: ticket?.userEmail,
          }),
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      notifications.show({
        title: 'Statut mis à jour',
        message: `Le ticket est maintenant "${TICKET_STATUS_LABELS[newStatus]}"`,
        color: 'green',
      });

      // Rafraîchir
      const [updatedTicket, updatedHistory] = await Promise.all([
        getTicketById(ticketId),
        getTicketHistory(ticketId),
      ]);
      if (updatedTicket) setTicket(updatedTicket);
      setHistory(updatedHistory);
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.message || 'Erreur lors de la mise à jour',
        color: 'red',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePriority = async (newPriority: TicketPriority) => {
    if (!ticketId || !adminUser || !canChangeStatus) return;

    setUpdating(true);
    try {
      const adminName = `${adminUser.firstName} ${adminUser.lastName}`;

      await updateTicket(
        ticketId,
        { priority: newPriority },
        adminUser.uid,
        adminName,
        true
      );

      notifications.show({
        title: 'Priorité mise à jour',
        message: `La priorité est maintenant "${TICKET_PRIORITY_LABELS[newPriority]}"`,
        color: 'green',
      });

      // Rafraîchir
      const [updatedTicket, updatedHistory] = await Promise.all([
        getTicketById(ticketId),
        getTicketHistory(ticketId),
      ]);
      if (updatedTicket) setTicket(updatedTicket);
      setHistory(updatedHistory);
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.message || 'Erreur lors de la mise à jour',
        color: 'red',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!ticketId || !canDelete) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.')) return;

    try {
      await deleteTicket(ticketId);
      notifications.show({
        title: 'Ticket supprimé',
        message: 'Le ticket a été supprimé avec succès',
        color: 'green',
      });
      navigate('/admin/tickets');
    } catch (err: any) {
      notifications.show({
        title: 'Erreur',
        message: err.message || 'Erreur lors de la suppression',
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
          Ce ticket n'existe pas.
        </Alert>
        <Button mt="md" onClick={() => navigate('/admin/tickets')}>
          Retour à la liste
        </Button>
      </Container>
    );
  }

  const ticketIsOpen = isTicketOpen(ticket);

  const statusOptions = Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor onClick={() => navigate('/admin/dashboard')} c="dimmed">
            Dashboard
          </Anchor>
          <Anchor onClick={() => navigate('/admin/tickets')} c="dimmed">
            Tickets
          </Anchor>
          <Text>{ticket.ticketNumber}</Text>
        </Breadcrumbs>

        {/* Header */}
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/admin/tickets')}
            >
              Retour
            </Button>
          </Group>
          <Group>
            <Button
              variant="outline"
              leftSection={<IconHistory size={16} />}
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Masquer' : 'Historique'}
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            )}
          </Group>
        </Group>

        <Grid>
          {/* Colonne principale */}
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="lg">
              {/* Info ticket */}
              <Paper p="lg" withBorder radius="md">
                <Group justify="space-between" align="flex-start" wrap="wrap" mb="md">
                  <div>
                    <Group gap="sm" mb="xs">
                      <Badge color="dark" size="lg" variant="filled">
                        {ticket.ticketNumber}
                      </Badge>
                      <Badge color={TICKET_TYPE_COLORS[ticket.type]} size="lg" variant="light">
                        {TICKET_TYPE_LABELS[ticket.type]}
                      </Badge>
                    </Group>
                    <Title order={2} size={22} fw={700}>
                      {ticket.subject}
                    </Title>
                  </div>
                </Group>

                <Divider my="md" />

                <Text size="sm" c="dimmed" mb="xs" fw={600}>
                  Description
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
                radius="md"
                style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}
              >
                <Text size="lg" fw={700} mb="md">
                  Conversation
                </Text>

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
                            justify={isAdmin ? 'flex-end' : 'flex-start'}
                            gap="sm"
                          >
                            {!isAdmin && (
                              <Avatar size="md" radius="xl" color="blue">
                                <IconUser size={20} />
                              </Avatar>
                            )}
                            <Box
                              maw="70%"
                              style={{
                                backgroundColor: isAdmin ? '#1a1a1a' : '#f0f0f0',
                                color: isAdmin ? '#fff' : '#1a1a1a',
                                padding: '12px 16px',
                                borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              }}
                            >
                              <Group justify="space-between" mb={4}>
                                <Text size="xs" fw={600} opacity={0.8}>
                                  {message.senderName}
                                  {isUser && ` (${message.senderEmail})`}
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
                                          color={isAdmin ? 'gray' : 'dark'}
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
                            {isAdmin && (
                              <Avatar size="md" radius="xl" color="red">
                                <IconShield size={20} />
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

                {/* Zone de réponse */}
                {canRespond ? (
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
                      placeholder="Écrivez votre réponse..."
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
                  <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
                    Vous n'avez pas la permission de répondre aux tickets.
                  </Alert>
                )}
              </Paper>
            </Stack>
          </Grid.Col>

          {/* Sidebar */}
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              {/* Infos utilisateur */}
              <Card padding="lg" radius="md" withBorder>
                <Text size="sm" fw={600} c="dimmed" mb="md">
                  UTILISATEUR
                </Text>
                <Group gap="sm" mb="md">
                  <Avatar size="lg" radius="xl" color="blue">
                    <IconUser size={24} />
                  </Avatar>
                  <div>
                    <Text fw={600}>{ticket.userName}</Text>
                    <Text size="sm" c="dimmed">{ticket.userEmail}</Text>
                  </div>
                </Group>
                <Button
                  variant="light"
                  fullWidth
                  leftSection={<IconMail size={16} />}
                  component="a"
                  href={`mailto:${ticket.userEmail}`}
                >
                  Envoyer un email
                </Button>
              </Card>

              {/* Actions */}
              <Card padding="lg" radius="md" withBorder>
                <Text size="sm" fw={600} c="dimmed" mb="md">
                  ACTIONS
                </Text>
                <Stack gap="sm">
                  <div>
                    <Text size="sm" mb={4}>Statut</Text>
                    <Select
                      value={ticket.status}
                      data={statusOptions}
                      onChange={(value) => value && handleUpdateStatus(value as TicketStatus)}
                      disabled={!canChangeStatus || updating}
                    />
                  </div>
                  <div>
                    <Text size="sm" mb={4}>Priorité</Text>
                    <Select
                      value={ticket.priority}
                      data={priorityOptions}
                      onChange={(value) => value && handleUpdatePriority(value as TicketPriority)}
                      disabled={!canChangeStatus || updating}
                    />
                  </div>
                </Stack>
              </Card>

              {/* Dates */}
              <Card padding="lg" radius="md" withBorder>
                <Text size="sm" fw={600} c="dimmed" mb="md">
                  INFORMATIONS
                </Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Créé le</Text>
                    <Text size="sm">{formatDate(ticket.createdAt)}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Mis à jour</Text>
                    <Text size="sm">{formatDate(ticket.updatedAt)}</Text>
                  </Group>
                  {ticket.resolvedAt && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Résolu le</Text>
                      <Text size="sm" c="green">{formatDate(ticket.resolvedAt)}</Text>
                    </Group>
                  )}
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Messages</Text>
                    <Text size="sm">{ticket.messageCount}</Text>
                  </Group>
                </Stack>
              </Card>

              {/* Historique */}
              {showHistory && (
                <Card padding="lg" radius="md" withBorder>
                  <Text size="sm" fw={600} c="dimmed" mb="md">
                    HISTORIQUE
                  </Text>
                  <Stack gap="sm">
                    {history.length === 0 ? (
                      <Text size="sm" c="dimmed" ta="center">Aucun historique</Text>
                    ) : (
                      history.slice(0, 10).map((entry) => (
                        <Box
                          key={entry.id}
                          p="xs"
                          style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}
                        >
                          <Text size="xs" c="dimmed">
                            {formatDate(entry.timestamp)}
                          </Text>
                          <Text size="sm">{entry.description}</Text>
                          <Text size="xs" c="dimmed">
                            par {entry.actorName}
                          </Text>
                        </Box>
                      ))
                    )}
                  </Stack>
                </Card>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
