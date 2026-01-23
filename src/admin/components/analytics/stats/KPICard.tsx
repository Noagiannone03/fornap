import { Card, Group, Text, Stack, ThemeIcon, Badge, Box } from '@mantine/core';
import { IconArrowUp, IconArrowDown, IconMinus } from '@tabler/icons-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  trend?: {
    value: number;
    period?: string;
  };
  description?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  icon,
  color = 'indigo',
  trend,
  description,
  loading = false,
}: KPICardProps) {
  
  const getTrendIcon = () => {
    if (!trend || trend.value === 0) return <IconMinus size={14} />;
    return trend.value > 0 ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
  };

  const getTrendColor = () => {
    if (!trend || trend.value === 0) return 'gray';
    return trend.value > 0 ? 'teal' : 'red';
  };

  return (
    <Card 
      padding="lg" 
      radius="lg"
      withBorder={false} // Clean look, relying on shadow
      style={(theme) => ({
        cursor: 'default',
        backgroundColor: theme.white,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: theme.shadows.lg,
        }
      })}
    >
      <Group justify="space-between" align="flex-start" mb="xs">
        <Stack gap={4}>
            <Text size="sm" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                {title}
            </Text>
            <Text size="2rem" fw={800} c="dark.8" lh={1.1}>
                {loading ? '...' : value}
            </Text>
        </Stack>
        
        <ThemeIcon 
            color={color} 
            variant="light" 
            size={56} 
            radius="md"
            style={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s',
            }}
        >
            {icon}
        </ThemeIcon>
      </Group>

      {(trend || description) && (
        <Group gap="xs" align="center" mt="md">
          {trend && (
            <Badge 
              color={getTrendColor()} 
              variant="light" 
              size="md" 
              radius="sm"
              leftSection={getTrendIcon()}
              styles={{ root: { textTransform: 'none' } }}
            >
              {Math.abs(trend.value).toFixed(1)}%
            </Badge>
          )}
          
          {(description || (trend && trend.period)) && (
            <Text size="sm" c="dimmed">
              {trend ? trend.period : description}
            </Text>
          )}
        </Group>
      )}
    </Card>
  );
}
