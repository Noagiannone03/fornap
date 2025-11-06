import { useState, useRef } from 'react';
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
  Switch,
  Divider,
  Grid,
  Card,
  Badge,
  List,
  Box,
  ThemeIcon,
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
  IconFileText,
  IconAlertCircle,
  IconCalendarEvent,
  IconBulb,
  IconFilter,
  IconCode,
  IconPalette,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { DateTimePicker } from '@mantine/dates';
import type { TargetingMode, TargetingFilters } from '../../../shared/types/campaign';
import {
  createCampaign,
  prepareCampaignForSending,
} from '../../../shared/services/campaignService';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { Timestamp } from 'firebase/firestore';
import { UserTargetingSelector, EmailEditorModal } from './components';
import type { EmailEditorModalHandle } from './components';

export function CampaignCreatePage() {
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  const emailEditorModalRef = useRef<EmailEditorModalHandle>(null);

  // State pour le stepper
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // Étape 1: Informations de base
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [fromName, setFromName] = useState('FORNAP');
  const [fromEmail, setFromEmail] = useState('contact@fornap.fr');
  const [replyTo, setReplyTo] = useState('');

  // Étape 2: Ciblage
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('all');
  const [filters, setFilters] = useState<TargetingFilters>({
    includeBlocked: false,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [estimatedCount, setEstimatedCount] = useState(0);

  // Étape 3: Contenu email
  const [emailType, setEmailType] = useState<'html' | 'design'>('design');
  const [emailDesign, setEmailDesign] = useState<any>(null);
  const [emailHtml, setEmailHtml] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [editorOpened, setEditorOpened] = useState(false);

  // Étape 4: Planification
  const [sendImmediately, setSendImmediately] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);

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
      if (!fromName.trim() || !fromEmail.trim()) {
        notifications.show({
          title: 'Erreur',
          message: 'Les informations de l\'expéditeur sont requises',
          color: 'red',
        });
        return;
      }
    } else if (active === 1) {
      if (estimatedCount === 0) {
        notifications.show({
          title: 'Erreur',
          message: 'Aucun destinataire ciblé. Vérifiez vos critères de sélection.',
          color: 'red',
        });
        return;
      }
    } else if (active === 2) {
      if (emailType === 'html') {
        if (!subject.trim() || !emailBody.trim()) {
          notifications.show({
            title: 'Erreur',
            message: 'Le sujet et le corps de l\'email sont requis.',
            color: 'red',
          });
          return;
        }
      } else {
        if (!emailHtml || emailHtml.trim() === '') {
          notifications.show({
            title: 'Erreur',
            message: 'Le contenu de l\'email est requis. Veuillez créer votre email.',
            color: 'red',
          });
          return;
        }
      }
    } else if (active === 3) {
      if (!sendImmediately && !scheduledDate) {
        notifications.show({
          title: 'Erreur',
          message: 'Veuillez choisir une date d\'envoi ou activer l\'envoi immédiat',
          color: 'red',
        });
        return;
      }
    }

    setActive((current) => (current < 3 ? current + 1 : current));
  };

  const handlePrevious = () => {
    setActive((current) => (current > 0 ? current - 1 : current));
  };

  const handleOpenEmailEditor = () => {
    setEditorOpened(true);
  };

  const handleSaveEmail = (design: any, html: string) => {
    setEmailDesign(design);
    setEmailHtml(html);
    notifications.show({
      title: 'Succès',
      message: 'Email enregistré avec succès',
      color: 'green',
    });
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

      // Générer le HTML pour l'email simple si nécessaire
      let finalHtml = emailHtml;
      if (emailType === 'html' && emailBody) {
        // Convertir le texte simple en HTML basique
        const bodyWithBreaks = emailBody.replace(/\n/g, '<br>');
        finalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
    ${bodyWithBreaks}
  </div>
</body>
</html>`.trim();
      }

      // Créer le contenu de l'email en ne incluant que les champs définis
      const content: any = {
        subject,
        fromName,
        fromEmail,
        html: finalHtml,
      };

      // Ajouter preheader seulement s'il est défini
      if (preheader && preheader.trim()) {
        content.preheader = preheader;
      }

      // Ajouter design seulement s'il existe
      if (emailDesign) {
        content.design = emailDesign;
      }

      // Ajouter replyTo seulement s'il n'est pas vide
      if (replyTo && replyTo.trim()) {
        content.replyTo = replyTo;
      }

      // Créer le ciblage en ne incluant que les champs pertinents
      const targeting: any = {
        mode: targetingMode,
        estimatedRecipients: estimatedCount,
      };

      // Ajouter les champs optionnels seulement s'ils sont pertinents
      if (targetingMode === 'manual' && selectedUserIds.length > 0) {
        targeting.manualUserIds = selectedUserIds;
      } else if (targetingMode === 'filtered' && filters) {
        targeting.filters = filters;
      }

      // Créer les données de la campagne
      const campaignData: any = {
        name,
        content,
        targeting,
        sendImmediately,
      };

      // Ajouter description seulement si elle existe
      if (description && description.trim()) {
        campaignData.description = description;
      }

      // Ajouter scheduledAt seulement si une date est définie
      if (scheduledDate) {
        campaignData.scheduledAt = Timestamp.fromDate(scheduledDate);
      }

      // Créer la campagne
      const campaign = await createCampaign(adminProfile.uid, campaignData);

      // Si envoi immédiat ou planifié, préparer l'envoi
      if (sendImmediately || scheduledDate) {
        await prepareCampaignForSending(campaign.id);
      }

      notifications.show({
        title: 'Succès',
        message: sendImmediately
          ? 'Campagne créée et prête pour l\'envoi'
          : scheduledDate
          ? 'Campagne créée et planifiée avec succès'
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
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="lg">
          <div>
            <Text size="xl" fw={700} mb="xs">
              Informations de la campagne
            </Text>
            <Text c="dimmed" size="sm">
              Définissez les paramètres de base de votre campagne d'emailing
            </Text>
          </div>

          <Card withBorder p="lg">
            <Stack gap="md">
              <Group gap="xs">
                <IconFileText size={20} />
                <Text fw={600}>Détails de la campagne</Text>
              </Group>

              <TextInput
                label="Nom de la campagne"
                description="Un nom interne pour identifier votre campagne"
                placeholder="Ex: Newsletter Janvier 2024"
                required
                size="md"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />

              <Textarea
                label="Description (optionnel)"
                description="Description interne de l'objectif de cette campagne"
                placeholder="Décrivez l'objectif de cette campagne..."
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                minRows={3}
                size="md"
              />
            </Stack>
          </Card>

          <Card withBorder p="lg">
            <Stack gap="md">
              <Group gap="xs">
                <IconMail size={20} />
                <Text fw={600}>Configuration de l'email</Text>
              </Group>

              <TextInput
                label="Sujet de l'email"
                description="Le sujet que verront les destinataires dans leur boîte mail"
                placeholder="Ex: Découvrez notre programmation du mois !"
                required
                size="md"
                value={subject}
                onChange={(e) => setSubject(e.currentTarget.value)}
              />

              <TextInput
                label="Préheader (optionnel)"
                description="Texte de prévisualisation affiché après le sujet"
                placeholder="Ex: Ne manquez pas nos événements exceptionnels..."
                size="md"
                value={preheader}
                onChange={(e) => setPreheader(e.currentTarget.value)}
              />

              <Divider />

              <Grid>
                <Grid.Col span={6}>
                  <TextInput
                    label="Nom de l'expéditeur"
                    required
                    size="md"
                    value={fromName}
                    onChange={(e) => setFromName(e.currentTarget.value)}
                  />
                </Grid.Col>
                <Grid.Col span={6}>
                  <TextInput
                    label="Email de l'expéditeur"
                    required
                    type="email"
                    size="md"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.currentTarget.value)}
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                label="Email de réponse (optionnel)"
                description="Si différent de l'email de l'expéditeur"
                type="email"
                size="md"
                value={replyTo}
                onChange={(e) => setReplyTo(e.currentTarget.value)}
              />
            </Stack>
          </Card>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card withBorder p="lg" bg="blue.0">
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" variant="light" color="blue">
                <IconBulb size={20} />
              </ThemeIcon>
              <Text fw={600}>Conseils</Text>
            </Group>

            <List spacing="sm" size="sm" icon={<IconCheck size={16} />}>
              <List.Item>
                Choisissez un sujet clair et engageant
              </List.Item>
              <List.Item>
                Le préheader complète le sujet et augmente le taux d'ouverture
              </List.Item>
              <List.Item>
                Utilisez un nom d'expéditeur reconnaissable
              </List.Item>
              <List.Item>
                Évitez les mots spam comme "gratuit", "urgent", etc.
              </List.Item>
            </List>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );

  const renderTargetingStep = () => (
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="lg">
          <div>
            <Text size="xl" fw={700} mb="xs">
              Ciblage des destinataires
            </Text>
            <Text c="dimmed" size="sm">
              Sélectionnez qui recevra votre campagne d'emailing
            </Text>
          </div>

          <UserTargetingSelector
            targetingMode={targetingMode}
            onTargetingModeChange={setTargetingMode}
            filters={filters}
            onFiltersChange={setFilters}
            selectedUserIds={selectedUserIds}
            onSelectedUsersChange={setSelectedUserIds}
            onEstimatedCountChange={setEstimatedCount}
          />
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card withBorder p="lg" bg="green.0">
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" variant="light" color="green">
                <IconUsers size={20} />
              </ThemeIcon>
              <Text fw={600}>Modes de ciblage</Text>
            </Group>

            <Stack gap="sm">
              <Group gap="xs">
                <IconUsers size={16} />
                <div>
                  <Text size="sm" fw={600}>Tous les utilisateurs</Text>
                  <Text size="xs" c="dimmed">
                    Envoie à tous les membres actifs
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <IconFilter size={16} />
                <div>
                  <Text size="sm" fw={600}>Filtrage avancé</Text>
                  <Text size="xs" c="dimmed">
                    Ciblez par âge, abonnement, tags, etc.
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <IconUsers size={16} />
                <div>
                  <Text size="sm" fw={600}>Sélection manuelle</Text>
                  <Text size="xs" c="dimmed">
                    Choisissez individuellement chaque destinataire
                  </Text>
                </div>
              </Group>
            </Stack>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );

  const renderEmailEditorStep = () => (
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="lg">
          <div>
            <Text size="xl" fw={700} mb="xs">
              Contenu de l'email
            </Text>
            <Text c="dimmed" size="sm">
              Créez le contenu de votre email
            </Text>
          </div>

          {(emailType === 'html' && !emailBody) || (emailType === 'design' && !emailHtml) ? (
            <Card withBorder p="lg">
              <Stack gap="md">
                <Text fw={600}>Choisissez le type d'email</Text>

                <Grid>
                  <Grid.Col span={6}>
                    <Card
                      withBorder
                      p="lg"
                      style={{
                        cursor: 'pointer',
                        border: emailType === 'html' ? '2px solid var(--mantine-color-blue-6)' : undefined,
                        backgroundColor: emailType === 'html' ? 'var(--mantine-color-blue-0)' : undefined,
                      }}
                      onClick={() => setEmailType('html')}
                    >
                      <Stack gap="md" align="center">
                        <ThemeIcon size={48} radius="xl" variant="light" color="blue">
                          <IconMail size={24} />
                        </ThemeIcon>
                        <Text fw={600} ta="center">Email classique</Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Composez un email simple avec sujet et message
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Card
                      withBorder
                      p="lg"
                      style={{
                        cursor: 'pointer',
                        border: emailType === 'design' ? '2px solid var(--mantine-color-green-6)' : undefined,
                        backgroundColor: emailType === 'design' ? 'var(--mantine-color-green-0)' : undefined,
                      }}
                      onClick={() => setEmailType('design')}
                    >
                      <Stack gap="md" align="center">
                        <ThemeIcon size={48} radius="xl" variant="light" color="green">
                          <IconPalette size={24} />
                        </ThemeIcon>
                        <Text fw={600} ta="center">Éditeur visuel</Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Créez un email design avec notre éditeur drag & drop
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>

                {emailType === 'html' ? (
                  <Stack gap="md">
                    <TextInput
                      label="Sujet de l'email"
                      placeholder="Ex: Nouvelle fonctionnalité disponible"
                      value={subject}
                      onChange={(e) => setSubject(e.currentTarget.value)}
                      required
                      leftSection={<IconMail size={18} />}
                    />
                    <Textarea
                      label="Corps du message"
                      description="Rédigez le contenu de votre email"
                      placeholder="Bonjour,&#10;&#10;Nous sommes ravis de vous annoncer...&#10;&#10;Cordialement,&#10;L'équipe FORNAP"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.currentTarget.value)}
                      minRows={12}
                      required
                    />
                  </Stack>
                ) : (
                  <Box ta="center" py="xl">
                    <Button
                      size="lg"
                      leftSection={<IconPalette size={20} />}
                      onClick={handleOpenEmailEditor}
                    >
                      Ouvrir l'éditeur visuel
                    </Button>
                  </Box>
                )}
              </Stack>
            </Card>
          ) : emailType === 'html' && emailBody ? (
            <Card withBorder p="xl">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" variant="light" color="green">
                  <IconCheck size={32} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  Email créé avec succès
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Votre email a été enregistré. Vous pouvez le modifier ou continuer.
                </Text>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconMail size={18} />}
                    onClick={() => {
                      // Scroll back to form
                    }}
                    size="lg"
                  >
                    Modifier l'email
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setEmailBody('');
                      setSubject('');
                    }}
                  >
                    Recommencer
                  </Button>
                </Group>
              </Stack>
            </Card>
          ) : (
            <Card withBorder p="xl">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" variant="light" color="green">
                  <IconCheck size={32} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  Email créé avec succès
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Votre email a été enregistré. Vous pouvez le modifier ou continuer.
                </Text>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconPalette size={18} />}
                    onClick={() => {
                      if (emailType === 'design') {
                        handleOpenEmailEditor();
                      }
                    }}
                    size="lg"
                  >
                    Modifier avec l'éditeur
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setEmailHtml('');
                      setEmailDesign(null);
                    }}
                  >
                    Recommencer
                  </Button>
                </Group>
              </Stack>
            </Card>
          )}

          {emailType === 'html' && emailBody && (
            <Card withBorder>
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  Aperçu de l'email
                </Text>
                <Box
                  p="md"
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6',
                  }}
                >
                  <Text size="sm" fw={600} mb="xs">
                    Sujet: {subject}
                  </Text>
                  <Divider my="sm" />
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {emailBody}
                  </Text>
                </Box>
              </Stack>
            </Card>
          )}

          {emailType === 'design' && emailHtml && (
            <Card withBorder>
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  Aperçu du contenu
                </Text>
                <Box
                  style={{
                    maxHeight: 400,
                    overflow: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 4,
                    padding: 16,
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
                </Box>
              </Stack>
            </Card>
          )}
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card withBorder p="lg" bg="yellow.0">
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" variant="light" color="yellow">
                <IconBulb size={20} />
              </ThemeIcon>
              <Text fw={600}>Deux options disponibles</Text>
            </Group>

            <Stack gap="md">
              <div>
                <Group gap="xs" mb="xs">
                  <IconCode size={18} />
                  <Text fw={600} size="sm">Email HTML</Text>
                </Group>
                <List spacing="xs" size="xs">
                  <List.Item>Contrôle total du code</List.Item>
                  <List.Item>Pour développeurs</List.Item>
                  <List.Item>Personnalisation maximale</List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Group gap="xs" mb="xs">
                  <IconPalette size={18} />
                  <Text fw={600} size="sm">Éditeur Visuel</Text>
                </Group>
                <List spacing="xs" size="xs">
                  <List.Item>Glisser-déposer</List.Item>
                  <List.Item>Templates pros</List.Item>
                  <List.Item>Variables de fusion</List.Item>
                  <List.Item>Responsive auto</List.Item>
                </List>
              </div>
            </Stack>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );

  const renderSchedulingStep = () => (
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="lg">
          <div>
            <Text size="xl" fw={700} mb="xs">
              Planification de l'envoi
            </Text>
            <Text c="dimmed" size="sm">
              Choisissez quand envoyer votre campagne
            </Text>
          </div>

          <Card withBorder p="lg">
            <Stack gap="lg">
              <div>
                <Group gap="xs" mb="md">
                  <IconFileText size={20} />
                  <Text fw={600}>Récapitulatif de la campagne</Text>
                </Group>

                <Stack gap="sm">
                  <Group>
                    <Text fw={500} size="sm" w={140}>
                      Nom :
                    </Text>
                    <Text size="sm">{name}</Text>
                  </Group>

                  <Group>
                    <Text fw={500} size="sm" w={140}>
                      Sujet :
                    </Text>
                    <Text size="sm">{subject}</Text>
                  </Group>

                  <Group>
                    <Text fw={500} size="sm" w={140}>
                      Destinataires :
                    </Text>
                    <Badge size="lg" color="blue">
                      {estimatedCount} personne{estimatedCount !== 1 ? 's' : ''}
                    </Badge>
                  </Group>

                  <Group>
                    <Text fw={500} size="sm" w={140}>
                      Mode de ciblage :
                    </Text>
                    <Group gap="xs">
                      {targetingMode === 'all' && <><IconUsers size={16} /><Text size="sm">Tous les utilisateurs</Text></>}
                      {targetingMode === 'filtered' && <><IconFilter size={16} /><Text size="sm">Filtrage avancé</Text></>}
                      {targetingMode === 'manual' && <><IconUsers size={16} /><Text size="sm">Sélection manuelle</Text></>}
                    </Group>
                  </Group>
                </Stack>
              </div>

              <Divider />

              <div>
                <Group gap="xs" mb="md">
                  <IconCalendarEvent size={20} />
                  <Text fw={600}>Programmation</Text>
                </Group>

                <Stack gap="md">
                  <Switch
                    label="Envoyer immédiatement après la création"
                    description="La campagne sera mise en file d'attente d'envoi dès sa création"
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.currentTarget.checked)}
                    size="md"
                  />

                  {!sendImmediately && (
                    <DateTimePicker
                      label="Date et heure d'envoi planifiée"
                      description="Programmez l'envoi de votre campagne à une date ultérieure"
                      placeholder="Sélectionner une date et heure"
                      value={scheduledDate}
                      onChange={(value) => {
                        if (typeof value === 'string') {
                          setScheduledDate(new Date(value));
                        } else {
                          setScheduledDate(value);
                        }
                      }}
                      minDate={new Date()}
                      valueFormat="DD/MM/YYYY HH:mm"
                      size="md"
                      clearable
                      withSeconds={false}
                      popoverProps={{ withinPortal: true }}
                      leftSection={<IconCalendarEvent size={18} />}
                    />
                  )}

                  {!sendImmediately && !scheduledDate && (
                    <Group gap="xs">
                      <IconBulb size={16} />
                      <Text size="sm" c="dimmed">
                        Si vous ne sélectionnez pas de date, la campagne sera sauvegardée en brouillon
                      </Text>
                    </Group>
                  )}
                </Stack>
              </div>
            </Stack>
          </Card>

          <Card withBorder p="md" bg="orange.0">
            <Group>
              <ThemeIcon color="orange" variant="light">
                <IconAlertCircle size={20} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text fw={600} size="sm">
                  Avant de continuer
                </Text>
                <Text size="sm">
                  {sendImmediately
                    ? 'La campagne sera envoyée immédiatement. Vérifiez bien tous les détails.'
                    : scheduledDate
                    ? `La campagne sera envoyée le ${scheduledDate.toLocaleString('fr-FR')}.`
                    : 'La campagne sera sauvegardée en brouillon. Vous pourrez la modifier et l\'envoyer plus tard.'}
                </Text>
              </Stack>
            </Group>
          </Card>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card withBorder p="lg" bg="grape.0">
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" variant="light" color="grape">
                <IconClock size={20} />
              </ThemeIcon>
              <Text fw={600}>Conseils d'envoi</Text>
            </Group>

            <List spacing="sm" size="sm" icon={<IconCheck size={14} />}>
              <List.Item>
                Les meilleurs jours : mardi, mercredi, jeudi
              </List.Item>
              <List.Item>
                Heures optimales : 10h-11h ou 14h-15h
              </List.Item>
              <List.Item>
                Évitez les week-ends et jours fériés
              </List.Item>
              <List.Item>
                Testez différentes heures pour votre audience
              </List.Item>
            </List>
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />

      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Group mb="xs">
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={18} />}
                onClick={() => navigate('/admin/campaigns')}
              >
                Retour
              </Button>
            </Group>
            <Title order={1}>Nouvelle campagne email</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Créez et configurez votre campagne d'emailing professionnelle
            </Text>
          </div>
        </Group>

        {/* Stepper */}
        <Paper p="xl" shadow="sm">
          <Stepper
            active={active}
            onStepClick={setActive}
            size="md"
            iconSize={42}
          >
            <Stepper.Step
              label="Informations"
              description="Détails de base"
              icon={<IconMail size={20} />}
            >
              {renderBasicInfoStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Destinataires"
              description="Qui va recevoir"
              icon={<IconUsers size={20} />}
            >
              {renderTargetingStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Contenu"
              description="Créer l'email"
              icon={<IconEdit size={20} />}
            >
              {renderEmailEditorStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Envoi"
              description="Quand envoyer"
              icon={<IconClock size={20} />}
            >
              {renderSchedulingStep()}
            </Stepper.Step>
          </Stepper>

          {/* Navigation buttons */}
          <Group justify="space-between" mt="xl" pt="xl" style={{ borderTop: '1px solid #e0e0e0' }}>
            <Button
              variant="default"
              onClick={handlePrevious}
              disabled={active === 0}
              leftSection={<IconArrowLeft size={18} />}
              size="md"
            >
              Précédent
            </Button>

            {active < 3 ? (
              <Button
                onClick={handleNext}
                rightSection={<IconArrowRight size={18} />}
                size="md"
              >
                Suivant
              </Button>
            ) : (
              <Group>
                <Button
                  onClick={async () => {
                    // Sauvegarder en brouillon sans date ni envoi immédiat
                    const originalSendImmediately = sendImmediately;
                    const originalScheduledDate = scheduledDate;
                    setSendImmediately(false);
                    setScheduledDate(null);
                    await handleSubmit();
                    // Restaurer les valeurs originales en cas d'erreur
                    setSendImmediately(originalSendImmediately);
                    setScheduledDate(originalScheduledDate);
                  }}
                  variant="default"
                  leftSection={<IconFileText size={18} />}
                  loading={loading}
                  size="md"
                >
                  Sauvegarder en brouillon
                </Button>
                <Button
                  onClick={handleSubmit}
                  leftSection={sendImmediately ? <IconSend size={18} /> : <IconCheck size={18} />}
                  color={sendImmediately ? 'green' : 'blue'}
                  loading={loading}
                  size="md"
                >
                  {sendImmediately
                    ? 'Créer et envoyer'
                    : scheduledDate
                    ? 'Créer et planifier'
                    : 'Créer en brouillon'}
                </Button>
              </Group>
            )}
          </Group>
        </Paper>
      </Stack>

      {/* Email Editor Modal */}
      <EmailEditorModal
        ref={emailEditorModalRef}
        opened={editorOpened}
        onClose={() => setEditorOpened(false)}
        onSave={handleSaveEmail}
        initialDesign={emailDesign}
      />
    </div>
  );
}
