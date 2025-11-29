/**
 * Composant pour afficher les NavigationCards - Cartes avec bouton de navigation
 */

import { useNavigate } from 'react-router-dom';
import { Card, Text, Button, Stack, Group } from '@mantine/core';
import {
  IconArrowRight,
  IconUser,
  IconUsers,
  IconChartBar,
  IconSettings,
  IconCoin,
  IconCalendar,
} from '@tabler/icons-react';
import type { NavigationCard } from '../../../shared/types/ai';

interface NavigationCardDisplayProps {
  navigationCard: NavigationCard;
}

const ICON_MAP: Record<string, any> = {
  user: IconUser,
  users: IconUsers,
  chart: IconChartBar,
  settings: IconSettings,
  coin: IconCoin,
  calendar: IconCalendar,
  arrow: IconArrowRight,
};

export function NavigationCardDisplay({ navigationCard }: NavigationCardDisplayProps) {
  const { title, description, path, buttonLabel, icon = 'arrow' } = navigationCard;
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(path);
  };

  const NavIcon = ICON_MAP[icon] || IconArrowRight;

  return (
    <Card
      withBorder
      p="lg"
      style={{
        backgroundColor: 'var(--mantine-color-indigo-0)',
        borderColor: 'var(--mantine-color-indigo-3)',
        borderLeft: '4px solid var(--mantine-color-indigo-6)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--mantine-color-indigo-1)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--mantine-color-indigo-0)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
      onClick={handleNavigate}
    >
      <Stack gap="md">
        <Group gap="sm" justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Text size="md" fw={600} c="dark">
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </Stack>
          <NavIcon size={24} color="var(--mantine-color-indigo-6)" />
        </Group>

        <Group justify="flex-end">
          <Button
            variant="light"
            color="indigo"
            rightSection={<IconArrowRight size={18} />}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate();
            }}
          >
            {buttonLabel}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
