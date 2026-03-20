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
  Divider,
  Grid,
  Card,
  Badge,
  List,
  Box,
  ThemeIcon,
  Switch,
  Modal,
  ActionIcon,
  Tooltip,
  Loader,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconMail,
  IconUsers,
  IconEdit,
  IconSend,
  IconFileText,
  IconBulb,
  IconFilter,
  IconCode,
  IconPalette,
  IconId,
  IconDeviceFloppy,
  IconTemplate,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { TargetingMode, TargetingFilters, EmailTemplateCustom } from '../../../shared/types/campaign';
import { createCampaign } from '../../../shared/services/campaignService';
import {
  getEmailTemplates,
  saveEmailTemplate,
  deleteEmailTemplate,
} from '../../../shared/services/emailTemplateService';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { UserTargetingSelector, EmailEditorModal } from './components';
import type { EmailEditorModalHandle } from './components';
import { EMAIL_TEMPLATES } from '../../../shared/config/emailTemplates';
import type { EmailTemplate } from '../../../shared/config/emailTemplates';

export function CampaignCreatePage() {
  const navigate = useNavigate();
  const { adminProfile } = useAdminAuth();
  const emailEditorModalRef = useRef<EmailEditorModalHandle>(null);

  // State pour le stepper
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  // Etape 1: Informations de base
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');

  // Etape 2: Ciblage
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('all');
  const [filters, setFilters] = useState<TargetingFilters>({
    includeBlocked: false,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [estimatedCount, setEstimatedCount] = useState(0);

  // Etape 3: Contenu email
  const [emailType, setEmailType] = useState<'template' | 'html' | 'design'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailDesign, setEmailDesign] = useState<any>(null);
  const [emailHtml, setEmailHtml] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [editorOpened, setEditorOpened] = useState(false);
  const [attachMembershipCard, setAttachMembershipCard] = useState(false);

  // Templates personnalises
  const [customTemplates, setCustomTemplates] = useState<EmailTemplateCustom[]>([]);
  const [customTemplatesLoading, setCustomTemplatesLoading] = useState(false);
  const [saveTemplateModalOpened, setSaveTemplateModalOpened] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Charger les templates personnalises
  useEffect(() => {
    loadCustomTemplates();
  }, []);

  const loadCustomTemplates = async () => {
    try {
      setCustomTemplatesLoading(true);
      const templates = await getEmailTemplates();
      setCustomTemplates(templates);
    } catch (error) {
      console.error('Error loading custom templates:', error);
    } finally {
      setCustomTemplatesLoading(false);
    }
  };

  const handleNext = async () => {
    // Validation selon l'etape
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
          message: 'Aucun destinataire cible. Verifiez vos criteres de selection.',
          color: 'red',
        });
        return;
      }
    } else if (active === 2) {
      if (emailType === 'template') {
        if (!selectedTemplate) {
          notifications.show({
            title: 'Erreur',
            message: 'Veuillez selectionner un template d\'email.',
            color: 'red',
          });
          return;
        }
      } else if (emailType === 'html') {
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
            message: 'Le contenu de l\'email est requis. Veuillez creer votre email.',
            color: 'red',
          });
          return;
        }
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
      title: 'Succes',
      message: 'Email enregistre avec succes',
      color: 'green',
    });
  };

  const handleSaveAsTemplate = (design: any, html: string) => {
    // Sauvegarder le design courant et ouvrir la modale de nommage
    setEmailDesign(design);
    setEmailHtml(html);
    setSaveTemplateModalOpened(true);
  };

  const handleConfirmSaveTemplate = async () => {
    if (!templateName.trim()) {
      notifications.show({
        title: 'Erreur',
        message: 'Le nom du template est requis',
        color: 'red',
      });
      return;
    }

    if (!emailDesign || !adminProfile) return;

    try {
      setSavingTemplate(true);

      await saveEmailTemplate({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        designJson: JSON.stringify(emailDesign),
        thumbnailHtml: emailHtml,
        createdBy: adminProfile.uid,
      });

      notifications.show({
        title: 'Succes',
        message: 'Template sauvegarde avec succes',
        color: 'green',
      });

      setSaveTemplateModalOpened(false);
      setTemplateName('');
      setTemplateDescription('');
      await loadCustomTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Impossible de sauvegarder le template',
        color: 'red',
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteCustomTemplate = async (templateId: string) => {
    try {
      await deleteEmailTemplate(templateId);
      notifications.show({
        title: 'Succes',
        message: 'Template supprime',
        color: 'green',
      });
      await loadCustomTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de supprimer le template',
        color: 'red',
      });
    }
  };

  const handleLoadCustomTemplate = (template: EmailTemplateCustom) => {
    try {
      const design = JSON.parse(template.designJson);
      setEmailDesign(design);
      setEmailType('design');
      setEditorOpened(true);
      notifications.show({
        title: 'Template charge',
        message: `Le template "${template.name}" a ete charge dans l'editeur`,
        color: 'blue',
      });
    } catch (error) {
      console.error('Error parsing template design:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger ce template',
        color: 'red',
      });
    }
  };

  const handleSubmit = async () => {
    if (!adminProfile) {
      notifications.show({
        title: 'Erreur',
        message: 'Vous devez etre connecte',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      // Generer le HTML pour l'email
      let finalHtml = emailHtml;
      let finalSubject = subject;
      let finalPreheader = preheader;

      if (emailType === 'template' && selectedTemplate) {
        // Utiliser le template selectionne
        finalHtml = selectedTemplate.html;
        finalSubject = selectedTemplate.subject;
        finalPreheader = selectedTemplate.preheader || '';
      } else if (emailType === 'html' && emailBody) {
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

      // Creer le contenu de l'email
      const content: any = {
        subject: finalSubject,
        html: finalHtml,
        fromName: 'FOR+NAP Social Club',
        fromEmail: 'no-reply@fornap.fr',
        replyTo: 'contact@fornap.fr',
        attachMembershipCard,
      };

      // Ajouter preheader seulement s'il est defini
      if (finalPreheader && finalPreheader.trim()) {
        content.preheader = finalPreheader;
      }

      // Ajouter le template ID si un template est utilise
      if (emailType === 'template' && selectedTemplate) {
        content.templateId = selectedTemplate.id;
      }

      // Sauvegarder le design Unlayer serialise en string JSON
      // (evite les limites de profondeur d'objets imbriques de Firestore)
      if (emailDesign) {
        content.designJson = JSON.stringify(emailDesign);
      }

      // Creer le ciblage en ne incluant que les champs pertinents
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

      // Creer les donnees de la campagne
      const campaignData: any = {
        name,
        content,
        targeting,
        sendImmediately: false,
      };

      // Ajouter description seulement si elle existe
      if (description && description.trim()) {
        campaignData.description = description;
      }

      // Creer la campagne (toujours en brouillon)
      await createCampaign(adminProfile.uid, campaignData);

      notifications.show({
        title: 'Succes',
        message: 'Campagne creee en brouillon. Rendez-vous sur la page de detail pour l\'envoyer.',
        color: 'green',
      });

      navigate('/admin/campaigns');
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Impossible de creer la campagne',
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
              Definissez les parametres de base de votre campagne d'emailing
            </Text>
          </div>

          <Card withBorder p="lg">
            <Stack gap="md">
              <Group gap="xs">
                <IconFileText size={20} />
                <Text fw={600}>Details de la campagne</Text>
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
                placeholder="Decrivez l'objectif de cette campagne..."
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
                description="Le sujet que verront les destinataires dans leur boite mail"
                placeholder="Ex: Decouvrez notre programmation du mois !"
                required
                size="md"
                value={subject}
                onChange={(e) => setSubject(e.currentTarget.value)}
              />

              <TextInput
                label="Preheader (optionnel)"
                description="Texte de previsualisation affiche apres le sujet"
                placeholder="Ex: Ne manquez pas nos evenements exceptionnels..."
                size="md"
                value={preheader}
                onChange={(e) => setPreheader(e.currentTarget.value)}
              />

              <Divider />

              <Card p="md" bg="blue.0">
                <Group gap="xs">
                  <IconMail size={18} />
                  <div>
                    <Text fw={600} size="sm">Expediteur automatique</Text>
                    <Text size="xs" c="dimmed">
                      Tous les emails sont envoyes depuis <strong>no-reply@fornap.fr</strong>
                    </Text>
                    <Text size="xs" c="dimmed">
                      Les reponses sont dirigees vers <strong>contact@fornap.fr</strong>
                    </Text>
                  </div>
                </Group>
              </Card>
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
                Le preheader complete le sujet et augmente le taux d'ouverture
              </List.Item>
              <List.Item>
                Utilisez un nom d'expediteur reconnaissable
              </List.Item>
              <List.Item>
                Evitez les mots spam comme "gratuit", "urgent", etc.
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
              Selectionnez qui recevra votre campagne d'emailing
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
                    Envoie a tous les membres actifs
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <IconFilter size={16} />
                <div>
                  <Text size="sm" fw={600}>Filtrage avance</Text>
                  <Text size="xs" c="dimmed">
                    Ciblez par age, abonnement, tags, etc.
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <IconUsers size={16} />
                <div>
                  <Text size="sm" fw={600}>Selection manuelle</Text>
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
              Creez le contenu de votre email
            </Text>
          </div>

          {(emailType === 'template' && !selectedTemplate) || (emailType === 'html' && !emailBody) || (emailType === 'design' && !emailHtml) ? (
            <Card withBorder p="lg">
              <Stack gap="md">
                <Text fw={600}>Choisissez le type d'email</Text>

                <Grid>
                  <Grid.Col span={4}>
                    <Card
                      withBorder
                      p="lg"
                      style={{
                        cursor: 'pointer',
                        border: emailType === 'template' ? '2px solid var(--mantine-color-green-6)' : undefined,
                        backgroundColor: emailType === 'template' ? 'var(--mantine-color-green-0)' : undefined,
                      }}
                      onClick={() => setEmailType('template')}
                    >
                      <Stack gap="md" align="center">
                        <ThemeIcon size={48} radius="xl" variant="light" color="green">
                          <IconFileText size={24} />
                        </ThemeIcon>
                        <Text fw={600} ta="center">Template predefini</Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Utilisez un template FOR+NAP pret a l'emploi
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={4}>
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

                  <Grid.Col span={4}>
                    <Card
                      withBorder
                      p="lg"
                      style={{
                        cursor: 'pointer',
                        border: emailType === 'design' ? '2px solid var(--mantine-color-orange-6)' : undefined,
                        backgroundColor: emailType === 'design' ? 'var(--mantine-color-orange-0)' : undefined,
                      }}
                      onClick={() => setEmailType('design')}
                    >
                      <Stack gap="md" align="center">
                        <ThemeIcon size={48} radius="xl" variant="light" color="orange">
                          <IconPalette size={24} />
                        </ThemeIcon>
                        <Text fw={600} ta="center">Editeur visuel</Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Creez un email design avec notre editeur drag & drop
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>

                {emailType === 'template' && (
                  <Stack gap="md" mt="lg">
                    <Text fw={600}>Selectionnez un template</Text>
                    <Grid>
                      {EMAIL_TEMPLATES.map((template) => (
                        <Grid.Col key={template.id} span={6}>
                          <Card
                            withBorder
                            p="md"
                            style={{
                              cursor: 'pointer',
                              border: selectedTemplate?.id === template.id ? '2px solid var(--mantine-color-green-6)' : undefined,
                              backgroundColor: selectedTemplate?.id === template.id ? 'var(--mantine-color-green-0)' : undefined,
                            }}
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Badge
                                  color={
                                    template.category === 'membership' ? 'blue' :
                                    template.category === 'error' ? 'red' :
                                    template.category === 'event' ? 'orange' :
                                    'gray'
                                  }
                                  size="sm"
                                >
                                  {template.category}
                                </Badge>
                                {selectedTemplate?.id === template.id && (
                                  <ThemeIcon size="sm" color="green" variant="light">
                                    <IconCheck size={14} />
                                  </ThemeIcon>
                                )}
                              </Group>
                              <Text fw={600} size="sm">{template.name}</Text>
                              <Text size="xs" c="dimmed" lineClamp={2}>
                                {template.description}
                              </Text>
                              <Divider my="xs" />
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                <strong>Sujet:</strong> {template.subject}
                              </Text>
                            </Stack>
                          </Card>
                        </Grid.Col>
                      ))}
                    </Grid>
                  </Stack>
                )}

                {emailType === 'design' && (
                  <>
                    {/* Templates personnalises sauvegardes */}
                    {customTemplatesLoading ? (
                      <Group justify="center" py="md">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">Chargement des templates...</Text>
                      </Group>
                    ) : customTemplates.length > 0 && (
                      <Stack gap="md" mt="lg">
                        <Group gap="xs">
                          <IconTemplate size={20} />
                          <Text fw={600}>Vos templates sauvegardes</Text>
                        </Group>
                        <Grid>
                          {customTemplates.map((template) => (
                            <Grid.Col key={template.id} span={6}>
                              <Card withBorder p="md" style={{ cursor: 'pointer' }}>
                                <Stack gap="xs">
                                  <Group justify="space-between">
                                    <Badge color="violet" size="sm">
                                      Personnalise
                                    </Badge>
                                    <Tooltip label="Supprimer ce template">
                                      <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteCustomTemplate(template.id);
                                        }}
                                      >
                                        <IconTrash size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                  <Text fw={600} size="sm">{template.name}</Text>
                                  {template.description && (
                                    <Text size="xs" c="dimmed" lineClamp={2}>
                                      {template.description}
                                    </Text>
                                  )}
                                  <Text size="xs" c="dimmed">
                                    Cree le {template.createdAt?.toDate?.().toLocaleDateString('fr-FR') || ''}
                                  </Text>
                                  <Button
                                    variant="light"
                                    color="violet"
                                    size="xs"
                                    fullWidth
                                    leftSection={<IconTemplate size={14} />}
                                    onClick={() => handleLoadCustomTemplate(template)}
                                  >
                                    Charger ce template
                                  </Button>
                                </Stack>
                              </Card>
                            </Grid.Col>
                          ))}
                        </Grid>
                      </Stack>
                    )}

                    <Box ta="center" py="xl">
                      <Button
                        size="lg"
                        leftSection={<IconPalette size={20} />}
                        onClick={handleOpenEmailEditor}
                      >
                        Ouvrir l'editeur visuel
                      </Button>
                    </Box>
                  </>
                )}

                {emailType === 'html' && (
                  <Stack gap="md">
                    <TextInput
                      label="Sujet de l'email"
                      placeholder="Ex: Nouvelle fonctionnalite disponible"
                      value={subject}
                      onChange={(e) => setSubject(e.currentTarget.value)}
                      required
                      leftSection={<IconMail size={18} />}
                    />
                    <Textarea
                      label="Corps du message"
                      description="Redigez le contenu de votre email"
                      placeholder="Bonjour,&#10;&#10;Nous sommes ravis de vous annoncer...&#10;&#10;Cordialement,&#10;L'equipe FORNAP"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.currentTarget.value)}
                      minRows={12}
                      autosize
                      required
                    />
                  </Stack>
                )}
              </Stack>
            </Card>
          ) : emailType === 'template' && selectedTemplate ? (
            <Card withBorder p="xl">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" variant="light" color="green">
                  <IconCheck size={32} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  Template selectionne
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  {selectedTemplate.name} - {selectedTemplate.description}
                </Text>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconFileText size={18} />}
                    onClick={() => {
                      setSelectedTemplate(null);
                    }}
                    size="lg"
                  >
                    Changer de template
                  </Button>
                </Group>
              </Stack>
            </Card>
          ) : emailType === 'html' && emailBody ? (
            <Card withBorder p="xl">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" variant="light" color="green">
                  <IconCheck size={32} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  Email cree avec succes
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Votre email a ete enregistre. Vous pouvez le modifier ou continuer.
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
                  Email cree avec succes
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Votre email a ete enregistre. Vous pouvez le modifier ou continuer.
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
                    Modifier avec l'editeur
                  </Button>
                  {emailDesign && (
                    <Button
                      variant="light"
                      color="violet"
                      leftSection={<IconDeviceFloppy size={18} />}
                      onClick={() => setSaveTemplateModalOpened(true)}
                    >
                      Sauver comme template
                    </Button>
                  )}
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

          {/* Option carte d'adherent en piece jointe */}
          <Card withBorder p="lg" bg="pink.0">
            <Stack gap="md">
              <Group gap="xs">
                <ThemeIcon size="lg" variant="light" color="pink">
                  <IconId size={20} />
                </ThemeIcon>
                <Text fw={600}>Piece jointe carte d'adherent</Text>
              </Group>

              <Switch
                label="Joindre la carte d'adherent personnalisee"
                description="Genere automatiquement la carte d'adherent de chaque destinataire et l'envoie en piece jointe PNG"
                checked={attachMembershipCard}
                onChange={(e) => setAttachMembershipCard(e.currentTarget.checked)}
                size="md"
              />

              {attachMembershipCard && (
                <Card p="sm" bg="white" withBorder>
                  <Text size="sm" c="dimmed">
                    <strong>Note :</strong> La carte sera generee avec le QR code unique de chaque membre, son type d'abonnement, sa date d'expiration et son nom complet.
                  </Text>
                </Card>
              )}
            </Stack>
          </Card>

          {emailType === 'template' && selectedTemplate && (
            <Card withBorder>
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  Apercu du template
                </Text>
                <Box
                  style={{
                    maxHeight: 500,
                    overflow: 'auto',
                    border: '1px solid #e0e0e0',
                    borderRadius: 4,
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: selectedTemplate.html }} />
                </Box>
                <Box p="md" bg="gray.0" style={{ borderRadius: 8 }}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="xs" fw={600} c="dimmed">Sujet:</Text>
                      <Text size="xs">{selectedTemplate.subject}</Text>
                    </Group>
                    {selectedTemplate.preheader && (
                      <Group gap="xs">
                        <Text size="xs" fw={600} c="dimmed">Preheader:</Text>
                        <Text size="xs">{selectedTemplate.preheader}</Text>
                      </Group>
                    )}
                    {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                      <Group gap="xs">
                        <Text size="xs" fw={600} c="dimmed">Variables:</Text>
                        <Text size="xs">{selectedTemplate.variables.join(', ')}</Text>
                      </Group>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Card>
          )}

          {emailType === 'html' && emailBody && (
            <Card withBorder>
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  Apercu de l'email
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
                  Apercu du contenu
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
              <Text fw={600}>Trois options disponibles</Text>
            </Group>

            <Stack gap="md">
              <div>
                <Group gap="xs" mb="xs">
                  <IconFileText size={18} />
                  <Text fw={600} size="sm">Templates FOR+NAP</Text>
                </Group>
                <List spacing="xs" size="xs">
                  <List.Item>Design professionnel</List.Item>
                  <List.Item>Pret a l'emploi</List.Item>
                  <List.Item>Coherence de marque</List.Item>
                  <List.Item>Gain de temps</List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Group gap="xs" mb="xs">
                  <IconCode size={18} />
                  <Text fw={600} size="sm">Email HTML</Text>
                </Group>
                <List spacing="xs" size="xs">
                  <List.Item>Controle total du code</List.Item>
                  <List.Item>Pour developpeurs</List.Item>
                  <List.Item>Personnalisation maximale</List.Item>
                </List>
              </div>

              <Divider />

              <div>
                <Group gap="xs" mb="xs">
                  <IconPalette size={18} />
                  <Text fw={600} size="sm">Editeur Visuel</Text>
                </Group>
                <List spacing="xs" size="xs">
                  <List.Item>Glisser-deposer</List.Item>
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
              Recapitulatif et creation
            </Text>
            <Text c="dimmed" size="sm">
              Verifiez les informations avant de creer votre campagne
            </Text>
          </div>

          <Card withBorder p="lg">
            <Stack gap="lg">
              <div>
                <Group gap="xs" mb="md">
                  <IconFileText size={20} />
                  <Text fw={600}>Recapitulatif de la campagne</Text>
                </Group>

                <Stack gap="sm">
                  <Group>
                    <Text fw={500} size="sm" w={140}>
                      Nom :
                    </Text>
                    <Text size="sm">{name}</Text>
                  </Group>

                  {description && (
                    <Group>
                      <Text fw={500} size="sm" w={140}>
                        Description :
                      </Text>
                      <Text size="sm" lineClamp={2}>{description}</Text>
                    </Group>
                  )}

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
                      {targetingMode === 'filtered' && <><IconFilter size={16} /><Text size="sm">Filtrage avance</Text></>}
                      {targetingMode === 'manual' && <><IconUsers size={16} /><Text size="sm">Selection manuelle</Text></>}
                    </Group>
                  </Group>

                  <Group>
                    <Text fw={500} size="sm" w={140}>
                      Piece jointe :
                    </Text>
                    <Group gap="xs">
                      {attachMembershipCard ? (
                        <Badge size="lg" color="pink" leftSection={<IconId size={14} />}>
                          Carte d'adherent
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">Aucune</Text>
                      )}
                    </Group>
                  </Group>
                </Stack>
              </div>
            </Stack>
          </Card>

          <Card withBorder p="md" bg="blue.0">
            <Group>
              <ThemeIcon color="blue" variant="light" size="lg">
                <IconSend size={24} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text fw={600} size="sm">
                  Campagne en brouillon
                </Text>
                <Text size="sm">
                  Votre campagne sera creee en brouillon. Vous pourrez l'envoyer depuis la page de detail de la campagne.
                </Text>
              </Stack>
            </Group>
          </Card>
        </Stack>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card withBorder p="lg" bg="green.0">
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" variant="light" color="green">
                <IconCheck size={20} />
              </ThemeIcon>
              <Text fw={600}>Prochaines etapes</Text>
            </Group>

            <List spacing="sm" size="sm" icon={<IconCheck size={14} />}>
              <List.Item>
                La campagne sera creee en mode brouillon
              </List.Item>
              <List.Item>
                Accedez a la page de detail de la campagne
              </List.Item>
              <List.Item>
                Cliquez sur "Envoyer maintenant" quand vous etes pret
              </List.Item>
              <List.Item>
                Suivez l'envoi en temps reel avec la barre de progression
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
              Creez et configurez votre campagne d'emailing professionnelle
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
              description="Details de base"
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
              description="Creer l'email"
              icon={<IconEdit size={20} />}
            >
              {renderEmailEditorStep()}
            </Stepper.Step>

            <Stepper.Step
              label="Recapitulatif"
              description="Verification finale"
              icon={<IconCheck size={20} />}
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
              Precedent
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
              <Button
                onClick={handleSubmit}
                leftSection={<IconCheck size={18} />}
                color="green"
                loading={loading}
                size="lg"
              >
                Creer la campagne
              </Button>
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
        onSaveAsTemplate={handleSaveAsTemplate}
        initialDesign={emailDesign}
      />

      {/* Modal de sauvegarde de template */}
      <Modal
        opened={saveTemplateModalOpened}
        onClose={() => setSaveTemplateModalOpened(false)}
        title="Sauvegarder comme template"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Sauvegardez ce design comme template reutilisable pour vos futures campagnes.
          </Text>

          <TextInput
            label="Nom du template"
            placeholder="Ex: Newsletter mensuelle, Invitation evenement..."
            required
            value={templateName}
            onChange={(e) => setTemplateName(e.currentTarget.value)}
          />

          <Textarea
            label="Description (optionnel)"
            placeholder="Decrivez l'utilisation de ce template..."
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setSaveTemplateModalOpened(false)}
            >
              Annuler
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleConfirmSaveTemplate}
              loading={savingTemplate}
              color="violet"
            >
              Sauvegarder
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
