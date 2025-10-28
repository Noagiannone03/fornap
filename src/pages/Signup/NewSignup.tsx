import { useState } from 'react';
import { Box, Container, Paper, Stack, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { notifications } from '@mantine/notifications';
import { MEMBERSHIP_PLANS } from '../../constants/membershipPlans';
import type { SignupFormData, MembershipType } from '../../types/user';
import { StepProgress } from '../../components/common/StepProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { CredentialsStep } from './steps/CredentialsStep';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { BirthdayStep } from './steps/BirthdayStep';
import { ContactStep } from './steps/ContactStep';
import { InterestsStep } from './steps/InterestsStep';
import { ConfirmationStep } from './steps/ConfirmationStep';
import { Navbar } from '../../components/layout/Navbar';

const STEP_LABELS = [
  'Bienvenue',
  'Identifiants',
  'Nom',
  'Date de naissance',
  'Contact',
  'Centres d\'intérêt',
  'Confirmation',
];

export const NewSignup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signup } = useAuth();

  const planId = (searchParams.get('plan') as MembershipType) || 'monthly';
  const selectedPlan = MEMBERSHIP_PLANS.find((p) => p.id === planId) || MEMBERSHIP_PLANS[0];

  const form = useForm<SignupFormData>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phone: '',
      postalCode: '',
      membershipType: planId,
      interests: [],
      howDidYouHearAboutUs: '',
      preferredAmbiance: '',
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
      dateOfBirth: (value) => (value ? null : 'La date de naissance est requise'),
      phone: (value) =>
        /^(\+33|0)[1-9](\d{2}){4}$/.test(value.replace(/\s/g, ''))
          ? null
          : 'Numéro de téléphone invalide',
      postalCode: (value) =>
        /^\d{5}$/.test(value) ? null : 'Code postal invalide (5 chiffres)',
    },
  });

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEP_LABELS.length - 1));
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
      await signup(form.values);
      notifications.show({
        title: 'Bienvenue sur Fornap !',
        message: `Votre adhésion ${selectedPlan.name} a été activée avec succès`,
        color: 'dark',
      });
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
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep onNext={handleNext} planName={selectedPlan.name} />
        );
      case 1:
        return (
          <CredentialsStep
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <PersonalInfoStep
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <BirthdayStep
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <ContactStep
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <InterestsStep
            form={form}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
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
        <Container size="sm" style={{ width: '100%', maxWidth: '480px' }}>
          <Paper
            style={{
              maxWidth: '480px',
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
              {currentStep > 0 && currentStep < STEP_LABELS.length - 1 && (
                <StepProgress
                  currentStep={currentStep}
                  totalSteps={STEP_LABELS.length}
                  stepLabels={STEP_LABELS}
                />
              )}

              {/* Étape actuelle */}
              {renderStep()}
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
};
