import { useState, useRef, useEffect } from 'react';
import {
  Paper,
  Title,
  Group,
  Button,
  Text,
  TextInput,
  Textarea,
  Stack,
  Stepper,
  LoadingOverlay,
  Select,
  NumberInput,
  MultiSelect,
  Switch,
  Divider,
  Box,
  Badge,
  Table,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconMail,
  IconUsers,
  IconEdit,
  IconSend,
  IconClock,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { DateTimePicker } from '@mantine/dates';
import EmailEditor from 'react-email-editor';
import type { EditorRef } from 'react-email-editor';
import type { CreateCampaignData, TargetingMode, TargetingFilters } from '../../../shared/types/campaign';
import type { User, MembershipType, MembershipStatus } from '../../../shared/types/user';
import {
  createCampaign,
  estimateRecipients,
  getTargetedUsers,
  prepareCampaignForSending,
} from '../../../shared/services/campaignService';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { Timestamp } from 'firebase/firestore';

export function CampaignCreatePage() {
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  const emailEditorRef = useRef<EditorRef>(null);

  // State pour le stepper
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // State pour les informations de base
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [fromName, setFromName] = useState('FORNAP');
  const [fromEmail, setFromEmail] = useState('contact@fornap.fr');
  const [replyTo, setReplyTo] = useState('');

  // State pour le ciblage
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('all');
  const [filters, setFilters] = useState<TargetingFilters>({
    includeBlocked: false,
  });
  const [estimatedCount, setEstimatedCount] = useState(0);
  const [targetedUsers, setTargetedUsers] = useState<User[]>([]);

  // State pour la planification
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

  // State pour l'éditeur d'email
  const [emailDesign, setEmailDesign] = useState<any>(null);
  const [emailHtml, setEmailHtml] = useState('');

  useEffect(() => {
    updateEstimatedRecipients();
  }, [targetingMode, filters]);

  const updateEstimatedRecipients = async () => {
    try {
      const count = await estimateRecipients(
        targetingMode,
        undefined,
        targetingMode === 'filtered' ? filters : undefined
      );
      setEstimatedCount(count);

      // Charger les utilisateurs ciblés pour le preview
      if (targetingMode !== 'manual') {
        const users = await getTargetedUsers(
          targetingMode,
          undefined,
          targetingMode === 'filtered' ? filters : undefined
        );
        setTargetedUsers(users.slice(0, 10)); // Limiter à 10 pour le preview
      }
    } catch (error) {
      console.error('Error estimating recipients:', error);
    }
  };

  const onEmailEditorReady = () => {
    // L'éditeur est prêt
  };

  const exportEmailHtml = (): Promise<{ design: any; html: string }> => {
    return new Promise((resolve) => {
      const editor = emailEditorRef.current?.editor;
      if (!editor) {
        resolve({ design: null, html: '' });
        return;
      }

      editor.exportHtml((data) => {
        const { design, html } = data;
        resolve({ design, html });
      });
    });
  };

  const handleNext = async () => {
    // Validation selon l'étape
    if (active === 0) {
      if (!name.trim()) {
        notifications.show({
          title: 'Erreur',
          message: 'Le nom de la campagne est requis',
          color: 'red',
        });
        return;
      }
      if (!subject.trim()) {
        notifications.show({
          title: 'Erreur',
          message: 'Le sujet de l\'email est requis',
          color: 'red',
        });
        return;
      }
    } else if (active === 1) {
      if (estimatedCount === 0) {
        notifications.show({
          title: 'Erreur',
          message: 'Aucun destinataire ciblé',
          color: 'red',
        });
        return;
      }
    } else if (active === 2) {
      // Exporter le HTML de l'éditeur
      const { design, html } = await exportEmailHtml();
      if (!html || html.trim() === '') {
        notifications.show({
          title: 'Erreur',
          message: 'Le contenu de l\'email est requis',
          color: 'red',
        });
        return;
      }
      setEmailDesign(design);
      setEmailHtml(html);
    }

    setActive((current) => (current < 3 ? current + 1 : current));
  };

  const handlePrevious = () => {
    setActive((current) => (current > 0 ? current - 1 : current));
  };

  const handleSubmit = async () => {
    if (!adminProfile) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez être connecté',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      // Créer les données de la campagne
      const campaignData: CreateCampaignData = {
        name,
        description,
        content: {
          subject,
          preheader,
          design: emailDesign,
          html: emailHtml,
          fromName,
          fromEmail,
          replyTo: replyTo || undefined,
        },
        targeting: {
          mode: targetingMode,
          manualUserIds: undefined,
          filters: targetingMode === 'filtered' ? filters : undefined,
          estimatedRecipients: estimatedCount,
        },
        scheduledAt: scheduledDate ? Timestamp.fromDate(scheduledDate) : undefined,
        sendImmediately,
      };

      // Créer la campagne
      const campaign = await createCampaign(adminProfile.uid, campaignData);

      // Si envoi immédiat ou planifié, préparer l'envoi
      if (sendImmediately || scheduledDate) {
        await prepareCampaignForSending(campaign.id);
      }

      notifications.show({
        title: 'Succès',
        message: sendImmediately
          ? 'Campagne créée et en cours d\'envoi'
          : scheduledDate
          ? 'Campagne créée et planifiée'
          : 'Campagne créée en brouillon',
        color: 'green',
      });

      navigate('/admin/campaigns');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Impossible de créer la campagne',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfoStep = () => (
    <Stack gap="md">
      <TextInput
        label="Nom de la campagne"
        description="Un nom interne pour identifier votre campagne"
        placeholder="Ex: Newsletter Janvier 2024"
        required
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <Textarea
        label="Description"
        description="Description interne de la campagne (optionnel)"
        placeholder="Décrivez l'objectif de cette campagne..."
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        minRows={3}
      />

      <Divider label="Configuration de l'email" />

      <TextInput
        label="Sujet de l'email"
        description="Le sujet que verront les destinataires"
        placeholder="Ex: Découvrez notre programmation du mois !"
        required
        value={subject}
        onChange={(e) => setSubject(e.currentTarget.value)}
      />

      <TextInput
        label="Préheader"
        description="Texte de prévisualisation (affiché après le sujet dans la boîte de réception)"
        placeholder="Ex: Ne manquez pas nos événements exceptionnels..."
        value={preheader}
        onChange={(e) => setPreheader(e.currentTarget.value)}
      />

      <Group grow>
        <TextInput
          label="Nom de l'expéditeur"
          required
          value={fromName}
          onChange={(e) => setFromName(e.currentTarget.value)}
        />
        <TextInput
          label="Email de l'expéditeur"
          required
          type="email"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.currentTarget.value)}
        />
      </Group>

      <TextInput
        label="Email de réponse (optionnel)"
        description="Si différent de l'email de l'expéditeur"
        type="email"
        value={replyTo}
        onChange={(e) => setReplyTo(e.currentTarget.value)}
      />
    </Stack>
  );

  const renderTargetingStep = () => (
    <Stack gap="md">
      <Select
        label="Mode de ciblage"
        description="Choisissez comment sélectionner vos destinataires"
        data={[
          { value: 'all', label: 'Tous les utilisateurs actifs' },
          { value: 'filtered', label: 'Filtrer par critères' },
          { value: 'manual', label: 'Sélection manuelle' },
        ]}
        value={targetingMode}
        onChange={(value) => setTargetingMode(value as TargetingMode)}
        required
      />

      {targetingMode === 'filtered' && (
        <Paper p="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="sm">Filtres de ciblage</Text>

            <Divider label="Abonnement" />

            <MultiSelect
              label="Types d'abonnement"
              placeholder="Tous les types"
              data={[
                { value: 'monthly', label: 'Mensuel' },
                { value: 'annual', label: 'Annuel' },
                { value: 'lifetime', label: 'À vie' },
              ]}
              value={filters.membershipTypes as string[] || []}
              onChange={(value) => setFilters({ ...filters, membershipTypes: value as MembershipType[] })}
              clearable
            />

            <MultiSelect
              label="Statut d'abonnement"
              placeholder="Tous les statuts"
              data={[
                { value: 'active', label: 'Actif' },
                { value: 'expired', label: 'Expiré' },
                { value: 'pending', label: 'En attente' },
                { value: 'cancelled', label: 'Annulé' },
              ]}
              value={filters.membershipStatus as string[] || []}
              onChange={(value) => setFilters({ ...filters, membershipStatus: value as MembershipStatus[] })}
              clearable
            />

            <Divider label="Démographie" />

            <Group grow>
              <NumberInput
                label="Âge minimum"
                placeholder="18"
                min={0}
                max={120}
                value={filters.ageRange?.min}
                onChange={(value) => setFilters({
                  ...filters,
                  ageRange: { ...filters.ageRange, min: value as number || undefined }
                })}
              />
              <NumberInput
                label="Âge maximum"
                placeholder="100"
                min={0}
                max={120}
                value={filters.ageRange?.max}
                onChange={(value) => setFilters({
                  ...filters,
                  ageRange: { ...filters.ageRange, max: value as number || undefined }
                })}
              />
            </Group>

            <Divider label="Options" />

            <Switch
              label="Inclure les profils étendus uniquement"
              description="Cible uniquement les membres annuels avec profil complet"
              checked={filters.hasExtendedProfile || false}
              onChange={(e) => setFilters({ ...filters, hasExtendedProfile: e.currentTarget.checked })}
            />

            <Switch
              label="Inclure les comptes bloqués"
              checked={filters.includeBlocked || false}
              onChange={(e) => setFilters({ ...filters, includeBlocked: e.currentTarget.checked })}
            />
          </Stack>
        </Paper>
      )}

      {targetingMode === 'manual' && (
        <Paper p="md" withBorder>
          <Text c="dimmed">
            La sélection manuelle des utilisateurs sera disponible dans la prochaine version.
            Utilisez le mode filtré pour le moment.
          </Text>
        </Paper>
      )}

      <Paper p="md" withBorder bg="blue.0">
        <Group>
          <IconUsers size={24} />
          <div>
            <Text fw={600} size="lg">{estimatedCount} destinataires</Text>
            <Text size="sm" c="dimmed">
              Nombre estimé de personnes qui recevront cet email
            </Text>
          </div>
        </Group>
      </Paper>

      {targetedUsers.length > 0 && (
        <Box>
          <Text fw={600} size="sm" mb="xs">Aperçu des destinataires (10 premiers)</Text>
          <Paper p="xs" withBorder>
            <Table>
              <Table.Tbody>
                {targetedUsers.slice(0, 5).map((user) => (
                  <Table.Tr key={user.uid}>
                    <Table.Td>
                      <Text size="sm">{user.firstName} {user.lastName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{user.email}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {estimatedCount > 5 && (
              <Text size="xs" c="dimmed" ta="center" mt="xs">
                ... et {estimatedCount - 5} autres
              </Text>
            )}
          </Paper>
        </Box>
      )}
    </Stack>
  );

  const renderEmailEditorStep = () => (
    <Stack gap="md">
      <Paper p="md" withBorder bg="yellow.0">
        <Text size="sm">
          <strong>Astuce :</strong> Utilisez l'éditeur ci-dessous pour créer votre email.
          Vous pouvez glisser-déposer des éléments, personnaliser les couleurs, et prévisualiser le résultat.
        </Text>
      </Paper>

      <Box style={{ height: 600, border: '1px solid #e0e0e0' }}>
        <EmailEditor
          ref={emailEditorRef}
          onReady={onEmailEditorReady}
          minHeight="600px"
          options={{
            displayMode: 'email',
            locale: 'fr-FR',
          }}
        />
      </Box>
    </Stack>
  );

  const renderSchedulingStep = () => (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Stack gap="md">
          <Text fw={600}>Récapitulatif de la campagne</Text>

          <Group>
            <Text fw={500}>Nom :</Text>
            <Text>{name}</Text>
          </Group>

          <Group>
            <Text fw={500}>Sujet :</Text>
            <Text>{subject}</Text>
          </Group>

          <Group>
            <Text fw={500}>Destinataires :</Text>
            <Badge size="lg">{estimatedCount} personnes</Badge>
          </Group>
        </Stack>
      </Paper>

      <Divider label="Planification de l'envoi" />

      <Switch
        label="Envoyer immédiatement"
        description="L'email sera envoyé dès la création de la campagne"
        checked={sendImmediately}
        onChange={(e) => setSendImmediately(e.currentTarget.checked)}
        size="md"
      />

      {!sendImmediately && (
        <DateTimePicker
          label="Date et heure d'envoi"
          description="Planifiez l'envoi de votre campagne"
          placeholder="Choisir une date et heure"
          value={scheduledDate}
          onChange={(value: string | Date | null) => {
            if (value instanceof Date) {
              setScheduledDate(value);
            } else if (typeof value === 'string') {
              setScheduledDate(new Date(value));
            } else {
              setScheduledDate(null);
            }
          }}
          minDate={new Date()}
          valueFormat="DD/MM/YYYY HH:mm"
          required={!sendImmediately}
        />
      )}

      <Paper p="md" withBorder bg="blue.0">
        <Stack gap="xs">
          <Text fw={600}>⚠️ Attention</Text>
          <Text size="sm">
            {sendImmediately
              ? 'La campagne sera envoyée immédiatement après la création. Assurez-vous que tout est correct.'
              : scheduledDate
              ? `La campagne sera envoyée le ${scheduledDate.toLocaleString('fr-FR')}.`
              : 'La campagne sera sauvegardée en brouillon. Vous pourrez la modifier et l\'envoyer plus tard.'}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Group>
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={18} />}
                onClick={() => navigate('/admin/campaigns')}
              >
                Retour
              </Button>
              <Title order={1}>Nouvelle campagne email</Title>
            </Group>
            <Text c="dimmed" size="sm" mt="xs">
              Créez et configurez votre campagne d'emailing en 4 étapes
            </Text>
          </div>
        </Group>

        {/* Stepper */}
        <Paper p="xl" shadow="sm">
          <Stepper active={active} onStepClick={setActive}>
            <Stepper.Step
              label="Informations"
              description="Détails de la campagne"
              icon={<IconMail size={18} />}
            >
              {renderBasicInfoStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Ciblage"
              description="Sélectionner les destinataires"
              icon={<IconUsers size={18} />}
            >
              {renderTargetingStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Contenu"
              description="Créer l'email"
              icon={<IconEdit size={18} />}
            >
              {renderEmailEditorStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Planification"
              description="Envoyer ou planifier"
              icon={<IconClock size={18} />}
            >
              {renderSchedulingStep()}
            </Stepper.Step>

            <Stepper.Completed>
              <Text ta="center" py="xl">
                Campagne prête à être envoyée !
              </Text>
            </Stepper.Completed>
          </Stepper>

          {/* Navigation buttons */}
          <Group justify="space-between" mt="xl">
            <Button
              variant="default"
              onClick={handlePrevious}
              disabled={active === 0}
              leftSection={<IconArrowLeft size={18} />}
            >
              Précédent
            </Button>

            {active < 3 ? (
              <Button
                onClick={handleNext}
                rightSection={<IconArrowRight size={18} />}
              >
                Suivant
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                leftSection={sendImmediately ? <IconSend size={18} /> : <IconCheck size={18} />}
                color={sendImmediately ? 'green' : 'blue'}
                loading={loading}
              >
                {sendImmediately ? 'Créer et envoyer' : scheduledDate ? 'Créer et planifier' : 'Créer en brouillon'}
              </Button>
            )}
          </Group>
        </Paper>
      </Stack>
    </div>
  );
}
