import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserCreatePage.module.css';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Stack,
  TextInput,
  Select,
  Checkbox,
  Textarea,
  MultiSelect,
  LoadingOverlay,
  Divider,
  Accordion,
  Text,
  Grid,
  Box,
  Modal,
  Progress,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCheck,
  IconUser,
  IconCreditCard,
  IconTags,
  IconNotes,
  IconBriefcase,
  IconHeart,
  IconMessage,
  IconUsers,
  IconMail,
  IconAlertCircle,
  IconLoader,
  IconMailCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createUserByAdmin, sendMembershipCard } from '../../../shared/services/userService';
import { getAllMembershipPlans } from '../../../shared/services/membershipService';
import type {
  AdminCreateUserData,
  MemberTag,
  ProfessionalStatus,
  PreferredContact,
  PublicProfileLevel
} from '../../../shared/types/user';
import type { MembershipPlan } from '../../../shared/types/membership';
import { AVAILABLE_TAGS } from '../../../shared/types/user';

export function UserCreatePage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);

  // États pour le modal de création + envoi d'email
  const [progressModalOpened, setProgressModalOpened] = useState(false);
  const [progressStep, setProgressStep] = useState<'creating' | 'sending' | 'success' | 'error'>('creating');
  const [progressMessage, setProgressMessage] = useState('');
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state - Informations de base
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Form state - Abonnement
  const [planId, setPlanId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'failed'>('paid');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoRenew, setAutoRenew] = useState(false);

  // Form state - Statut
  const [tags, setTags] = useState<string[]>([]);
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);
  const [isCardBlocked, setIsCardBlocked] = useState(false);

  // Form state - Notes admin
  const [adminNotes, setAdminNotes] = useState('');

  // Form state - Profil étendu (pour abonnement annuel)
  const [showExtendedProfile, setShowExtendedProfile] = useState(false);

  // Professionnel
  const [profession, setProfession] = useState('');
  const [activityDomain, setActivityDomain] = useState('');
  const [professionalStatus, setProfessionalStatus] = useState<ProfessionalStatus | null>(null);
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [volunteerDomains, setVolunteerDomains] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Intérêts
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [artisticDomains, setArtisticDomains] = useState<string[]>([]);
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [conferenceThemes, setConferenceThemes] = useState<string[]>([]);

  // Communication
  const [preferredContact, setPreferredContact] = useState<PreferredContact | null>(null);
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [blog] = useState('');
  const [website, setWebsite] = useState('');
  const [publicProfileConsent, setPublicProfileConsent] = useState(false);
  const [publicProfileLevel, setPublicProfileLevel] = useState<PublicProfileLevel>('none');

  // Engagement
  const [howDidYouKnowUs, setHowDidYouKnowUs] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [participationInterested, setParticipationInterested] = useState(false);
  const [participationDomains, setParticipationDomains] = useState<string[]>([]);

  useEffect(() => {
    loadPlans();
  }, []);

  // Déterminer si le plan sélectionné est annuel
  useEffect(() => {
    if (planId) {
      const selectedPlan = plans.find(p => p.id === planId);
      // Le type MembershipPeriod utilise 'year' et 'lifetime', pas 'annual'
      setShowExtendedProfile(selectedPlan?.period === 'year' || selectedPlan?.period === 'lifetime');
    } else {
      setShowExtendedProfile(false);
    }
  }, [planId, plans]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansData = await getAllMembershipPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading plans:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les plans d\'abonnement',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): { isValid: boolean; userData?: AdminCreateUserData; birthDateObj?: Date; startDateObj?: Date } => {
    // Validation
    if (!firstName || !lastName || !email || !phone || !postalCode || !birthDate || !planId || !startDate) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs obligatoires',
        color: 'red',
      });
      return { isValid: false };
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer une adresse email valide',
        color: 'red',
      });
      return { isValid: false };
    }

    // Vérifier que les dates sont valides (format YYYY-MM-DD)
    const birthDateObj = new Date(birthDate);
    const startDateObj = new Date(startDate);

    if (isNaN(birthDateObj.getTime())) {
      notifications.show({
        title: 'Erreur',
        message: 'Date de naissance invalide',
        color: 'red',
      });
      return { isValid: false };
    }

    if (isNaN(startDateObj.getTime())) {
      notifications.show({
        title: 'Erreur',
        message: 'Date de début invalide',
        color: 'red',
      });
      return { isValid: false };
    }

    const userData: AdminCreateUserData = {
      email,
      firstName,
      lastName,
      postalCode,
      birthDate: birthDateObj.toISOString(),
      phone,
      planId,
      paymentStatus,
      startDate: startDateObj.toISOString(),
      autoRenew,
      tags: tags as MemberTag[],
      isAccountBlocked,
      isCardBlocked,
      adminNotes: adminNotes || undefined,
    };

    // Ajouter le profil étendu si abonnement annuel ou à vie
    if (showExtendedProfile && professionalStatus && preferredContact) {
      userData.extendedProfile = {
        professional: {
          profession,
          activityDomain,
          status: professionalStatus,
          volunteerWork: isVolunteer ? {
            isVolunteer: true,
            domains: volunteerDomains,
          } : undefined,
          skills,
        },
        interests: {
          eventTypes,
          artisticDomains,
          musicGenres: musicGenres.length > 0 ? musicGenres : undefined,
          conferenceThemes,
        },
        communication: {
          preferredContact,
          socialMedia: (instagram || facebook || linkedin || tiktok || youtube || blog || website) ? {
            instagram: instagram || undefined,
            facebook: facebook || undefined,
            linkedin: linkedin || undefined,
            tiktok: tiktok || undefined,
            youtube: youtube || undefined,
            blog: blog || undefined,
            website: website || undefined,
          } : undefined,
          publicProfileConsent,
          publicProfileLevel,
        },
        engagement: {
          howDidYouKnowUs,
          suggestions: suggestions || undefined,
          participationInterest: {
            interested: participationInterested,
            domains: participationDomains,
          },
        },
      };
    }

    return { isValid: true, userData, birthDateObj, startDateObj };
  };

  const handleSave = async () => {
    const validation = validateForm();
    if (!validation.isValid || !validation.userData) return;

    try {
      setSaving(true);
      const userId = await createUserByAdmin('current-admin-id', validation.userData);

      notifications.show({
        title: 'Succès',
        message: 'Utilisateur créé avec succès',
        color: 'green',
      });

      navigate(`/admin/users/${userId}`);
    } catch (error) {
      console.error('Error creating user:', error);
      notifications.show({
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Impossible de créer l\'utilisateur',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndSendEmail = async () => {
    const validation = validateForm();
    if (!validation.isValid || !validation.userData) return;

    // Ouvrir le modal de progression
    setProgressModalOpened(true);
    setProgressStep('creating');
    setProgressMessage('Création de l\'utilisateur en cours...');
    setCreatedUserId(null);
    setEmailResult(null);

    try {
      // Étape 1: Créer l'utilisateur
      const userId = await createUserByAdmin('current-admin-id', validation.userData);
      setCreatedUserId(userId);

      // Attendre un peu pour que la création soit bien finalisée
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Étape 2: Envoyer l'email
      setProgressStep('sending');
      setProgressMessage('Envoi de l\'email de bienvenue...');

      const result = await sendMembershipCard(userId, false, false);
      setEmailResult(result);

      if (result.success) {
        setProgressStep('success');
        setProgressMessage('Utilisateur créé et email envoyé avec succès !');
      } else {
        setProgressStep('error');
        setProgressMessage(`Utilisateur créé mais l'email n'a pas pu être envoyé: ${result.message}`);
      }
    } catch (error) {
      console.error('Error during user creation:', error);
      setProgressStep('error');
      setProgressMessage(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const handleCloseProgressModal = () => {
    setProgressModalOpened(false);
    if (progressStep === 'success' && createdUserId) {
      navigate(`/admin/users/${createdUserId}`);
    } else if (progressStep === 'error' && createdUserId) {
      // L'utilisateur a été créé mais l'email a échoué, rediriger quand même
      navigate(`/admin/users/${createdUserId}`);
    }
  };

  if (loading) {
    return (
      <Container size="md" pos="relative">
        <LoadingOverlay visible={loading} />
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/admin/users')}
            >
              Retour
            </Button>
            <Box>
              <Title order={1}>Créer un utilisateur</Title>
              <Text size="sm" c="dimmed">Ajout manuel d'un nouvel adhérent</Text>
            </Box>
          </Group>
        </Group>

        {/* Formulaire */}
        <Accordion
          multiple
          defaultValue={['basic', 'membership']}
          variant="separated"
        >
          {/* Informations de base */}
          <Accordion.Item value="basic">
            <Accordion.Control icon={<IconUser size={20} />}>
              <Text fw={500}>Informations personnelles</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Prénom"
                      placeholder="Prénom"
                      value={firstName}
                      onChange={(e) => setFirstName(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Nom"
                      placeholder="Nom"
                      value={lastName}
                      onChange={(e) => setLastName(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                </Grid>

                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Email"
                      placeholder="email@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Téléphone"
                      placeholder="+33 6 12 34 56 78"
                      value={phone}
                      onChange={(e) => setPhone(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                </Grid>

                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Code Postal"
                      placeholder="75001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Date de naissance"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.currentTarget.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Abonnement */}
          <Accordion.Item value="membership">
            <Accordion.Control icon={<IconCreditCard size={20} />}>
              <Text fw={500}>Abonnement</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <Select
                  label="Plan d'abonnement"
                  placeholder="Sélectionner un plan"
                  data={plans.map((plan) => ({
                    value: plan.id,
                    label: `${plan.name} - ${plan.price}€ (${
                      plan.period === 'month'
                        ? 'Mensuel'
                        : plan.period === 'year'
                        ? 'Annuel'
                        : 'À vie'
                    })`,
                  }))}
                  value={planId}
                  onChange={setPlanId}
                  required
                />

                {showExtendedProfile && (
                  <Paper p="sm" bg="blue.0" radius="md">
                    <Text size="sm" c="blue.7" fw={500}>
                      📋 Un questionnaire élargi sera disponible ci-dessous pour ce type d'abonnement
                    </Text>
                  </Paper>
                )}

                <Grid>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <Select
                      label="Statut de paiement"
                      data={[
                        { value: 'paid', label: 'Payé' },
                        { value: 'pending', label: 'En attente' },
                        { value: 'failed', label: 'Échoué' },
                      ]}
                      value={paymentStatus}
                      onChange={(value) => setPaymentStatus(value as 'paid' | 'pending' | 'failed')}
                      required
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    <TextInput
                      label="Date de début"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.currentTarget.value)}
                      required
                    />
                  </Grid.Col>
                </Grid>

                <Checkbox
                  label="Renouvellement automatique"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.currentTarget.checked)}
                />
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Profil étendu - Uniquement pour abonnement annuel/à vie */}
          {showExtendedProfile && (
            <>
              {/* Professionnel */}
              <Accordion.Item value="professional">
                <Accordion.Control icon={<IconBriefcase size={20} />}>
                  <Text fw={500}>Informations professionnelles</Text>
                  <Text size="xs" c="dimmed">Profil étendu</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Profession"
                          placeholder="Ex: Artiste, Développeur..."
                          value={profession}
                          onChange={(e) => setProfession(e.currentTarget.value)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Domaine d'activité"
                          placeholder="Ex: Arts, Technologie..."
                          value={activityDomain}
                          onChange={(e) => setActivityDomain(e.currentTarget.value)}
                        />
                      </Grid.Col>
                    </Grid>

                    <Select
                      label="Statut professionnel"
                      placeholder="Sélectionner un statut"
                      data={[
                        { value: 'salaried', label: 'Salarié' },
                        { value: 'independent', label: 'Indépendant' },
                        { value: 'student', label: 'Étudiant' },
                        { value: 'retired', label: 'Retraité' },
                        { value: 'unemployed', label: 'Sans emploi' },
                      ]}
                      value={professionalStatus}
                      onChange={(value) => setProfessionalStatus(value as ProfessionalStatus)}
                    />

                    <MultiSelect
                      label="Compétences"
                      placeholder="Sélectionner ou ajouter"
                      data={[
                        { value: 'graphisme', label: 'Graphisme' },
                        { value: 'reseaux_sociaux', label: 'Réseaux sociaux' },
                        { value: 'bricolage', label: 'Bricolage' },
                        { value: 'photographie', label: 'Photographie' },
                        { value: 'video', label: 'Vidéo' },
                        { value: 'son', label: 'Son' },
                        { value: 'animation', label: 'Animation' },
                        { value: 'redaction', label: 'Rédaction' },
                      ]}
                      value={skills}
                      onChange={setSkills}
                      searchable
                    />

                    <Divider label="Bénévolat" />

                    <Checkbox
                      label="Intéressé par le bénévolat"
                      checked={isVolunteer}
                      onChange={(e) => setIsVolunteer(e.currentTarget.checked)}
                    />

                    {isVolunteer && (
                      <MultiSelect
                        label="Domaines de bénévolat"
                        placeholder="Sélectionner ou ajouter"
                        data={[
                          { value: 'evenements', label: 'Événements' },
                          { value: 'accueil', label: 'Accueil' },
                          { value: 'communication', label: 'Communication' },
                          { value: 'technique', label: 'Technique' },
                          { value: 'cuisine', label: 'Cuisine' },
                        ]}
                        value={volunteerDomains}
                        onChange={setVolunteerDomains}
                        searchable
                      />
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Intérêts */}
              <Accordion.Item value="interests">
                <Accordion.Control icon={<IconHeart size={20} />}>
                  <Text fw={500}>Centres d'intérêt</Text>
                  <Text size="xs" c="dimmed">Profil étendu</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <MultiSelect
                      label="Types d'événements préférés"
                      placeholder="Sélectionner ou ajouter"
                      data={[
                        { value: 'concerts', label: 'Concerts' },
                        { value: 'expositions', label: 'Expositions' },
                        { value: 'ateliers', label: 'Ateliers' },
                        { value: 'conferences', label: 'Conférences' },
                        { value: 'spectacles', label: 'Spectacles' },
                        { value: 'projections', label: 'Projections' },
                      ]}
                      value={eventTypes}
                      onChange={setEventTypes}
                      searchable
                    />

                    <MultiSelect
                      label="Domaines artistiques"
                      placeholder="Sélectionner ou ajouter"
                      data={[
                        { value: 'musique', label: 'Musique' },
                        { value: 'arts_visuels', label: 'Arts visuels' },
                        { value: 'litterature', label: 'Littérature' },
                        { value: 'theatre', label: 'Théâtre' },
                        { value: 'danse', label: 'Danse' },
                        { value: 'cinema', label: 'Cinéma' },
                      ]}
                      value={artisticDomains}
                      onChange={setArtisticDomains}
                      searchable
                    />

                    <MultiSelect
                      label="Genres musicaux"
                      placeholder="Sélectionner ou ajouter"
                      data={[
                        { value: 'rock', label: 'Rock' },
                        { value: 'jazz', label: 'Jazz' },
                        { value: 'classique', label: 'Classique' },
                        { value: 'electro', label: 'Électro' },
                        { value: 'hip_hop', label: 'Hip-Hop' },
                        { value: 'pop', label: 'Pop' },
                        { value: 'reggae', label: 'Reggae' },
                        { value: 'metal', label: 'Metal' },
                      ]}
                      value={musicGenres}
                      onChange={setMusicGenres}
                      searchable
                    />

                    <MultiSelect
                      label="Thèmes de conférences"
                      placeholder="Sélectionner ou ajouter"
                      data={[
                        { value: 'environnement', label: 'Environnement' },
                        { value: 'technologie', label: 'Technologie' },
                        { value: 'societe', label: 'Société' },
                        { value: 'culture', label: 'Culture' },
                        { value: 'economie', label: 'Économie' },
                        { value: 'sante', label: 'Santé' },
                      ]}
                      value={conferenceThemes}
                      onChange={setConferenceThemes}
                      searchable
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Communication */}
              <Accordion.Item value="communication">
                <Accordion.Control icon={<IconMessage size={20} />}>
                  <Text fw={500}>Communication et réseaux</Text>
                  <Text size="xs" c="dimmed">Profil étendu</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Select
                      label="Moyen de contact préféré"
                      placeholder="Sélectionner"
                      data={[
                        { value: 'email', label: 'Email' },
                        { value: 'sms', label: 'SMS' },
                        { value: 'social', label: 'Réseaux sociaux' },
                        { value: 'app', label: 'Application' },
                      ]}
                      value={preferredContact}
                      onChange={(value) => setPreferredContact(value as PreferredContact)}
                    />

                    <Divider label="Réseaux sociaux (optionnel)" />

                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Instagram"
                          placeholder="@username"
                          value={instagram}
                          onChange={(e) => setInstagram(e.currentTarget.value)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Facebook"
                          placeholder="facebook.com/..."
                          value={facebook}
                          onChange={(e) => setFacebook(e.currentTarget.value)}
                        />
                      </Grid.Col>
                    </Grid>

                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="LinkedIn"
                          placeholder="linkedin.com/in/..."
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.currentTarget.value)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="TikTok"
                          placeholder="@username"
                          value={tiktok}
                          onChange={(e) => setTiktok(e.currentTarget.value)}
                        />
                      </Grid.Col>
                    </Grid>

                    <Grid>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="YouTube"
                          placeholder="youtube.com/..."
                          value={youtube}
                          onChange={(e) => setYoutube(e.currentTarget.value)}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, md: 6 }}>
                        <TextInput
                          label="Blog / Site web"
                          placeholder="https://..."
                          value={website}
                          onChange={(e) => setWebsite(e.currentTarget.value)}
                        />
                      </Grid.Col>
                    </Grid>

                    <Divider label="Visibilité du profil" />

                    <Checkbox
                      label="Accepte de partager son profil avec d'autres membres"
                      checked={publicProfileConsent}
                      onChange={(e) => setPublicProfileConsent(e.currentTarget.checked)}
                    />

                    {publicProfileConsent && (
                      <Select
                        label="Niveau de visibilité"
                        data={[
                          { value: 'none', label: 'Aucun' },
                          { value: 'all', label: 'Tous les membres' },
                          { value: 'friends_only', label: 'Amis uniquement' },
                        ]}
                        value={publicProfileLevel}
                        onChange={(value) => setPublicProfileLevel(value as PublicProfileLevel)}
                      />
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              {/* Engagement */}
              <Accordion.Item value="engagement">
                <Accordion.Control icon={<IconUsers size={20} />}>
                  <Text fw={500}>Engagement et feedback</Text>
                  <Text size="xs" c="dimmed">Profil étendu</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <TextInput
                      label="Comment avez-vous connu ce lieu ?"
                      placeholder="Ex: Bouche-à-oreille, réseaux sociaux..."
                      value={howDidYouKnowUs}
                      onChange={(e) => setHowDidYouKnowUs(e.currentTarget.value)}
                    />

                    <Textarea
                      label="Suggestions ou commentaires"
                      placeholder="Vos idées pour améliorer l'expérience..."
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.currentTarget.value)}
                      minRows={3}
                    />

                    <Divider label="Participation" />

                    <Checkbox
                      label="Intéressé pour participer à l'organisation d'événements"
                      checked={participationInterested}
                      onChange={(e) => setParticipationInterested(e.currentTarget.checked)}
                    />

                    {participationInterested && (
                      <MultiSelect
                        label="Domaines de participation"
                        placeholder="Sélectionner ou ajouter"
                        data={[
                          { value: 'organisation', label: 'Organisation' },
                          { value: 'animation', label: 'Animation' },
                          { value: 'technique', label: 'Technique' },
                          { value: 'communication', label: 'Communication' },
                          { value: 'logistique', label: 'Logistique' },
                        ]}
                        value={participationDomains}
                        onChange={setParticipationDomains}
                        searchable
                      />
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </>
          )}

          {/* Statut et Tags */}
          <Accordion.Item value="status">
            <Accordion.Control icon={<IconTags size={20} />}>
              <Text fw={500}>Statut et tags</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                <MultiSelect
                  label="Tags"
                  placeholder="Sélectionner des tags"
                  data={AVAILABLE_TAGS.map((tag) => ({ value: tag, label: tag }))}
                  value={tags}
                  onChange={setTags}
                  searchable
                />

                <Group>
                  <Checkbox
                    label="Compte bloqué"
                    checked={isAccountBlocked}
                    onChange={(e) => setIsAccountBlocked(e.currentTarget.checked)}
                  />

                  <Checkbox
                    label="Carte bloquée"
                    checked={isCardBlocked}
                    onChange={(e) => setIsCardBlocked(e.currentTarget.checked)}
                  />
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          {/* Notes admin */}
          <Accordion.Item value="notes">
            <Accordion.Control icon={<IconNotes size={20} />}>
              <Text fw={500}>Notes administrateur</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Textarea
                label="Notes internes"
                placeholder="Notes internes concernant cet utilisateur..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.currentTarget.value)}
                minRows={4}
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        {/* Actions */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={() => navigate('/admin/users')}
              disabled={saving}
            >
              Annuler
            </Button>
            <Group>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleSave}
                loading={saving}
                size="md"
                variant="light"
              >
                Créer l'utilisateur
              </Button>
              <Button
                leftSection={<IconMailCheck size={16} />}
                onClick={handleSaveAndSendEmail}
                disabled={saving}
                size="md"
                color="green"
                variant="gradient"
                gradient={{ from: 'teal', to: 'green', deg: 90 }}
              >
                Créer et envoyer l'email
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Modal de progression */}
        <Modal
          opened={progressModalOpened}
          onClose={handleCloseProgressModal}
          title={
            <Group gap="sm">
              {progressStep === 'creating' && <IconLoader size={24} className={styles.rotatingIcon} />}
              {progressStep === 'sending' && <IconMail size={24} className={styles.rotatingIcon} />}
              {progressStep === 'success' && <IconCheck size={24} color="green" />}
              {progressStep === 'error' && <IconAlertCircle size={24} color="red" />}
              <Text fw={600}>
                {progressStep === 'creating' && 'Création en cours'}
                {progressStep === 'sending' && 'Envoi de l\'email'}
                {progressStep === 'success' && 'Succès'}
                {progressStep === 'error' && 'Attention'}
              </Text>
            </Group>
          }
          centered
          closeOnClickOutside={progressStep === 'success' || progressStep === 'error'}
          closeOnEscape={progressStep === 'success' || progressStep === 'error'}
          withCloseButton={progressStep === 'success' || progressStep === 'error'}
          size="lg"
        >
          <Stack gap="lg">
            {/* Barre de progression */}
            {(progressStep === 'creating' || progressStep === 'sending') && (
              <Progress
                value={progressStep === 'creating' ? 50 : 100}
                size="lg"
                radius="xl"
                animated
                color={progressStep === 'creating' ? 'blue' : 'teal'}
                striped
              />
            )}

            {/* Message de progression */}
            <Paper p="md" radius="md" bg={
              progressStep === 'success' ? 'green.0' :
              progressStep === 'error' ? 'red.0' :
              'blue.0'
            }>
              <Group gap="md">
                <ThemeIcon
                  size="xl"
                  radius="xl"
                  variant="light"
                  color={
                    progressStep === 'success' ? 'green' :
                    progressStep === 'error' ? 'red' :
                    progressStep === 'sending' ? 'teal' : 'blue'
                  }
                >
                  {progressStep === 'creating' && <IconUser size={24} />}
                  {progressStep === 'sending' && <IconMail size={24} />}
                  {progressStep === 'success' && <IconCheck size={24} />}
                  {progressStep === 'error' && <IconAlertCircle size={24} />}
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {progressMessage}
                  </Text>
                  {progressStep === 'creating' && (
                    <Text size="xs" c="dimmed" mt={4}>
                      Enregistrement des informations...
                    </Text>
                  )}
                  {progressStep === 'sending' && (
                    <Text size="xs" c="dimmed" mt={4}>
                      Envoi de la carte d'adhérent par email...
                    </Text>
                  )}
                </div>
              </Group>
            </Paper>

            {/* Détails de l'email (si succès ou erreur d'envoi) */}
            {emailResult && (
              <Alert
                icon={emailResult.success ? <IconMailCheck size={16} /> : <IconAlertCircle size={16} />}
                color={emailResult.success ? 'green' : 'orange'}
                title={emailResult.success ? 'Email envoyé' : 'Problème d\'envoi'}
              >
                {emailResult.message}
              </Alert>
            )}

            {/* Récapitulatif des étapes */}
            <Stack gap="xs">
              <Group gap="xs">
                <ThemeIcon
                  size="sm"
                  radius="xl"
                  color={progressStep !== 'creating' ? 'green' : 'blue'}
                  variant={progressStep !== 'creating' ? 'filled' : 'light'}
                >
                  {progressStep !== 'creating' ? <IconCheck size={12} /> : '1'}
                </ThemeIcon>
                <Text size="sm" c={progressStep !== 'creating' ? 'green' : undefined}>
                  Création de l'utilisateur
                  {createdUserId && ` (ID: ${createdUserId.slice(0, 8)}...)`}
                </Text>
              </Group>
              <Group gap="xs">
                <ThemeIcon
                  size="sm"
                  radius="xl"
                  color={
                    progressStep === 'success' ? 'green' :
                    progressStep === 'sending' ? 'teal' :
                    progressStep === 'error' && emailResult ? 'orange' : 'gray'
                  }
                  variant={progressStep === 'success' ? 'filled' : 'light'}
                >
                  {progressStep === 'success' ? <IconCheck size={12} /> : '2'}
                </ThemeIcon>
                <Text size="sm" c={
                  progressStep === 'success' ? 'green' :
                  progressStep === 'sending' ? 'teal' : undefined
                }>
                  Envoi de l'email de bienvenue
                </Text>
              </Group>
            </Stack>

            {/* Bouton de fermeture */}
            {(progressStep === 'success' || progressStep === 'error') && (
              <Group justify="flex-end" mt="md">
                <Button
                  onClick={handleCloseProgressModal}
                  color={progressStep === 'success' ? 'green' : 'blue'}
                  leftSection={<IconCheck size={16} />}
                >
                  Voir le profil
                </Button>
              </Group>
            )}
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
