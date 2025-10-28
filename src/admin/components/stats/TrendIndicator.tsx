import { Group, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconMinus } from '@tabler/icons-react';

interface TrendIndicatorProps {
  value: number;
  suffix?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function TrendIndicator({ value, suffix = '%', size = 'sm' }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  const color = isNeutral ? 'gray' : isPositive ? 'teal' : 'red';
  const Icon = isNeutral ? IconMinus : isPositive ? IconArrowUpRight : IconArrowDownRight;

  return (
    <Group gap={4}>
      <Icon size={16} color={`var(--mantine-color-${color}-6)`} />
      <Text c={color} fw={700} size={size}>
        {Math.abs(value)}
        {suffix}
      </Text>
    </Group>
  );
}
