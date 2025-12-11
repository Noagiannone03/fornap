import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Stack,
  TextInput,
  LoadingOverlay,
  Accordion,
  Switch,
  NumberInput,
  Select,
  TagsInput,
  MultiSelect,
  Textarea,
} from '@mantine/core';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getUserById, updateUser, getAllUniqueTags } from '../../../shared/services/userService';
import { getAllMembershipPlans } from '../../../shared/services/membershipService';
import { getTagNames } from '../../../shared/services/tagService';
import { Timestamp } from 'firebase/firestore';
import type { User, MembershipStatus, PaymentStatus, ProfessionalStatus, PreferredContact, PublicProfileLevel, RegistrationSource } from '../../../shared/types/user';
import type { MembershipPlan } from '../../../shared/types/membership';
import {
  AVAILABLE_TAGS,
  AVAILABLE_SKILLS,
  EVENT_TYPES,
  ARTISTIC_DOMAINS,
  MUSIC_GENRES,
  MEMBERSHIP_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PROFESSIONAL_STATUS_LABELS,
  REGISTRATION_SOURCE_LABELS,
} from '../../../shared/types/user';

export function UserEditPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Informations de base
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);

  // Statut du compte
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>(AVAILABLE_TAGS);
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);
  const [isCardBlocked, setIsCardBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');

  // Source d'inscription
  const [registrationSource, setRegistrationSource] = useState<RegistrationSource>('platform');

  // Abonnement
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('active');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [membershipPrice, setMembershipPrice] = useState(0);
  const [autoRenew, setAutoRenew] = useState(false);
  const [membershipStartDate, setMembershipStartDate] = useState<Date | null>(null);
  const [membershipExpiryDate, setMembershipExpiryDate] = useState<Date | null>(null);

  // Points de fidélité
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  // Profil étendu - Professionnel
  const [profession, setProfession] = useState('');
  const [activityDomain, setActivityDomain] = useState('');
  const [professionalStatus, setProfessionalStatus] = useState<ProfessionalStatus>('salaried');
  const [isVolunteer, setIsVolunteer] = useState(false);
  const [volunteerDomains, setVolunteerDomains] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Profil étendu - Intérêts
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [artisticDomains, setArtisticDomains] = useState<string[]>([]);
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [conferenceThemes, setConferenceThemes] = useState<string[]>([]);

  // Profil étendu - Communication
  const [preferredContact, setPreferredContact] = useState<PreferredContact>('email');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [blog, setBlog] = useState('');
  const [website, setWebsite] = useState('');
  const [publicProfileConsent, setPublicProfileConsent] = useState(false);
  const [publicProfileLevel, setPublicProfileLevel] = useState<PublicProfileLevel>('none');

  // Profil étendu - Engagement
  const [howDidYouKnowUs, setHowDidYouKnowUs] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [participationInterested, setParticipationInterested] = useState(false);
  const [participationDomains, setParticipationDomains] = useState<string[]>([]);

  // Helper function pour convertir n'importe quelle valeur en Date
  const toDateSafe = (value: any): Date | null => {
    if (!value) return null;

    try {
      // Si c'est un Timestamp Firestore
      if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const converted = value.toDate();
        return converted instanceof Date && !isNaN(converted.getTime()) ? converted : null;
      }

      // Si c'est déjà une Date
      if (value instanceof Date) {
        return !isNaN(value.getTime()) ? value : null;
      }

      // Si c'est une chaîne ou un nombre
      if (typeof value === 'string' || typeof value === 'number') {
        const converted = new Date(value);
        return !isNaN(converted.getTime()) ? converted : null;
      }

      return null;
    } catch (error) {
      console.error('Error converting to Date:', error, value);
      return null;
    }
  };

  // Helper function pour formater une Date en YYYY-MM-DD pour les inputs HTML
  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';

    // Vérifier que c'est bien une Date valide
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return '';
    }
  };

  // Helper function pour parser une date depuis un input HTML (YYYY-MM-DD)
  const parseDateFromInput = (dateString: string): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  useEffect(() => {
    if (uid) {
      loadUser();
    }
    loadAllTags();
    loadPlans();
  }, [uid]);

  const loadPlans = async () => {
    try {
      const plansData = await getAllMembershipPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadAllTags = async () => {
    try {
      const [uniqueTags, configTags] = await Promise.all([
        getAllUniqueTags(),
        getTagNames(),
      ]);
      const mergedTags = Array.from(new Set([...AVAILABLE_TAGS, ...configTags, ...uniqueTags]));
      setAllTags(mergedTags.sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadUser = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const userData = await getUserById(uid);

      if (!userData) {
        notifications.show({
          title: 'Erreur',
          message: 'Utilisateur introuvable',
          color: 'red',
        });
        navigate('/admin/users');
        return;
      }

      setUser(userData);

      // Informations de base
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setEmail(userData.email || '');
      setPhone(userData.phone || '');
      setPostalCode(userData.postalCode || '');

      // Conversion sécurisée de birthDate
      setBirthDate(toDateSafe(userData.birthDate));

      // Statut du compte
      setTags(userData.status.tags || []);
      setIsAccountBlocked(userData.status.isAccountBlocked);
      setIsCardBlocked(userData.status.isCardBlocked);
      setBlockedReason(userData.status.blockedReason || '');

      // Source d'inscription
      setRegistrationSource(userData.registration.source);

      // Abonnement
      setSelectedPlanId(userData.currentMembership.planId);
      setMembershipStatus(userData.currentMembership.status);
      setPaymentStatus(userData.currentMembership.paymentStatus);
      setMembershipPrice(userData.currentMembership.price);
      setAutoRenew(userData.currentMembership.autoRenew);

      // Conversion sécurisée des dates de membership
      setMembershipStartDate(toDateSafe(userData.currentMembership.startDate));
      setMembershipExpiryDate(toDateSafe(userData.currentMembership.expiryDate));

      // Points de fidélité
      setLoyaltyPoints(userData.loyaltyPoints);

      // Profil étendu (seulement si présent)
      if (userData.extendedProfile) {
        const { professional, interests, communication, engagement } = userData.extendedProfile;

        // Professionnel
        setProfession(professional.profession || '');
        setActivityDomain(professional.activityDomain || '');
        setProfessionalStatus(professional.status);
        setIsVolunteer(professional.volunteerWork?.isVolunteer || false);
        setVolunteerDomains(professional.volunteerWork?.domains || []);
        setSkills(professional.skills || []);

        // Intérêts
        setEventTypes(interests.eventTypes || []);
        setArtisticDomains(interests.artisticDomains || []);
        setMusicGenres(interests.musicGenres || []);
        setConferenceThemes(interests.conferenceThemes || []);

        // Communication
        setPreferredContact(communication.preferredContact);
        setInstagram(communication.socialMedia?.instagram || '');
        setFacebook(communication.socialMedia?.facebook || '');
        setLinkedin(communication.socialMedia?.linkedin || '');
        setTiktok(communication.socialMedia?.tiktok || '');
        setYoutube(communication.socialMedia?.youtube || '');
        setBlog(communication.socialMedia?.blog || '');
        setWebsite(communication.socialMedia?.website || '');
        setPublicProfileConsent(communication.publicProfileConsent);
        setPublicProfileLevel(communication.publicProfileLevel);

        // Engagement
        setHowDidYouKnowUs(engagement.howDidYouKnowUs || '');
        setSuggestions(engagement.suggestions || '');
        setParticipationInterested(engagement.participationInterest?.interested || false);
        setParticipationDomains(engagement.participationInterest?.domains || []);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger l\'utilisateur',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!uid || !user) return;

    try {
      setSaving(true);

      // Préparer les données de mise à jour
      const updates: any = {
        firstName,
        lastName,
        phone,
        postalCode,
        email,
        birthDate: birthDate ? Timestamp.fromDate(birthDate) : undefined,
        status: {
          tags,
          isAccountBlocked,
          isCardBlocked,
          blockedReason: blockedReason || undefined,
          blockedAt: isAccountBlocked && !user.status.isAccountBlocked
            ? Timestamp.now()
            : user.status.blockedAt,
          blockedBy: isAccountBlocked && !user.status.isAccountBlocked
            ? 'current-admin-id' // TODO: Utiliser l'ID de l'admin connecté
            : user.status.blockedBy,
        },
        currentMembership: {
          ...user.currentMembership,
          planId: selectedPlanId || user.currentMembership.planId,
          planType: plans.find(p => p.id === selectedPlanId)?.period === 'month' ? 'monthly' : plans.find(p => p.id === selectedPlanId)?.period === 'year' ? 'annual' : 'lifetime',
          status: membershipStatus,
          paymentStatus: paymentStatus,
          price: membershipPrice,
          autoRenew,
          startDate: membershipStartDate ? Timestamp.fromDate(membershipStartDate) : user.currentMembership.startDate,
          expiryDate: membershipExpiryDate ? Timestamp.fromDate(membershipExpiryDate) : null,
        },
        registration: {
          ...user.registration,
          source: registrationSource,
        },
        loyaltyPoints,
      };

      // Ajouter le profil étendu seulement si c'est un abonnement annuel
      if (user.currentMembership.planType === 'annual') {
        updates.extendedProfile = {
          professional: {
            profession,
            activityDomain,
            status: professionalStatus,
            volunteerWork: {
              isVolunteer,
              domains: volunteerDomains,
            },
            skills,
          },
          interests: {
            eventTypes,
            artisticDomains,
            musicGenres,
            conferenceThemes,
          },
          communication: {
            preferredContact,
            socialMedia: {
              instagram: instagram || undefined,
              facebook: facebook || undefined,
              linkedin: linkedin || undefined,
              tiktok: tiktok || undefined,
              youtube: youtube || undefined,
              blog: blog || undefined,
              website: website || undefined,
            },
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

      await updateUser(uid, updates, 'current-admin-id'); // TODO: Utiliser l'ID de l'admin connecté

      notifications.show({
        title: 'Succès',
        message: 'Utilisateur mis à jour avec succès',
        color: 'green',
      });

      navigate(`/admin/users/${uid}`);
    } catch (error) {
      console.error('Error updating user:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de mettre à jour l\'utilisateur',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <Container size="md" pos="relative">
        <LoadingOverlay visible={loading} />
      </Container>
    );
  }

  const hasExtendedProfile = user?.currentMembership.planType === 'annual';

  return (
    <Container size="lg">
      <Group justify="space-between" mb="xl">
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(`/admin/users/${uid}`)}
          >
            Retour
          </Button>
          <Title order={1}>Modifier Utilisateur</Title>
        </Group>
      </Group>

      <Accordion multiple defaultValue={['basic', 'status', 'membership', 'loyalty']}>
        {/* Informations de Base */}
        <Accordion.Item value="basic">
          <Accordion.Control>Informations de Base</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Group grow>
                  <TextInput
                    label="Prénom"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.currentTarget.value)}
                    required
                  />
                  <TextInput
                    label="Nom"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.currentTarget.value)}
                    required
                  />
                </Group>

                <TextInput
                  label="Email"
                  placeholder="email@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />

                <Group grow>
                  <TextInput
                    label="Téléphone"
                    placeholder="+33 6 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Code Postal"
                    placeholder="75001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.currentTarget.value)}
                  />
                </Group>

                <TextInput
                  label="Date de naissance"
                  type="date"
                  value={formatDateForInput(birthDate)}
                  onChange={(e) => setBirthDate(parseDateFromInput(e.currentTarget.value))}
                  max={formatDateForInput(new Date())}
                />
              </Stack>
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Statut du Compte */}
        <Accordion.Item value="status">
          <Accordion.Control>Statut du Compte</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Select
                  label="Source d'inscription"
                  description="Origine du compte utilisateur"
                  data={Object.entries(REGISTRATION_SOURCE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  value={registrationSource}
                  onChange={(value) => setRegistrationSource(value as RegistrationSource)}
                />

                <TagsInput
                  label="Tags"
                  placeholder="Selectionnez ou creez des tags"
                  data={allTags}
                  value={tags}
                  onChange={setTags}
                  clearable
                />

                <Switch
                  label="Compte bloqué"
                  description="L'utilisateur ne pourra pas se connecter"
                  checked={isAccountBlocked}
                  onChange={(e) => setIsAccountBlocked(e.currentTarget.checked)}
                />

                <Switch
                  label="Carte bloquée"
                  description="Le QR code ne pourra pas être scanné"
                  checked={isCardBlocked}
                  onChange={(e) => setIsCardBlocked(e.currentTarget.checked)}
                />

                {(isAccountBlocked || isCardBlocked) && (
                  <Textarea
                    label="Raison du blocage"
                    placeholder="Expliquez pourquoi le compte/carte est bloqué"
                    value={blockedReason}
                    onChange={(e) => setBlockedReason(e.currentTarget.value)}
                    rows={3}
                  />
                )}
              </Stack>
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Abonnement */}
        <Accordion.Item value="membership">
          <Accordion.Control>Abonnement</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Select
                  label="Plan d'abonnement"
                  placeholder="Selectionner un plan"
                  data={plans.map((plan) => ({
                    value: plan.id,
                    label: `${plan.name} - ${plan.price}\u20ac (${plan.period === 'month' ? 'Mensuel' : plan.period === 'year' ? 'Annuel' : 'A vie'})`,
                  }))}
                  value={selectedPlanId}
                  onChange={(value) => {
                    setSelectedPlanId(value);
                    const selectedPlan = plans.find(p => p.id === value);
                    if (selectedPlan) {
                      // Auto-update price
                      setMembershipPrice(selectedPlan.price);
                      // Auto-calculate expiry date based on current start date
                      if (membershipStartDate) {
                        if (selectedPlan.period === 'month') {
                          const expiryDate = new Date(membershipStartDate);
                          expiryDate.setMonth(expiryDate.getMonth() + 1);
                          setMembershipExpiryDate(expiryDate);
                        } else if (selectedPlan.period === 'year') {
                          const expiryDate = new Date(membershipStartDate);
                          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                          setMembershipExpiryDate(expiryDate);
                        } else {
                          // lifetime - no expiry
                          setMembershipExpiryDate(null);
                        }
                      }
                    }
                  }}
                />

                <Group grow>
                  <Select
                    label="Statut de l'abonnement"
                    data={Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={membershipStatus}
                    onChange={(value) => setMembershipStatus(value as MembershipStatus)}
                  />

                  <Select
                    label="Statut du paiement"
                    data={Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={paymentStatus}
                    onChange={(value) => setPaymentStatus(value as PaymentStatus)}
                  />
                </Group>

                <NumberInput
                  label="Prix de l'abonnement (€)"
                  placeholder="150"
                  value={membershipPrice}
                  onChange={(value) => setMembershipPrice(Number(value))}
                  min={0}
                  decimalScale={2}
                  fixedDecimalScale
                />

                <Group grow>
                  <TextInput
                    label="Date de debut"
                    type="date"
                    value={formatDateForInput(membershipStartDate)}
                    onChange={(e) => {
                      const newStartDate = parseDateFromInput(e.currentTarget.value);
                      setMembershipStartDate(newStartDate);
                      // Auto-calculate expiry date based on plan type
                      if (newStartDate && selectedPlanId) {
                        const selectedPlan = plans.find(p => p.id === selectedPlanId);
                        if (selectedPlan) {
                          if (selectedPlan.period === 'month') {
                            const expiryDate = new Date(newStartDate);
                            expiryDate.setMonth(expiryDate.getMonth() + 1);
                            setMembershipExpiryDate(expiryDate);
                          } else if (selectedPlan.period === 'year') {
                            const expiryDate = new Date(newStartDate);
                            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                            setMembershipExpiryDate(expiryDate);
                          } else {
                            // lifetime - no expiry
                            setMembershipExpiryDate(null);
                          }
                        }
                      }
                    }}
                  />

                  <TextInput
                    label="Date d'expiration"
                    type="date"
                    value={formatDateForInput(membershipExpiryDate)}
                    onChange={(e) => setMembershipExpiryDate(parseDateFromInput(e.currentTarget.value))}
                    description={plans.find(p => p.id === selectedPlanId)?.period === 'lifetime' ? 'Laisser vide pour lifetime' : ''}
                  />
                </Group>

                <Switch
                  label="Renouvellement automatique"
                  description="L'abonnement sera renouvelé automatiquement"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.currentTarget.checked)}
                />
              </Stack>
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Points de Fidélité */}
        <Accordion.Item value="loyalty">
          <Accordion.Control>Points de Fidélité</Accordion.Control>
          <Accordion.Panel>
            <Paper withBorder p="md" radius="md">
              <NumberInput
                label="Points de fidélité"
                placeholder="0"
                value={loyaltyPoints}
                onChange={(value) => setLoyaltyPoints(Number(value))}
                min={0}
                description="Ajustez manuellement les points de fidélité de l'utilisateur"
              />
            </Paper>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Profil Étendu - Affiché seulement pour les abonnements annuels */}
        {hasExtendedProfile && (
          <>
            {/* Profil Professionnel */}
            <Accordion.Item value="professional">
              <Accordion.Control>Profil Professionnel</Accordion.Control>
              <Accordion.Panel>
                <Paper withBorder p="md" radius="md">
                  <Stack gap="md">
                    <Group grow>
                      <TextInput
                        label="Profession"
                        placeholder="Profession"
                        value={profession}
                        onChange={(e) => setProfession(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Domaine d'activité"
                        placeholder="Domaine d'activité"
                        value={activityDomain}
                        onChange={(e) => setActivityDomain(e.currentTarget.value)}
                      />
                    </Group>

                    <Select
                      label="Statut professionnel"
                      data={Object.entries(PROFESSIONAL_STATUS_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={professionalStatus}
                      onChange={(value) => setProfessionalStatus(value as ProfessionalStatus)}
                    />

                    <Switch
                      label="Bénévole"
                      description="L'utilisateur est intéressé par le bénévolat"
                      checked={isVolunteer}
                      onChange={(e) => setIsVolunteer(e.currentTarget.checked)}
                    />

                    {isVolunteer && (
                      <MultiSelect
                        label="Domaines de bénévolat"
                        placeholder="Sélectionnez des domaines"
                        data={['événementiel', 'communication', 'technique', 'accueil', 'logistique']}
                        value={volunteerDomains}
                        onChange={setVolunteerDomains}
                        searchable
                      />
                    )}

                    <MultiSelect
                      label="Compétences"
                      placeholder="Sélectionnez des compétences"
                      data={AVAILABLE_SKILLS}
                      value={skills}
                      onChange={setSkills}
                      searchable
                    />
                  </Stack>
                </Paper>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Centres d'Intérêt */}
            <Accordion.Item value="interests">
              <Accordion.Control>Centres d'Intérêt</Accordion.Control>
              <Accordion.Panel>
                <Paper withBorder p="md" radius="md">
                  <Stack gap="md">
                    <MultiSelect
                      label="Types d'événements"
                      placeholder="Sélectionnez des types"
                      data={EVENT_TYPES}
                      value={eventTypes}
                      onChange={setEventTypes}
                      searchable
                    />

                    <MultiSelect
                      label="Domaines artistiques"
                      placeholder="Sélectionnez des domaines"
                      data={ARTISTIC_DOMAINS}
                      value={artisticDomains}
                      onChange={setArtisticDomains}
                      searchable
                    />

                    <MultiSelect
                      label="Genres musicaux"
                      placeholder="Sélectionnez des genres"
                      data={MUSIC_GENRES}
                      value={musicGenres}
                      onChange={setMusicGenres}
                      searchable
                    />

                    <MultiSelect
                      label="Thèmes de conférences"
                      placeholder="Saisissez des thèmes"
                      data={conferenceThemes}
                      value={conferenceThemes}
                      onChange={setConferenceThemes}
                      searchable
                    />
                  </Stack>
                </Paper>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Communication */}
            <Accordion.Item value="communication">
              <Accordion.Control>Communication & Réseaux Sociaux</Accordion.Control>
              <Accordion.Panel>
                <Paper withBorder p="md" radius="md">
                  <Stack gap="md">
                    <Select
                      label="Moyen de contact préféré"
                      data={[
                        { value: 'email', label: 'Email' },
                        { value: 'sms', label: 'SMS' },
                        { value: 'social', label: 'Réseaux sociaux' },
                        { value: 'app', label: 'Application' },
                      ]}
                      value={preferredContact}
                      onChange={(value) => setPreferredContact(value as PreferredContact)}
                    />

                    <Group grow>
                      <TextInput
                        label="Instagram"
                        placeholder="@username"
                        value={instagram}
                        onChange={(e) => setInstagram(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Facebook"
                        placeholder="URL ou nom d'utilisateur"
                        value={facebook}
                        onChange={(e) => setFacebook(e.currentTarget.value)}
                      />
                    </Group>

                    <Group grow>
                      <TextInput
                        label="LinkedIn"
                        placeholder="URL ou nom d'utilisateur"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.currentTarget.value)}
                      />
                      <TextInput
                        label="TikTok"
                        placeholder="@username"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.currentTarget.value)}
                      />
                    </Group>

                    <Group grow>
                      <TextInput
                        label="YouTube"
                        placeholder="URL de la chaîne"
                        value={youtube}
                        onChange={(e) => setYoutube(e.currentTarget.value)}
                      />
                      <TextInput
                        label="Blog"
                        placeholder="URL du blog"
                        value={blog}
                        onChange={(e) => setBlog(e.currentTarget.value)}
                      />
                    </Group>

                    <TextInput
                      label="Site web"
                      placeholder="https://example.com"
                      value={website}
                      onChange={(e) => setWebsite(e.currentTarget.value)}
                    />

                    <Switch
                      label="Consentement profil public"
                      description="L'utilisateur consent à rendre son profil public"
                      checked={publicProfileConsent}
                      onChange={(e) => setPublicProfileConsent(e.currentTarget.checked)}
                    />

                    {publicProfileConsent && (
                      <Select
                        label="Niveau de visibilité du profil"
                        data={[
                          { value: 'none', label: 'Aucun' },
                          { value: 'friends_only', label: 'Amis uniquement' },
                          { value: 'all', label: 'Tous' },
                        ]}
                        value={publicProfileLevel}
                        onChange={(value) => setPublicProfileLevel(value as PublicProfileLevel)}
                      />
                    )}
                  </Stack>
                </Paper>
              </Accordion.Panel>
            </Accordion.Item>

            {/* Engagement */}
            <Accordion.Item value="engagement">
              <Accordion.Control>Engagement & Feedback</Accordion.Control>
              <Accordion.Panel>
                <Paper withBorder p="md" radius="md">
                  <Stack gap="md">
                    <TextInput
                      label="Comment nous avez-vous connu ?"
                      placeholder="Réseaux sociaux, bouche à oreille, etc."
                      value={howDidYouKnowUs}
                      onChange={(e) => setHowDidYouKnowUs(e.currentTarget.value)}
                    />

                    <Textarea
                      label="Suggestions"
                      placeholder="Commentaires et suggestions de l'utilisateur"
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.currentTarget.value)}
                      rows={4}
                    />

                    <Switch
                      label="Intéressé par la participation"
                      description="L'utilisateur souhaite participer activement"
                      checked={participationInterested}
                      onChange={(e) => setParticipationInterested(e.currentTarget.checked)}
                    />

                    {participationInterested && (
                      <MultiSelect
                        label="Domaines de participation"
                        placeholder="Sélectionnez des domaines"
                        data={['événements', 'communication', 'technique', 'organisation', 'bénévolat']}
                        value={participationDomains}
                        onChange={setParticipationDomains}
                        searchable
                      />
                    )}
                  </Stack>
                </Paper>
              </Accordion.Panel>
            </Accordion.Item>
          </>
        )}
      </Accordion>

      {/* Boutons d'action */}
      <Group justify="flex-end" mt="xl">
        <Button variant="subtle" onClick={() => navigate(`/admin/users/${uid}`)} disabled={saving}>
          Annuler
        </Button>
        <Button leftSection={<IconCheck size={16} />} onClick={handleSave} loading={saving}>
          Enregistrer toutes les modifications
        </Button>
      </Group>
    </Container>
  );
}
