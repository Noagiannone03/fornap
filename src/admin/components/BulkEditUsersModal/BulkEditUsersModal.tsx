import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Stepper,
  Stack,
} from '@mantine/core';
import {
  IconFilter,
  IconUsers,
  IconSettings,
  IconCheck,
  IconPlayerPlay,
} from '@tabler/icons-react';
import type { BulkEditUsersModalProps, BulkEditWizardState } from './types';
import type { BulkEditProgress, BulkEditSession } from '../../../shared/types/bulkEdit';
import {
  getFilteredUsersForBulkEdit,
  estimateBulkEditTargets,
  executeBulkEdit,
} from '../../../shared/services/bulkEditService';

import { AdvancedFiltersStep } from './AdvancedFiltersStep';
import { UsersPreviewStep } from './UsersPreviewStep';
import { BulkActionsStep } from './BulkActionsStep';
import { ConfirmationStep } from './ConfirmationStep';
import { ProgressStep } from './ProgressStep';

const STEP_INDEXES = {
  filters: 0,
  preview: 1,
  actions: 2,
  confirmation: 3,
  progress: 4,
};

const INITIAL_STATE: BulkEditWizardState = {
  step: 'filters',
  filters: {},
  filteredUsers: [],
  selectedUserIds: [],
  excludedUserIds: [],
  operations: [],
  data: {},
  reason: '',
  isLoading: false,
  estimatedCount: 0,
};

export function BulkEditUsersModal({
  opened,
  onClose,
  onComplete,
  adminUserId,
  allTags,
  tagsConfig,
}: BulkEditUsersModalProps) {
  const [state, setState] = useState<BulkEditWizardState>(INITIAL_STATE);
  const [progress, setProgress] = useState<BulkEditProgress | null>(null);
  const [result, setResult] = useState<{
    success: number;
    errors: number;
    skipped: number;
    total: number;
    errorDetails: Array<{ userId: string; userName: string; error: string }>;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (opened) {
      setState(INITIAL_STATE);
      setProgress(null);
      setResult(null);
      setIsExecuting(false);
    }
  }, [opened]);

  // Estimate count when filters change
  useEffect(() => {
    const estimate = async () => {
      if (!opened) return;

      setState(prev => ({ ...prev, isLoading: true }));
      try {
        const count = await estimateBulkEditTargets(state.filters);
        setState(prev => ({ ...prev, estimatedCount: count, isLoading: false }));
      } catch (error) {
        console.error('Error estimating:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    const debounce = setTimeout(estimate, 300);
    return () => clearTimeout(debounce);
  }, [state.filters, opened]);

  // Load users when moving to preview
  const loadFilteredUsers = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const users = await getFilteredUsersForBulkEdit(state.filters);
      setState(prev => ({
        ...prev,
        filteredUsers: users,
        selectedUserIds: users.map(u => u.uid),
        excludedUserIds: [],
        isLoading: false,
        step: 'preview',
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.filters]);

  // Handle step changes
  const goToStep = (step: BulkEditWizardState['step']) => {
    setState(prev => ({ ...prev, step }));
  };

  // Handle filter changes
  const handleFiltersChange = (filters: BulkEditWizardState['filters']) => {
    setState(prev => ({ ...prev, filters }));
  };

  // Handle exclusion changes
  const handleExcludedChange = (excludedIds: string[]) => {
    setState(prev => ({
      ...prev,
      excludedUserIds: excludedIds,
      selectedUserIds: prev.filteredUsers
        .filter(u => !excludedIds.includes(u.uid))
        .map(u => u.uid),
    }));
  };

  // Execute bulk edit
  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress({
      current: 0,
      total: state.selectedUserIds.length,
      currentUserName: 'Initialisation...',
      success: 0,
      errors: 0,
      skipped: 0,
    });

    // Build session
    const session: BulkEditSession = {
      filters: state.filters,
      targetUserIds: state.selectedUserIds,
      operations: state.operations,
      data: state.data,
      reason: state.reason,
    };

    try {
      const execResult = await executeBulkEdit(
        session,
        adminUserId,
        (progressUpdate) => {
          setProgress(progressUpdate);
        }
      );

      setResult({
        success: execResult.success,
        errors: execResult.errors,
        skipped: execResult.skipped,
        total: execResult.total,
        errorDetails: execResult.errorDetails,
      });
    } catch (error: any) {
      setResult({
        success: 0,
        errors: state.selectedUserIds.length,
        skipped: 0,
        total: state.selectedUserIds.length,
        errorDetails: [{ userId: 'system', userName: 'Erreur systeme', error: error.message }],
      });
    } finally {
      setIsExecuting(false);
      onComplete();
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isExecuting) {
      onClose();
    }
  };

  const currentStepIndex = STEP_INDEXES[state.step];
  const targetCount = state.selectedUserIds.length;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Modification en masse des utilisateurs"
      size="xl"
      centered
      closeOnClickOutside={!isExecuting}
      closeOnEscape={!isExecuting}
    >
      <Stack gap="lg">
        {/* Stepper */}
        <Stepper
          active={currentStepIndex}
          size="sm"
          allowNextStepsSelect={false}
        >
          <Stepper.Step
            label="Filtres"
            icon={<IconFilter size={18} />}
          />
          <Stepper.Step
            label="Selection"
            icon={<IconUsers size={18} />}
          />
          <Stepper.Step
            label="Actions"
            icon={<IconSettings size={18} />}
          />
          <Stepper.Step
            label="Confirmation"
            icon={<IconCheck size={18} />}
          />
          <Stepper.Step
            label="Execution"
            icon={<IconPlayerPlay size={18} />}
          />
        </Stepper>

        {/* Content */}
        {state.step === 'filters' && (
          <AdvancedFiltersStep
            filters={state.filters}
            onFiltersChange={handleFiltersChange}
            estimatedCount={state.estimatedCount}
            isLoading={state.isLoading}
            allTags={allTags}
            onNext={loadFilteredUsers}
          />
        )}

        {state.step === 'preview' && (
          <UsersPreviewStep
            users={state.filteredUsers}
            excludedUserIds={state.excludedUserIds}
            onExcludedChange={handleExcludedChange}
            isLoading={state.isLoading}
            tagsConfig={tagsConfig}
            onPrevious={() => goToStep('filters')}
            onNext={() => goToStep('actions')}
          />
        )}

        {state.step === 'actions' && (
          <BulkActionsStep
            operations={state.operations}
            data={state.data}
            onOperationsChange={(ops) => setState(prev => ({ ...prev, operations: ops }))}
            onDataChange={(data) => setState(prev => ({ ...prev, data }))}
            allTags={allTags}
            onPrevious={() => goToStep('preview')}
            onNext={() => goToStep('confirmation')}
          />
        )}

        {state.step === 'confirmation' && (
          <ConfirmationStep
            targetCount={targetCount}
            operations={state.operations}
            data={state.data}
            reason={state.reason}
            onReasonChange={(reason) => setState(prev => ({ ...prev, reason }))}
            onPrevious={() => goToStep('actions')}
            onExecute={() => {
              goToStep('progress');
              handleExecute();
            }}
          />
        )}

        {state.step === 'progress' && (
          <ProgressStep
            progress={progress}
            result={result}
            isExecuting={isExecuting}
            onClose={handleClose}
          />
        )}
      </Stack>
    </Modal>
  );
}
