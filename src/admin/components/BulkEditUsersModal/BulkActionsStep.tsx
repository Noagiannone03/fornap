import { useState } from 'react';
import {
  Stack,
  Text,
  Group,
  Paper,
  Switch,
  Select,
  MultiSelect,
  NumberInput,
  TextInput,
  Tabs,
  Divider,
  Button,
  Alert,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCreditCard,
  IconTags,
  IconCalendar,
  IconStar,
  IconLock,
  IconAlertCircle,
} from '@tabler/icons-react';
import type { BulkActionsStepProps } from './types';
import type { BulkEditOperationType } from '../../../shared/types/bulkEdit';
import type { MembershipType, MembershipStatus } from '../../../shared/types/user';
import {
  MEMBERSHIP_TYPE_LABELS,
  MEMBERSHIP_STATUS_LABELS,
} from '../../../shared/types/user';

export function BulkActionsStep({
  operations,
  data,
  onOperationsChange,
  onDataChange,
  allTags,
  onPrevious,
  onNext,
}: BulkActionsStepProps) {
  const [tagsMode, setTagsMode] = useState<'add' | 'remove' | 'replace'>('add');

  const isOperationActive = (op: BulkEditOperationType) => operations.includes(op);

  const toggleOperation = (op: BulkEditOperationType, enabled: boolean) => {
    if (enabled) {
      onOperationsChange([...operations, op]);
    } else {
      onOperationsChange(operations.filter((o) => o !== op));
      // Nettoyer les donnees associees
      const newData = { ...data };
      switch (op) {
        case 'changeMembershipType':
          delete newData.membershipType;
          break;
        case 'changeMembershipStatus':
          delete newData.membershipStatus;
          break;
        case 'addTags':
          delete newData.tagsToAdd;
          break;
        case 'removeTags':
          delete newData.tagsToRemove;
          break;
        case 'replaceTags':
          delete newData.tagsToReplace;
          break;
        case 'updateStartDate':
          delete newData.startDate;
          break;
        case 'updateExpiryDate':
          delete newData.expiryDate;
          break;
        case 'addLoyaltyPoints':
          delete newData.loyaltyPointsToAdd;
          break;
        case 'setLoyaltyPoints':
          delete newData.loyaltyPointsToSet;
          break;
        case 'blockAccounts':
        case 'unblockAccounts':
        case 'blockCards':
        case 'unblockCards':
          delete newData.blockReason;
          break;
      }
      onDataChange(newData);
    }
  };

  const hasActiveOperations = operations.length > 0;

  return (
    <Stack gap="md">
      <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          Selectionnez les modifications a appliquer en masse. Au moins une operation doit etre activee.
        </Text>
      </Alert>

      {/* Abonnement */}
      <Paper p="md" withBorder>
        <Group mb="md">
          <IconCreditCard size={20} />
          <Text fw={600}>Abonnement</Text>
        </Group>

        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Changer le type d'abonnement</Text>
              <Text size="xs" c="dimmed">Modifier le type (mensuel, annuel, a vie)</Text>
            </div>
            <Switch
              checked={isOperationActive('changeMembershipType')}
              onChange={(e) => toggleOperation('changeMembershipType', e.currentTarget.checked)}
            />
          </Group>
          {isOperationActive('changeMembershipType') && (
            <Select
              label="Nouveau type d'abonnement"
              placeholder="Selectionner..."
              data={Object.entries(MEMBERSHIP_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={data.membershipType || null}
              onChange={(value) => onDataChange({ ...data, membershipType: value as MembershipType || undefined })}
              required
            />
          )}

          <Divider />

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Changer le statut d'abonnement</Text>
              <Text size="xs" c="dimmed">Modifier le statut (actif, expire, en attente)</Text>
            </div>
            <Switch
              checked={isOperationActive('changeMembershipStatus')}
              onChange={(e) => toggleOperation('changeMembershipStatus', e.currentTarget.checked)}
            />
          </Group>
          {isOperationActive('changeMembershipStatus') && (
            <Select
              label="Nouveau statut d'abonnement"
              placeholder="Selectionner..."
              data={Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={data.membershipStatus || null}
              onChange={(value) => onDataChange({ ...data, membershipStatus: value as MembershipStatus || undefined })}
              required
            />
          )}
        </Stack>
      </Paper>

      {/* Tags */}
      <Paper p="md" withBorder>
        <Group mb="md">
          <IconTags size={20} />
          <Text fw={600}>Tags</Text>
        </Group>

        <Tabs value={tagsMode} onChange={(v) => setTagsMode(v as any)}>
          <Tabs.List>
            <Tabs.Tab value="add">Ajouter</Tabs.Tab>
            <Tabs.Tab value="remove">Retirer</Tabs.Tab>
            <Tabs.Tab value="replace">Remplacer</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="add" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={500}>Ajouter des tags</Text>
                  <Text size="xs" c="dimmed">Les tags seront ajoutes aux tags existants</Text>
                </div>
                <Switch
                  checked={isOperationActive('addTags')}
                  onChange={(e) => toggleOperation('addTags', e.currentTarget.checked)}
                />
              </Group>
              {isOperationActive('addTags') && (
                <MultiSelect
                  label="Tags a ajouter"
                  placeholder="Selectionner..."
                  data={allTags}
                  value={data.tagsToAdd || []}
                  onChange={(value) => onDataChange({ ...data, tagsToAdd: value.length > 0 ? value : undefined })}
                  searchable
                />
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="remove" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={500}>Retirer des tags</Text>
                  <Text size="xs" c="dimmed">Les tags seront retires des utilisateurs</Text>
                </div>
                <Switch
                  checked={isOperationActive('removeTags')}
                  onChange={(e) => toggleOperation('removeTags', e.currentTarget.checked)}
                />
              </Group>
              {isOperationActive('removeTags') && (
                <MultiSelect
                  label="Tags a retirer"
                  placeholder="Selectionner..."
                  data={allTags}
                  value={data.tagsToRemove || []}
                  onChange={(value) => onDataChange({ ...data, tagsToRemove: value.length > 0 ? value : undefined })}
                  searchable
                />
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="replace" pt="md">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={500}>Remplacer les tags</Text>
                  <Text size="xs" c="dimmed">Tous les tags existants seront remplaces</Text>
                </div>
                <Switch
                  checked={isOperationActive('replaceTags')}
                  onChange={(e) => toggleOperation('replaceTags', e.currentTarget.checked)}
                />
              </Group>
              {isOperationActive('replaceTags') && (
                <MultiSelect
                  label="Nouveaux tags"
                  placeholder="Selectionner..."
                  data={allTags}
                  value={data.tagsToReplace || []}
                  onChange={(value) => onDataChange({ ...data, tagsToReplace: value })}
                  searchable
                />
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* Dates */}
      <Paper p="md" withBorder>
        <Group mb="md">
          <IconCalendar size={20} />
          <Text fw={600}>Dates</Text>
        </Group>

        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Modifier la date de debut</Text>
              <Text size="xs" c="dimmed">Changer la date de debut d'abonnement</Text>
            </div>
            <Switch
              checked={isOperationActive('updateStartDate')}
              onChange={(e) => toggleOperation('updateStartDate', e.currentTarget.checked)}
            />
          </Group>
          {isOperationActive('updateStartDate') && (
            <DatePickerInput
              label="Nouvelle date de debut"
              placeholder="Selectionner..."
              value={data.startDate ?? null}
              onChange={(value) => {
                const date = typeof value === 'string' && value ? new Date(value) : value as Date | null;
                onDataChange({ ...data, startDate: date ?? undefined });
              }}
              required
            />
          )}

          <Divider />

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Modifier la date d'expiration</Text>
              <Text size="xs" c="dimmed">Changer la date d'expiration d'abonnement</Text>
            </div>
            <Switch
              checked={isOperationActive('updateExpiryDate')}
              onChange={(e) => toggleOperation('updateExpiryDate', e.currentTarget.checked)}
            />
          </Group>
          {isOperationActive('updateExpiryDate') && (
            <DatePickerInput
              label="Nouvelle date d'expiration"
              placeholder="Selectionner..."
              value={data.expiryDate ?? null}
              onChange={(value) => {
                const date = typeof value === 'string' && value ? new Date(value) : value as Date | null;
                onDataChange({ ...data, expiryDate: date ?? undefined });
              }}
              required
            />
          )}
        </Stack>
      </Paper>

      {/* Points de fidelite */}
      <Paper p="md" withBorder>
        <Group mb="md">
          <IconStar size={20} />
          <Text fw={600}>Points de fidelite</Text>
        </Group>

        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Ajouter des points</Text>
              <Text size="xs" c="dimmed">Ajouter des points au solde actuel</Text>
            </div>
            <Switch
              checked={isOperationActive('addLoyaltyPoints')}
              onChange={(e) => toggleOperation('addLoyaltyPoints', e.currentTarget.checked)}
            />
          </Group>
          {isOperationActive('addLoyaltyPoints') && (
            <NumberInput
              label="Points a ajouter"
              placeholder="Ex: 100"
              value={data.loyaltyPointsToAdd}
              onChange={(value) => onDataChange({ ...data, loyaltyPointsToAdd: typeof value === 'number' ? value : undefined })}
              required
            />
          )}

          <Divider />

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Definir les points</Text>
              <Text size="xs" c="dimmed">Remplacer le solde actuel par une nouvelle valeur</Text>
            </div>
            <Switch
              checked={isOperationActive('setLoyaltyPoints')}
              onChange={(e) => toggleOperation('setLoyaltyPoints', e.currentTarget.checked)}
            />
          </Group>
          {isOperationActive('setLoyaltyPoints') && (
            <NumberInput
              label="Nouveau solde de points"
              placeholder="Ex: 0"
              min={0}
              value={data.loyaltyPointsToSet}
              onChange={(value) => onDataChange({ ...data, loyaltyPointsToSet: typeof value === 'number' ? value : undefined })}
              required
            />
          )}
        </Stack>
      </Paper>

      {/* Blocage */}
      <Paper p="md" withBorder>
        <Group mb="md">
          <IconLock size={20} />
          <Text fw={600}>Blocage</Text>
        </Group>

        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Bloquer les comptes</Text>
              <Text size="xs" c="dimmed">Empecher l'acces aux comptes</Text>
            </div>
            <Switch
              checked={isOperationActive('blockAccounts')}
              onChange={(e) => {
                toggleOperation('blockAccounts', e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  toggleOperation('unblockAccounts', false);
                }
              }}
            />
          </Group>

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Debloquer les comptes</Text>
              <Text size="xs" c="dimmed">Restaurer l'acces aux comptes</Text>
            </div>
            <Switch
              checked={isOperationActive('unblockAccounts')}
              onChange={(e) => {
                toggleOperation('unblockAccounts', e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  toggleOperation('blockAccounts', false);
                }
              }}
            />
          </Group>

          <Divider />

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Bloquer les cartes</Text>
              <Text size="xs" c="dimmed">Bloquer les cartes d'adherent</Text>
            </div>
            <Switch
              checked={isOperationActive('blockCards')}
              onChange={(e) => {
                toggleOperation('blockCards', e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  toggleOperation('unblockCards', false);
                }
              }}
            />
          </Group>

          <Group justify="space-between">
            <div>
              <Text size="sm" fw={500}>Debloquer les cartes</Text>
              <Text size="xs" c="dimmed">Restaurer l'acces aux cartes</Text>
            </div>
            <Switch
              checked={isOperationActive('unblockCards')}
              onChange={(e) => {
                toggleOperation('unblockCards', e.currentTarget.checked);
                if (e.currentTarget.checked) {
                  toggleOperation('blockCards', false);
                }
              }}
            />
          </Group>

          {(isOperationActive('blockAccounts') || isOperationActive('blockCards')) && (
            <>
              <Divider />
              <TextInput
                label="Raison du blocage"
                placeholder="Ex: Violation des conditions d'utilisation"
                value={data.blockReason || ''}
                onChange={(e) => onDataChange({ ...data, blockReason: e.currentTarget.value || undefined })}
              />
            </>
          )}
        </Stack>
      </Paper>

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
          rightSection={<IconArrowRight size={16} />}
          onClick={onNext}
          disabled={!hasActiveOperations}
        >
          Confirmer
        </Button>
      </Group>
    </Stack>
  );
}
