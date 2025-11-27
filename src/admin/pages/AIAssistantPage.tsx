/**
 * Page dédiée à l'Assistant IA dans le panel admin
 */

import { Container, Title, Text, Stack, Grid, Card, Badge, List, ThemeIcon, Group } from '@mantine/core';
import { IconTool, IconShieldCheck } from '@tabler/icons-react';
import { AIAssistantPanel } from '../components/AIAssistant/AIAssistantPanel';

export function AIAssistantPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="xs">
            Assistant IA
          </Title>
          <Text c="dimmed" size="lg">
            Votre assistant intelligent pour gérer et analyser les données FORNAP
          </Text>
        </div>

        <Grid>
          {/* Chat Panel - Prend la majorité de l'espace */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <div style={{ height: '70vh' }}>
              <AIAssistantPanel />
            </div>
          </Grid.Col>

          {/* Informations et Capacités */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              {/* Capacités */}
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Capacités de l'IA
                </Title>
                <List
                  spacing="xs"
                  size="sm"
                  icon={
                    <ThemeIcon color="blue" size={20} radius="xl">
                      <IconTool size={12} />
                    </ThemeIcon>
                  }
                >
                  <List.Item>
                    <div>
                      <Text size="sm" fw={600}>
                        Gestion des utilisateurs
                      </Text>
                      <Text size="xs" c="dimmed">
                        Consulter, modifier, bloquer/débloquer
                      </Text>
                    </div>
                  </List.Item>
                  <List.Item>
                    <div>
                      <Text size="sm" fw={600}>
                        Analytics avancés
                      </Text>
                      <Text size="xs" c="dimmed">
                        KPIs, évolution, statistiques
                      </Text>
                    </div>
                  </List.Item>
                  <List.Item>
                    <div>
                      <Text size="sm" fw={600}>
                        Recherche web
                      </Text>
                      <Text size="xs" c="dimmed">
                        Informations externes via DuckDuckGo
                      </Text>
                    </div>
                  </List.Item>
                  <List.Item>
                    <div>
                      <Text size="sm" fw={600}>
                        Calculs personnalisés
                      </Text>
                      <Text size="xs" c="dimmed">
                        Analyses statistiques avancées
                      </Text>
                    </div>
                  </List.Item>
                </List>
              </Card>

              {/* Sécurité */}
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Sécurité & Confidentialité
                </Title>
                <List
                  spacing="xs"
                  size="sm"
                  icon={
                    <ThemeIcon color="green" size={20} radius="xl">
                      <IconShieldCheck size={12} />
                    </ThemeIcon>
                  }
                >
                  <List.Item>
                    <Text size="xs">
                      L'IA demande confirmation avant toute modification
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text size="xs">
                      Toutes les actions sont tracées dans l'historique
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text size="xs">
                      Respect de la confidentialité des données personnelles
                    </Text>
                  </List.Item>
                  <List.Item>
                    <Text size="xs">
                      Modèle open-source Llama 3.3 70B gratuit
                    </Text>
                  </List.Item>
                </List>
              </Card>

              {/* Exemples de requêtes */}
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Exemples de requêtes
                </Title>
                <Stack gap="xs">
                  <Card withBorder p="xs" bg="blue.0">
                    <Text size="xs" fw={500} c="blue">
                      "Combien d'utilisateurs ont un abonnement actif ?"
                    </Text>
                  </Card>
                  <Card withBorder p="xs" bg="green.0">
                    <Text size="xs" fw={500} c="green">
                      "Quel est le montant total des contributions ce mois ?"
                    </Text>
                  </Card>
                  <Card withBorder p="xs" bg="orange.0">
                    <Text size="xs" fw={500} c="orange">
                      "Montre-moi les 10 derniers utilisateurs créés"
                    </Text>
                  </Card>
                  <Card withBorder p="xs" bg="grape.0">
                    <Text size="xs" fw={500} c="grape">
                      "Quelle est la tranche d'âge la plus représentée ?"
                    </Text>
                  </Card>
                  <Card withBorder p="xs" bg="pink.0">
                    <Text size="xs" fw={500} c="pink">
                      "Recherche des informations sur Firebase Analytics"
                    </Text>
                  </Card>
                </Stack>
              </Card>

              {/* Statistiques du modèle */}
              <Card withBorder p="md">
                <Title order={4} mb="md">
                  Modèle IA
                </Title>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Modèle
                    </Text>
                    <Badge color="blue" variant="light">
                      Llama 3.3 70B
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Provider
                    </Text>
                    <Badge color="green" variant="light">
                      OpenRouter
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Coût
                    </Text>
                    <Badge color="teal" variant="light">
                      Gratuit
                    </Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Context Window
                    </Text>
                    <Badge color="violet" variant="light">
                      128k tokens
                    </Badge>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
