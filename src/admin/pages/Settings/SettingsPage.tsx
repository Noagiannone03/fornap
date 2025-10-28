import {
  Container,
  Title,
  Paper,
  Tabs,
  TextInput,
  Button,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconSettings, IconUser, IconBell, IconShield } from '@tabler/icons-react';

export function SettingsPage() {
  return (
    <Container size="md">
      <Title order={1} mb="xl">
        Paramètres
      </Title>

      <Paper withBorder radius="md" shadow="sm">
        <Tabs defaultValue="general" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="general" leftSection={<IconSettings size={16} />}>
              Général
            </Tabs.Tab>
            <Tabs.Tab value="admins" leftSection={<IconUser size={16} />}>
              Administrateurs
            </Tabs.Tab>
            <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
              Notifications
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
              Sécurité
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="general" p="md">
            <Stack gap="md">
              <TextInput label="Nom du site" placeholder="FORNAP" />
              <TextInput label="Email de contact" placeholder="contact@fornap.com" />
              <TextInput
                label="ID Google Analytics"
                placeholder="G-XXXXXXXXXX"
                description="Entrez votre ID de suivi Google Analytics"
              />
              <Button>Enregistrer</Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="admins" p="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Gérer les utilisateurs administrateurs
              </Text>
              <Button>Ajouter un administrateur</Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="notifications" p="md">
            <Stack gap="md">
              <Switch
                label="Notifications par email"
                description="Recevoir des notifications par email"
              />
              <Switch
                label="Nouveaux membres"
                description="Être notifié lors de nouvelles inscriptions"
              />
              <Switch
                label="Nouveaux événements"
                description="Être notifié lors de la création d'événements"
              />
              <Button>Enregistrer</Button>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="security" p="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Paramètres de sécurité
              </Text>
              <Switch
                label="Authentification à deux facteurs"
                description="Activer 2FA pour plus de sécurité"
              />
              <Button>Enregistrer</Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}
