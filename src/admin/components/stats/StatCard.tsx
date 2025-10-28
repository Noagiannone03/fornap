import { Paper, Group, Text, ThemeIcon } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number; // Percentage change
  color?: string;
  description?: string;
}

export function StatCard({ title, value, icon, change, color = 'indigo', description }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} size="xs">
            {title}
          </Text>
          <Text fw={700} size="xl" mt="xs">
            {value}
          </Text>
          {description && (
            <Text c="dimmed" size="xs" mt={4}>
              {description}
            </Text>
          )}
        </div>
        <ThemeIcon color={color} variant="light" size="xl" radius="md">
          {icon}
        </ThemeIcon>
      </Group>

      {change !== undefined && (
        <Group mt="md" gap={4}>
          {isPositive ? (
            <IconArrowUpRight size={16} color="var(--mantine-color-teal-6)" />
          ) : (
            <IconArrowDownRight size={16} color="var(--mantine-color-red-6)" />
          )}
          <Text c={isPositive ? 'teal' : 'red'} fw={700} size="sm">
            {Math.abs(change)}%
          </Text>
          <Text c="dimmed" size="sm">
            vs mois dernier
          </Text>
        </Group>
      )}
    </Paper>
  );
}
