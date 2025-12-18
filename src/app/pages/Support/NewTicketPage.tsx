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
  FileInput,
  Alert,
  Loader,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconSend,
  IconUpload,
  IconAlertCircle,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { createTicket } from '../../../shared/services/ticketService';
import type { TicketType, TicketPriority, CreateTicketData } from '../../../shared/types/ticket';
import {
  TICKET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
  TicketType as TicketTypeEnum,
  TicketPriority as TicketPriorityEnum,
} from '../../../shared/types/ticket';

export function NewTicketPage() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [type, setType] = useState<TicketType>(TicketTypeEnum.OTHER);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>(TicketPriorityEnum.MEDIUM);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const handleSubmit = async () => {
    if (!currentUser || !userProfile) return;

    // Validation
    if (!subject.trim()) {
      setError('Le sujet est requis');
      return;
    }
    if (!description.trim()) {
      setError('La description est requise');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ticketData: CreateTicketData = {
        type,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        attachments: files,
      };

      const userName = `${userProfile.firstName} ${userProfile.lastName}`;
      const ticket = await createTicket(
        ticketData,
        currentUser.uid,
        userProfile.email,
        userName
      );

      // Envoyer les notifications email
      try {
        // Notification à l'admin
        await fetch('/api/tickets/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_ticket',
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            ticketSubject: ticket.subject,
            ticketType: ticket.type,
            ticketPriority: ticket.priority,
            userName,
            userEmail: userProfile.email,
          }),
        });

        // Confirmation à l'utilisateur
        await fetch('/api/tickets/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ticket_created_confirmation',
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            ticketSubject: ticket.subject,
            ticketType: ticket.type,
            ticketPriority: ticket.priority,
            userName,
            userEmail: userProfile.email,
          }),
        });
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError);
        // On continue même si l'email échoue
      }

      notifications.show({
        title: 'Ticket créé',
        message: `Votre demande ${ticket.ticketNumber} a bien été enregistrée`,
        color: 'green',
        icon: <IconCircleCheck size={16} />,
      });

      navigate(`/dashboard/support/${ticket.id}`);
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.message || 'Erreur lors de la création du ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="md" py={40}>
      <Stack gap="xl">
        {/* Breadcrumbs */}
        <Breadcrumbs>
          <Anchor onClick={() => navigate('/dashboard')} c="dimmed">
            Dashboard
          </Anchor>
          <Anchor onClick={() => navigate('/dashboard/support')} c="dimmed">
            Support
          </Anchor>
          <Text>Nouvelle demande</Text>
        </Breadcrumbs>

        {/* Header */}
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

        <div>
          <Title order={1} size={28} fw={900}>
            Nouvelle demande de support
          </Title>
          <Text c="dimmed" size="md" mt={4}>
            Décrivez votre demande en détail pour nous permettre de vous aider au mieux
          </Text>
        </div>

        {/* Formulaire */}
        <Paper p="xl" withBorder style={{ borderRadius: '16px' }}>
          <Stack gap="lg">
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Erreur"
                color="red"
                onClose={() => setError(null)}
                withCloseButton
              >
                {error}
              </Alert>
            )}

            <Group grow align="flex-start">
              <Select
                label="Type de demande"
                placeholder="Sélectionnez le type"
                data={typeOptions}
                value={type}
                onChange={(value) => setType(value as TicketType)}
                required
              />
              <Select
                label="Priorité"
                placeholder="Sélectionnez la priorité"
                data={priorityOptions}
                value={priority}
                onChange={(value) => setPriority(value as TicketPriority)}
                required
                description="Urgent uniquement pour les problèmes bloquants"
              />
            </Group>

            <TextInput
              label="Sujet"
              placeholder="Résumez votre demande en une phrase"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
            />

            <Textarea
              label="Description"
              placeholder="Décrivez votre demande en détail. Plus vous fournissez d'informations, plus nous pourrons vous aider rapidement."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minRows={6}
              maxRows={12}
              autosize
            />

            <FileInput
              label="Pièces jointes (optionnel)"
              placeholder="Cliquez pour ajouter des fichiers"
              leftSection={<IconUpload size={16} />}
              multiple
              accept="image/*,.pdf,.doc,.docx"
              value={files}
              onChange={setFiles}
              description="Images, PDF ou documents Word (max 5 fichiers, 10MB chacun)"
              clearable
            />

            <Alert
              icon={<IconAlertCircle size={16} />}
              color="blue"
              variant="light"
            >
              <Text size="sm">
                Notre équipe s'engage à répondre à votre demande dans les plus brefs délais.
                Vous recevrez une notification par email dès qu'une réponse sera disponible.
              </Text>
            </Alert>

            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                color="gray"
                onClick={() => navigate('/dashboard/support')}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                leftSection={loading ? <Loader size={16} color="white" /> : <IconSend size={16} />}
                color="dark"
                onClick={handleSubmit}
                disabled={loading || !subject.trim() || !description.trim()}
              >
                {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
