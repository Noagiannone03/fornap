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
  IconFileText,
  IconBulb,
  IconFilter,
  IconCode,
  IconPalette,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import type { TargetingMode, TargetingFilters } from '../../../shared/types/campaign';
import { createCampaign } from '../../../shared/services/campaignService';
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

  // Étape 1: Informations de base
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');

  // Étape 2: Ciblage
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('all');
  const [filters, setFilters] = useState<TargetingFilters>({
    includeBlocked: false,
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [estimatedCount, setEstimatedCount] = useState(0);

  // Étape 3: Contenu email
  const [emailType, setEmailType] = useState<'template' | 'html' | 'design'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailDesign, setEmailDesign] = useState<any>(null);
  const [emailHtml, setEmailHtml] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [editorOpened, setEditorOpened] = useState(false);

  // Étape 4: Plus besoin de planification - tout est en brouillon
  // L'envoi se fait depuis la page de détail

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
          message: 'Aucun destinataire ciblé. Vérifiez vos critères de sélection.',
          color: 'red',
        });
        return;
      }
    } else if (active === 2) {
      if (emailType === 'template') {
        if (!selectedTemplate) {
          notifications.show({
            title: 'Erreur',
            message: 'Veuillez sélectionner un template d\'email.',
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
            message: 'Le contenu de l\'email est requis. Veuillez créer votre email.',
            color: 'red',
          });
          return;
        }
      }
    }
    // Plus de validation pour l'étape 3 (planification) - tout est en brouillon

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

      // Générer le HTML pour l'email
      let finalHtml = emailHtml;
      let finalSubject = subject;
      let finalPreheader = preheader;

      if (emailType === 'template' && selectedTemplate) {
        // Utiliser le template sélectionné
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

      // Créer le contenu de l'email
      // Note: fromName, fromEmail et replyTo sont maintenant gérés automatiquement par l'API
      // (toujours no-reply@fornap.fr)
      const content: any = {
        subject: finalSubject,
        html: finalHtml,
        fromName: 'FOR+NAP Social Club',
        fromEmail: 'no-reply@fornap.fr',
        replyTo: 'contact@fornap.fr',
      };

      // Ajouter preheader seulement s'il est défini
      if (finalPreheader && finalPreheader.trim()) {
        content.preheader = finalPreheader;
      }

      // Ajouter le template ID si un template est utilisé
      if (emailType === 'template' && selectedTemplate) {
        content.templateId = selectedTemplate.id;
      }

      // ⚠️ Ne PAS sauvegarder le design dans Firestore car il contient des entités imbriquées complexes
      // Firebase n'accepte pas les objets trop profonds
      // Le HTML exporté par Unlayer suffit pour l'envoi des emails
      // if (emailDesign) {
      //   content.design = emailDesign;
      // }

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
      // Note: sendImmediately est toujours false - l'envoi se fait depuis la page de détail
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

      // Créer la campagne (toujours en brouillon)
      await createCampaign(adminProfile.uid, campaignData);

      notifications.show({
        title: 'Succès',
        message: 'Campagne créée en brouillon. Rendez-vous sur la page de détail pour l\'envoyer.',
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

              <Card p="md" bg="blue.0">
                <Group gap="xs">
                  <IconMail size={18} />
                  <div>
                    <Text fw={600} size="sm">Expéditeur automatique</Text>
                    <Text size="xs" c="dimmed">
                      Tous les emails sont envoyés depuis <strong>no-reply@fornap.fr</strong>
                    </Text>
                    <Text size="xs" c="dimmed">
                      Les réponses sont dirigées vers <strong>contact@fornap.fr</strong>
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
                        <Text fw={600} ta="center">Template prédéfini</Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Utilisez un template FOR+NAP prêt à l'emploi
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
                        <Text fw={600} ta="center">Éditeur visuel</Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Créez un email design avec notre éditeur drag & drop
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>
                </Grid>

                {emailType === 'template' && (
                  <Stack gap="md" mt="lg">
                    <Text fw={600}>Sélectionnez un template</Text>
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
                      autosize
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
          ) : emailType === 'template' && selectedTemplate ? (
            <Card withBorder p="xl">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" variant="light" color="green">
                  <IconCheck size={32} />
                </ThemeIcon>
                <Text fw={600} size="lg">
                  Template sélectionné
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

          {emailType === 'template' && selectedTemplate && (
            <Card withBorder>
              <Stack gap="xs">
                <Text fw={600} size="sm">
                  Aperçu du template
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
                        <Text size="xs" fw={600} c="dimmed">Préheader:</Text>
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
                  <List.Item>Prêt à l'emploi</List.Item>
                  <List.Item>Cohérence de marque</List.Item>
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
              Récapitulatif et création
            </Text>
            <Text c="dimmed" size="sm">
              Vérifiez les informations avant de créer votre campagne
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
                      {targetingMode === 'filtered' && <><IconFilter size={16} /><Text size="sm">Filtrage avancé</Text></>}
                      {targetingMode === 'manual' && <><IconUsers size={16} /><Text size="sm">Sélection manuelle</Text></>}
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
                  Votre campagne sera créée en brouillon. Vous pourrez l'envoyer depuis la page de détail de la campagne.
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
              <Text fw={600}>Prochaines étapes</Text>
            </Group>

            <List spacing="sm" size="sm" icon={<IconCheck size={14} />}>
              <List.Item>
                La campagne sera créée en mode brouillon
              </List.Item>
              <List.Item>
                Accédez à la page de détail de la campagne
              </List.Item>
              <List.Item>
                Cliquez sur "Envoyer maintenant" quand vous êtes prêt
              </List.Item>
              <List.Item>
                Suivez l'envoi en temps réel avec la barre de progression
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
              label="Récapitulatif"
              description="Vérification finale"
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
              <Button
                onClick={handleSubmit}
                leftSection={<IconCheck size={18} />}
                color="green"
                loading={loading}
                size="lg"
              >
                Créer la campagne
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
        initialDesign={emailDesign}
      />
    </div>
  );
}
