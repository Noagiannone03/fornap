import {
  Container,
  Title,
  Text,
  Tabs,
  Stack,
  Group,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  IconSettings,
  IconKey,
  IconShield,
  IconTool,
} from '@tabler/icons-react';
import { AdminManagementPanel } from '../../components/admins';
import { MaintenanceSettingsPanel, ChangePasswordPanel } from '../../components/settings';
import { useAdminAuth } from '../../../shared/contexts/AdminAuthContext';
import { AdminRole } from '../../../shared/types/admin';

export function SettingsPage() {
  const { adminProfile } = useAdminAuth();
  const isDeveloppeur = adminProfile?.role === AdminRole.DEVELOPPEUR;

  return (
    <Container size="xl" py="xl">
      {/* Header */}
      <Group gap="md" mb="xl">
        <ThemeIcon size={56} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
          <IconSettings size={32} />
        </ThemeIcon>
        <div>
          <Title order={1}>Parametres</Title>
          <Text c="dimmed" size="md">
            Gerez vos preferences, la securite et l'administration du panel
          </Text>
        </div>
      </Group>

      {/* Tabs */}
      <Tabs defaultValue="security" variant="outline" radius="md">
        <Tabs.List mb="lg">
          <Tabs.Tab value="security" leftSection={<IconKey size={16} />}>
            Securite
          </Tabs.Tab>
          <Tabs.Tab value="admins" leftSection={<IconShield size={16} />}>
            Administrateurs
          </Tabs.Tab>
          {isDeveloppeur && (
            <Tabs.Tab value="system" leftSection={<IconTool size={16} />}>
              Systeme
            </Tabs.Tab>
          )}
        </Tabs.List>

        {/* Tab: Securite */}
        <Tabs.Panel value="security">
          <Stack gap="lg">
            <Paper withBorder p="lg" radius="md">
              <Group gap="sm" mb="md">
                <IconKey size={24} color="var(--mantine-color-indigo-6)" />
                <div>
                  <Title order={3}>Mot de passe</Title>
                  <Text size="sm" c="dimmed">
                    Modifiez le mot de passe de votre compte administrateur
                  </Text>
                </div>
              </Group>
              <ChangePasswordPanel />
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Tab: Administrateurs */}
        <Tabs.Panel value="admins">
          <Stack gap="lg">
            <Paper withBorder p="lg" radius="md">
              <Group gap="sm" mb="md">
                <IconShield size={24} color="var(--mantine-color-indigo-6)" />
                <div>
                  <Title order={3}>Gestion des Administrateurs</Title>
                  <Text size="sm" c="dimmed">
                    Creez et gerez les comptes administrateurs avec leurs roles et permissions
                  </Text>
                </div>
              </Group>
              <AdminManagementPanel />
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Tab: Systeme (Dev only) */}
        {isDeveloppeur && (
          <Tabs.Panel value="system">
            <Stack gap="lg">
              <MaintenanceSettingsPanel />
            </Stack>
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  );
}
