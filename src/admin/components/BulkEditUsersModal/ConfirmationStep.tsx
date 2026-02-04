import {
  Stack,
  Text,
  Paper,
  TextInput,
  Button,
  Group,
  Alert,
  List,
  Badge,
  Divider,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconAlertTriangle,
  IconUsers,
} from '@tabler/icons-react';
import type { ConfirmationStepProps } from './types';
import { OPERATION_LABELS } from './types';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
} from '../../../shared/types/user';
import type { MembershipType, MembershipStatus } from '../../../shared/types/user';

export function ConfirmationStep({
  targetCount,
  operations,
  data,
  reason,
  onReasonChange,
  onPrevious,
  onExecute,
}: ConfirmationStepProps) {
  const canExecute = reason.trim().length >= 5;

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '-';
    return date.toLocaleDateString('fr-FR');
  };

  const getOperationDetails = (op: string): string => {
    switch (op) {
      case 'changeMembershipType':
        return data.membershipType
          ? `Nouveau type: ${MEMBERSHIP_TYPE_LABELS[data.membershipType as MembershipType]}`
          : '';
      case 'changeMembershipStatus':
        return data.membershipStatus
          ? `Nouveau statut: ${MEMBERSHIP_STATUS_LABELS[data.membershipStatus as MembershipStatus]}`
          : '';
      case 'addTags':
        return data.tagsToAdd?.length
          ? `Tags: ${data.tagsToAdd.join(', ')}`
          : '';
      case 'removeTags':
        return data.tagsToRemove?.length
          ? `Tags: ${data.tagsToRemove.join(', ')}`
          : '';
      case 'replaceTags':
        return data.tagsToReplace?.length
          ? `Nouveaux tags: ${data.tagsToReplace.join(', ')}`
          : 'Aucun tag';
      case 'updateStartDate':
        return `Nouvelle date: ${formatDate(data.startDate)}`;
      case 'updateExpiryDate':
        return `Nouvelle date: ${formatDate(data.expiryDate)}`;
      case 'addLoyaltyPoints':
        return `+${data.loyaltyPointsToAdd} points`;
      case 'setLoyaltyPoints':
        return `${data.loyaltyPointsToSet} points`;
      case 'blockAccounts':
      case 'blockCards':
        return data.blockReason ? `Raison: ${data.blockReason}` : '';
      default:
        return '';
    }
  };

  return (
    <Stack gap="md">
      {/* Avertissement */}
      <Alert
        icon={<IconAlertTriangle size={24} />}
        color="red"
        variant="filled"
        title="Action irreversible"
      >
        <Text size="sm">
          Les modifications seront appliquees a {targetCount} utilisateur{targetCount !== 1 ? 's' : ''}.
          Cette action ne peut pas etre annulee automatiquement.
        </Text>
      </Alert>

      {/* Resume des cibles */}
      <Paper p="md" withBorder bg="blue.0">
        <Group>
          <IconUsers size={32} color="blue" />
          <div>
            <Text size="xl" fw={700} c="blue">
              {targetCount} utilisateur{targetCount !== 1 ? 's' : ''}
            </Text>
            <Text size="sm" c="dimmed">
              seront modifies
            </Text>
          </div>
        </Group>
      </Paper>

      {/* Resume des operations */}
      <Paper p="md" withBorder>
        <Text fw={600} mb="md">
          Operations a executer ({operations.length})
        </Text>
        <List spacing="sm">
          {operations.map((op) => (
            <List.Item key={op}>
              <Group gap="xs">
                <Badge color="indigo" variant="light">
                  {OPERATION_LABELS[op]}
                </Badge>
                {getOperationDetails(op) && (
                  <Text size="sm" c="dimmed">
                    - {getOperationDetails(op)}
                  </Text>
                )}
              </Group>
            </List.Item>
          ))}
        </List>
      </Paper>

      <Divider />

      {/* Raison obligatoire */}
      <TextInput
        label="Raison de la modification"
        description="Cette raison sera enregistree dans l'historique de chaque utilisateur (minimum 5 caracteres)"
        placeholder="Ex: Mise a jour annuelle des abonnements..."
        value={reason}
        onChange={(e) => onReasonChange(e.currentTarget.value)}
        required
        error={reason.length > 0 && reason.length < 5 ? 'Minimum 5 caracteres' : undefined}
        size="md"
      />

      {/* Actions */}
      <Group justify="space-between" mt="md">
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onPrevious}
        >
          Retour
        </Button>
        <Button
          color="red"
          leftSection={<IconPlayerPlay size={16} />}
          onClick={onExecute}
          disabled={!canExecute}
        >
          Executer les modifications
        </Button>
      </Group>
    </Stack>
  );
}
