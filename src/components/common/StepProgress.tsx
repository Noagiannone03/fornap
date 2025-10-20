import { Group, Box } from '@mantine/core';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const StepProgress = ({
  currentStep,
  totalSteps,
}: StepProgressProps) => {
  return (
    <Group justify="center" gap="sm" mb="xl">
      {Array.from({ length: totalSteps - 1 }).map((_, index) => (
        <Box
          key={index}
          style={{
            width: index === currentStep - 1 ? '48px' : '12px',
            height: '12px',
            borderRadius: '6px',
            background: index < currentStep ? '#000' : '#e9ecef',
            border: index === currentStep - 1 ? '2px solid #000' : 'none',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: index === currentStep - 1 ? 'scale(1.1)' : 'scale(1)',
          }}
        />
      ))}
    </Group>
  );
};
