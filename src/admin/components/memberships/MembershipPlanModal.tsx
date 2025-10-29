import { useEffect, useState } from 'react';
import {
  Modal,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Button,
  Stack,
  Group,
  Textarea,
  Text,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import type { MembershipPlan, MembershipPlanInput } from '../../../shared/types/membership';
import {
  createMembershipPlan,
  updateMembershipPlan,
} from '../../../shared/services/membershipService';

interface MembershipPlanModalProps {
  opened: boolean;
  onClose: () => void;
  plan?: MembershipPlan | null;
  onSuccess: () => void;
}

export function MembershipPlanModal({
  opened,
  onClose,
  plan,
  onSuccess,
}: MembershipPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  const form = useForm({
    initialValues: {
      id: '',
      name: '',
      description: '',
      price: 0,
      period: 'month' as 'month' | 'year' | 'lifetime',
      isActive: true,
      isPrimary: false,
      order: 1,
    },
    validate: {
      id: (value) => (!value ? 'L\'identifiant est requis' : null),
      name: (value) => (!value ? 'Le nom est requis' : null),
      description: (value) => (!value ? 'La description est requise' : null),
      price: (value) => (value < 0 ? 'Le prix doit être positif' : null),
    },
  });

  useEffect(() => {
    if (plan) {
      form.setValues({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        period: plan.period,
        isActive: plan.isActive,
        isPrimary: plan.isPrimary,
        order: plan.order,
      });
      setFeatures(plan.features || []);
    } else {
      form.reset();
      setFeatures([]);
    }
  }, [plan, opened]);

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values: typeof form.values) => {
    if (features.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez ajouter au moins un avantage',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const planData: MembershipPlanInput = {
        ...values,
        features,
      };

      if (plan) {
        // Mise à jour
        await updateMembershipPlan(plan.id, planData);
        notifications.show({
          title: 'Succès',
          message: 'La formule a été mise à jour',
          color: 'green',
        });
      } else {
        // Création
        await createMembershipPlan(planData);
        notifications.show({
          title: 'Succès',
          message: 'La formule a été créée',
          color: 'green',
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving membership plan:', error);
      notifications.show({
        title: 'Erreur',
        message: 'Une erreur est survenue lors de l\'enregistrement',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={plan ? 'Modifier la formule' : 'Nouvelle formule'}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Identifiant"
            placeholder="monthly, annual, etc."
            required
            disabled={!!plan}
            {...form.getInputProps('id')}
          />

          <TextInput
            label="Nom de la formule"
            placeholder="Membre Mensuel"
            required
            {...form.getInputProps('name')}
          />

          <Textarea
            label="Description"
            placeholder="Abonnement mensuel flexible"
            required
            minRows={2}
            {...form.getInputProps('description')}
          />

          <NumberInput
            label="Prix (€)"
            placeholder="15"
            required
            min={0}
            decimalScale={2}
            {...form.getInputProps('price')}
          />

          <Select
            label="Période"
            placeholder="Choisir une période"
            required
            data={[
              { value: 'month', label: 'Mensuel' },
              { value: 'year', label: 'Annuel' },
              { value: 'lifetime', label: 'À vie' },
            ]}
            {...form.getInputProps('period')}
          />

          <NumberInput
            label="Ordre d'affichage"
            placeholder="1"
            required
            min={1}
            {...form.getInputProps('order')}
          />

          <Divider />

          <div>
            <Text size="sm" fw={500} mb="xs">
              Avantages
            </Text>

            <Stack gap="xs" mb="md">
              {features.map((feature, index) => (
                <Group key={index} gap="xs">
                  <Text size="sm" style={{ flex: 1 }}>
                    • {feature}
                  </Text>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveFeature(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>

            <Group gap="xs">
              <TextInput
                placeholder="Ajouter un avantage"
                style={{ flex: 1 }}
                value={newFeature}
                onChange={(e) => setNewFeature(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
              />
              <ActionIcon
                color="blue"
                variant="filled"
                onClick={handleAddFeature}
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>
          </div>

          <Divider />

          <Switch
            label="Formule active"
            description="La formule sera visible sur le site public"
            {...form.getInputProps('isActive', { type: 'checkbox' })}
          />

          <Switch
            label="Formule recommandée"
            description="Cette formule sera mise en avant"
            {...form.getInputProps('isPrimary', { type: 'checkbox' })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" loading={loading}>
              {plan ? 'Mettre à jour' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
