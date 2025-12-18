import {
  Container,
  Title,
  Paper,
  Stack,
  Text,
  Group,
} from '@mantine/core';
import { IconShield } from '@tabler/icons-react';
import { AdminManagementPanel } from '../../components/admins';
import { MaintenanceSettingsPanel } from '../../components/settings';

export function SettingsPage() {
  return (
    <Container size="xl">
      <Stack gap="xl">
        {/* Section Mode Maintenance (visible uniquement pour DEVELOPPEUR) */}
        <MaintenanceSettingsPanel />

        {/* Section Gestion des Administrateurs */}
        <div>
          <Group gap="sm" align="center">
            <IconShield size={32} color="var(--mantine-color-indigo-6)" />
            <div>
              <Title order={1}>Gestion des Administrateurs</Title>
              <Text c="dimmed" size="sm" mt={4}>
                Créez et gérez les comptes administrateurs avec leurs rôles et permissions
              </Text>
            </div>
          </Group>
        </div>

        <Paper withBorder radius="md" shadow="sm" p="xl">
          <AdminManagementPanel />
        </Paper>
      </Stack>
    </Container>
  );
}
