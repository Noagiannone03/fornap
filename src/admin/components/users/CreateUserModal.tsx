import { Modal, Stepper, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { createUserByAdmin } from '../../../shared/services/userService';
import type { AdminCreateUserData, PaymentStatus, MemberTag } from '../../../shared/types/user';
import { BasicInfoForm } from './CreateUserForms/BasicInfoForm';
import { MembershipForm } from './CreateUserForms/MembershipForm';
import { ExtendedProfileForm } from './CreateUserForms/ExtendedProfileForm';
import { ReviewForm } from './CreateUserForms/ReviewForm';

interface CreateUserModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminUserId: string;
}

export function CreateUserModal({
  opened,
  onClose,
  onSuccess,
  adminUserId,
}: CreateUserModalProps) {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const form = useForm<AdminCreateUserData>({
    initialValues: {
      email: '',
      firstName: '',
      lastName: '',
      postalCode: '',
      birthDate: '',
      phone: '',
      planId: '',
      paymentStatus: 'paid' as PaymentStatus,
      startDate: new Date().toISOString().split('T')[0],
      autoRenew: false,
      tags: [] as MemberTag[],
      isAccountBlocked: false,
      isCardBlocked: false,
      qrCode: '',
      extendedProfile: undefined,
      adminNotes: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email invalide'),
      firstName: (value) => (value.trim() ? null : 'Le prénom est requis'),
      lastName: (value) => (value.trim() ? null : 'Le nom est requis'),
      postalCode: (value) =>
        /^\d{5}$/.test(value) ? null : 'Code postal invalide (5 chiffres)',
      birthDate: (value) => (value ? null : 'La date de naissance est requise'),
      phone: (value) =>
        /^(\+33|0)[1-9](\d{2}){4}$/.test(value.replace(/\s/g, ''))
          ? null
          : 'Numéro de téléphone invalide',
      planId: (value) => (value ? null : 'Veuillez sélectionner un plan'),
      startDate: (value) => (value ? null : 'La date de début est requise'),
    },
  });

  const nextStep = () => {
    // Valider les champs de l'étape actuelle
    const errors = form.validate();
    if (!errors.hasErrors) {
      setActive((current) => (current < 3 ? current + 1 : current));
    }
  };

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSubmit = async () => {
    const errors = form.validate();
    if (errors.hasErrors) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez corriger les erreurs dans le formulaire',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await createUserByAdmin(adminUserId, form.values);
      notifications.show({
        title: 'Succès',
        message: 'L\'utilisateur a été créé avec succès',
        color: 'green',
      });
      onSuccess();
      onClose();
      form.reset();
      setActive(0);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue lors de la création',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      form.reset();
      setActive(0);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Créer un Nouvel Utilisateur"
      size="xl"
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step label="Informations de base" description="Données personnelles">
          <BasicInfoForm form={form} />
        </Stepper.Step>

        <Stepper.Step label="Abonnement" description="Plan et paiement">
          <MembershipForm form={form} />
        </Stepper.Step>

        <Stepper.Step label="Profil étendu" description="Optionnel">
          <ExtendedProfileForm form={form} />
        </Stepper.Step>

        <Stepper.Step label="Vérification" description="Confirmer">
          <ReviewForm form={form} />
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        {active > 0 && (
          <Button variant="outline" onClick={prevStep} disabled={loading}>
            Retour
          </Button>
        )}
        {active < 3 && (
          <Button onClick={nextStep} ml="auto">
            Suivant
          </Button>
        )}
        {active === 3 && (
          <Button onClick={handleSubmit} loading={loading} ml="auto">
            Créer l'utilisateur
          </Button>
        )}
      </Group>
    </Modal>
  );
}
