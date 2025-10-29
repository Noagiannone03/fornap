import { useState, useEffect } from 'react';
import { Box, Container, Paper, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { notifications } from '@mantine/notifications';
import { useMembershipPlans } from '../../../shared/hooks/useMembershipPlans';
import type { BasicSignupFormData, ExtendedSignupFormData, MembershipType } from '../../../shared/types/user';
import { StepProgress } from '../../components/common/StepProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { BirthdayStep } from './steps/BirthdayStep';
import { ContactStep } from './steps/ContactStep';
import { ProfessionalInfoStep } from './steps/ProfessionalInfoStep';
import { ExtendedInterestsStep } from './steps/ExtendedInterestsStep';
import { CommunicationPreferencesStep } from './steps/CommunicationPreferencesStep';
import { EngagementStep } from './steps/EngagementStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { Navbar } from '../../components/layout/Navbar';

// Étapes de base (pour tous les types d'abonnement)
const BASIC_STEP_LABELS = [
  'Bienvenue',
  'Identifiants',
  'Nom',
  'Date de naissance',
  'Contact',
  'Confirmation',
];

// Étapes étendues (pour abonnement annuel)
const EXTENDED_STEP_LABELS = [
  'Bienvenue',
  'Identifiants',
  'Nom',
  'Date de naissance',
  'Contact',
  'Professionnel',
  'Centres d\'intérêt',
  'Communication',
  'Engagement',
  'Confirmation',
];

export const EnhancedSignup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { plans, loading: plansLoading } = useMembershipPlans(true);

  const planId = searchParams.get('plan') as MembershipType | null;
  const selectedPlan = plans.find((p) => p.id === planId);

  // Déterminer si l'abonnement nécessite un profil étendu
  const requiresExtendedProfile = selectedPlan?.period === 'year';
  const stepLabels = requiresExtendedProfile ? EXTENDED_STEP_LABELS : BASIC_STEP_LABELS;

  useEffect(() => {
    // Si pas de plan sélectionné, rediriger vers la page des abonnements
    if (!plansLoading && !selectedPlan) {
      navigate('/membership');
    }
  }, [planId, selectedPlan, plansLoading, navigate]);

  // Formulaire avec tous les champs (les champs étendus seront optionnels pour les non-annuels)
  const form = useForm<ExtendedSignupFormData>({
    initialValues: {
      // Champs de base
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      postalCode: '',
      birthDate: '',
      phone: '',
      planId: planId || 'monthly',

      // Champs professionnels
      profession: '',
      activityDomain: '',
      professionalStatus: 'salaried',
      isVolunteer: false,
      volunteerDomains: [],
      skills: [],

      // Intérêts
      eventTypes: [],
      artisticDomains: [],
      musicGenres: [],
      conferenceThemes: [],

      // Communication
      preferredContact: 'email',
      instagram: '',
      facebook: '',
      linkedin: '',
      tiktok: '',
      youtube: '',
      blog: '',
      website: '',
      publicProfileConsent: false,
      publicProfileLevel: 'none',

      // Engagement
      howDidYouKnowUs: '',
      suggestions: '',
      participationInterested: false,
      participationDomains: [],
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      password: (value) =>
        value.length >= 8
          ? null
          : 'Le mot de passe doit contenir au moins 8 caractères',
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Les mots de passe ne correspondent pas',
      firstName: (value) => (value.trim() ? null : 'Le prénom est requis'),
      lastName: (value) => (value.trim() ? null : 'Le nom est requis'),
      birthDate: (value) => (value ? null : 'La date de naissance est requise'),
      phone: (value) =>
        /^(\+33|0)[1-9](\d{2}){4}$/.test(value.replace(/\s/g, ''))
          ? null
          : 'Numéro de téléphone invalide',
      postalCode: (value) =>
        /^\d{5}$/.test(value) ? null : 'Code postal invalide (5 chiffres)',

      // Validation conditionnelle pour les champs étendus (si abonnement annuel)
      profession: (value) =>
        requiresExtendedProfile && !value.trim() ? 'La profession est requise' : null,
      activityDomain: (value) =>
        requiresExtendedProfile && !value.trim() ? 'Le domaine d\'activité est requis' : null,
      professionalStatus: (value) =>
        requiresExtendedProfile && !value ? 'Le statut professionnel est requis' : null,
      preferredContact: (value) =>
        requiresExtendedProfile && !value ? 'La préférence de contact est requise' : null,
      howDidYouKnowUs: (value) =>
        requiresExtendedProfile && !value.trim() ? 'Ce champ est requis' : null,
    },
  });

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/membership');
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Si abonnement annuel, utiliser ExtendedSignupFormData
      // Sinon, extraire seulement les champs de base
      const dataToSubmit = requiresExtendedProfile
        ? form.values
        : ({
            email: form.values.email,
            password: form.values.password,
            confirmPassword: form.values.confirmPassword,
            firstName: form.values.firstName,
            lastName: form.values.lastName,
            postalCode: form.values.postalCode,
            birthDate: form.values.birthDate,
            phone: form.values.phone,
            planId: form.values.planId,
          } as BasicSignupFormData);

      await signup(dataToSubmit);

      notifications.show({
        title: 'Bienvenue sur Fornap !',
        message: `Votre adhésion ${selectedPlan?.name} a été activée avec succès`,
        color: 'dark',
      });

      // Rediriger vers la page de succès avec QR code
      navigate('/signup-success');
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || "Une erreur est survenue lors de l'inscription",
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (!selectedPlan) return null;

    // Pour les abonnements de base (monthly, lifetime)
    if (!requiresExtendedProfile) {
      switch (currentStep) {
        case 0:
          return <WelcomeStep onNext={handleNext} planName={selectedPlan.name} />;
        case 1:
          return <CredentialsStep form={form} onNext={handleNext} onBack={handleBack} />;
        case 2:
          return <PersonalInfoStep form={form} onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <BirthdayStep form={form} onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <ContactStep form={form} onNext={handleNext} onBack={handleBack} />;
        case 5:
          return (
            <ConfirmationStep
              form={form}
              onSubmit={handleSubmit}
              onBack={handleBack}
              loading={loading}
              planName={selectedPlan.name}
              planPrice={selectedPlan.price}
            />
          );
        default:
          return null;
      }
    }

    // Pour les abonnements annuels avec profil étendu
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} planName={selectedPlan.name} />;
      case 1:
        return <CredentialsStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <PersonalInfoStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <BirthdayStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <ContactStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <ProfessionalInfoStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 6:
        return <ExtendedInterestsStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 7:
        return <CommunicationPreferencesStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 8:
        return <EngagementStep form={form} onNext={handleNext} onBack={handleBack} />;
      case 9:
        return (
          <ConfirmationStep
            form={form}
            onSubmit={handleSubmit}
            onBack={handleBack}
            loading={loading}
            planName={selectedPlan.name}
            planPrice={selectedPlan.price}
          />
        );
      default:
        return null;
    }
  };

  if (plansLoading || !selectedPlan) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Box
        style={{
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          padding: '2rem 1rem',
        }}
      >
        <Container size="sm" style={{ width: '100%', maxWidth: '600px' }}>
          <Paper
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              padding: currentStep === 0 ? '2.5rem 2rem' : '2rem 1.75rem',
              borderRadius: '12px',
              border: '2px solid #000',
              background: 'white',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              transition: 'all 0.3s ease',
            }}
          >
            <Stack gap="md">
              {/* Barre de progression (sauf sur l'étape de bienvenue et confirmation) */}
              {currentStep > 0 && currentStep < stepLabels.length - 1 && (
                <StepProgress
                  currentStep={currentStep}
                  totalSteps={stepLabels.length}
                  stepLabels={stepLabels}
                />
              )}

              {/* Étape actuelle */}
              {renderStep()}
            </Stack>
          </Paper>

          {/* Indicateur pour abonnement annuel */}
          {requiresExtendedProfile && currentStep > 0 && currentStep < stepLabels.length - 1 && (
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              mt="md"
              style={{ fontWeight: 600 }}
            >
              Profil étendu requis pour l'abonnement annuel
            </Text>
          )}
        </Container>
      </Box>
    </>
  );
};
