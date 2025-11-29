/**
 * Composant pour afficher les ActionCards - Cartes interactives avec boutons d'action
 */

import { useState } from 'react';
import { Card, Text, Group, Button, Stack, Badge, Box, Table, Modal } from '@mantine/core';
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconCheck,
  IconExclamationCircle,
  IconTrash,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconCoins,
} from '@tabler/icons-react';
import type { ActionCard, ActionCardAction } from '../../../shared/types/ai';
import { toggleAccountBlocked, addLoyaltyPoints } from '../../../shared/services/userService';

interface ActionCardDisplayProps {
  actionCard: ActionCard;
}

const ICON_MAP: Record<string, any> = {
  delete: IconTrash,
  edit: IconEdit,
  lock: IconLock,
  unlock: IconLockOpen,
  coins: IconCoins,
};

export function ActionCardDisplay({ actionCard }: ActionCardDisplayProps) {
  const { title, description, data, actions, variant = 'info' } = actionCard;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<typeof actions[0] | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Icône et couleur selon le variant
  const getVariantConfig = () => {
    switch (variant) {
      case 'warning':
        return {
          icon: IconAlertTriangle,
          color: 'orange',
          bgColor: 'var(--mantine-color-orange-0)',
          borderColor: 'var(--mantine-color-orange-3)',
        };
      case 'danger':
        return {
          icon: IconExclamationCircle,
          color: 'red',
          bgColor: 'var(--mantine-color-red-0)',
          borderColor: 'var(--mantine-color-red-3)',
        };
      case 'success':
        return {
          icon: IconCheck,
          color: 'green',
          bgColor: 'var(--mantine-color-green-0)',
          borderColor: 'var(--mantine-color-green-3)',
        };
      default:
        return {
          icon: IconInfoCircle,
          color: 'blue',
          bgColor: 'var(--mantine-color-blue-0)',
          borderColor: 'var(--mantine-color-blue-3)',
        };
    }
  };

  const config = getVariantConfig();
  const VariantIcon = config.icon;

  const handleActionClick = async (action: ActionCardAction) => {
    // Si confirmation requise, ouvrir le modal
    if (action.confirmMessage) {
      setPendingAction(action);
      setConfirmOpen(true);
      return;
    }

    // Sinon exécuter directement
    await executeAction(action);
  };

  const executeAction = async (action: ActionCardAction) => {
    setLoading(action.label);
    try {
      // Exécuter l'action selon son type
      switch (action.actionType) {
        case 'delete_user':
          // TODO: Implémenter deleteUser
          console.log('Suppression de l\'utilisateur', action.actionData.userId);
          alert('Fonctionnalité en cours de développement');
          break;

        case 'block_user':
          await toggleAccountBlocked(
            action.actionData.userId,
            action.actionData.shouldBlock,
            action.actionData.reason,
            'admin'
          );
          alert(`Utilisateur ${action.actionData.shouldBlock ? 'bloqué' : 'débloqué'} avec succès`);
          break;

        case 'add_loyalty_points':
          await addLoyaltyPoints(
            action.actionData.userId,
            action.actionData.points,
            action.actionData.reason,
            'admin'
          );
          alert(`Points ${action.actionData.points >= 0 ? 'ajoutés' : 'retirés'} avec succès`);
          break;

        default:
          console.error('Type d\'action inconnu:', action.actionType);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Erreur lors de l\'exécution de l\'action');
    } finally {
      setLoading(null);
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  return (
    <>
      <Card
        withBorder
        p="lg"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          borderLeft: `4px solid var(--mantine-color-${config.color}-6)`,
        }}
      >
        <Stack gap="md">
          {/* Header */}
          <Group gap="sm">
            <VariantIcon size={24} color={`var(--mantine-color-${config.color}-6)`} />
            <Box style={{ flex: 1 }}>
              <Text size="md" fw={600} c="dark">
                {title}
              </Text>
              {description && (
                <Text size="sm" c="dimmed" mt={4}>
                  {description}
                </Text>
              )}
            </Box>
            <Badge color={config.color} variant="light">
              Action requise
            </Badge>
          </Group>

          {/* Données à afficher */}
          {data && Object.keys(data).length > 0 && (
            <Box
              p="md"
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              <Table>
                <Table.Tbody>
                  {Object.entries(data).map(([key, value]) => (
                    <Table.Tr key={key}>
                      <Table.Td style={{ fontWeight: 500, color: 'var(--mantine-color-gray-7)' }}>
                        {formatKey(key)}
                      </Table.Td>
                      <Table.Td>{formatValue(value)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <Group gap="sm" justify="flex-end">
              {actions.map((action, index) => {
                const ActionIcon = action.icon ? ICON_MAP[action.icon] : null;
                return (
                  <Button
                    key={index}
                    color={action.color || config.color}
                    variant={action.variant || 'filled'}
                    leftSection={ActionIcon ? <ActionIcon size={18} /> : null}
                    onClick={() => handleActionClick(action)}
                    loading={loading === action.label}
                    disabled={loading !== null && loading !== action.label}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </Group>
          )}
        </Stack>
      </Card>

      {/* Modal de confirmation */}
      <Modal
        opened={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingAction(null);
        }}
        title="Confirmation"
        centered
      >
        <Stack gap="md">
          <Text>{pendingAction?.confirmMessage}</Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                setConfirmOpen(false);
                setPendingAction(null);
              }}
            >
              Annuler
            </Button>
            <Button
              color="red"
              onClick={() => pendingAction && executeAction(pendingAction)}
              loading={loading !== null}
            >
              Confirmer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// Formater les clés pour l'affichage
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Formater les valeurs pour l'affichage
function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (value instanceof Date) return value.toLocaleDateString('fr-FR');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
