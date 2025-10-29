import { Card, Group, Text, Stack, ThemeIcon, Box } from '@mantine/core';
import { IconArrowUp, IconArrowDown, IconMinus } from '@tabler/icons-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  trend?: {
    value: number; // Pourcentage de changement
    period?: string; // ex: "vs mois dernier"
  };
  description?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  description,
  loading = false,
}: KPICardProps) {
  // Déterminer l'icône et la couleur de tendance
  const getTrendIcon = () => {
    if (!trend || trend.value === 0) {
      return <IconMinus size={14} />;
    }
    return trend.value > 0 ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
  };

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return 'gray';
    return trend.value > 0 ? 'green' : 'red';
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed" fw={500}>
            {title}
          </Text>
          <ThemeIcon color={color} variant="light" size="lg" radius="md">
            {icon}
          </ThemeIcon>
        </Group>

        <Box>
          <Text size="2rem" fw={700} c={color}>
            {loading ? '...' : value}
          </Text>

          {description && (
            <Text size="xs" c="dimmed" mt={4}>
              {description}
            </Text>
          )}

          {trend && (
            <Group gap="xs" mt="sm">
              <Group gap={4}>
                <ThemeIcon
                  size="sm"
                  variant="light"
                  color={getTrendColor()}
                  radius="xl"
                >
                  {getTrendIcon()}
                </ThemeIcon>
                <Text
                  size="sm"
                  fw={600}
                  c={getTrendColor()}
                >
                  {Math.abs(trend.value).toFixed(1)}%
                </Text>
              </Group>
              {trend.period && (
                <Text size="xs" c="dimmed">
                  {trend.period}
                </Text>
              )}
            </Group>
          )}
        </Box>
      </Stack>
    </Card>
  );
}
