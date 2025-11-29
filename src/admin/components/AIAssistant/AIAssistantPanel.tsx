/**
 * Composant principal de l'Assistant IA
 * Interface de chat moderne et épurée
 */

import { useState, useRef, useEffect } from 'react';
import {
  Stack,
  TextInput,
  Button,
  ScrollArea,
  Text,
  Group,
  ActionIcon,
  Divider,
  Loader,
  Card,
  Box,
  Tooltip,
} from '@mantine/core';
import {
  IconSend,
  IconTrash,
  IconUser,
  IconBrain,
  IconCopy,
  IconCheck,
  IconSearch,
  IconDatabase,
  IconCode,
  IconSparkles,
  IconChartBar,
} from '@tabler/icons-react';
import { aiAssistant } from '../../../shared/services/ai/aiAssistantService';
import type { ChatMessage } from '../../../shared/types/ai';
import { ChartDisplay } from './ChartDisplay';
import { ActionCardDisplay } from './ActionCardDisplay';
import { NavigationCardDisplay } from './NavigationCardDisplay';

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // Focus automatique sur l'input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Envoyer le message
      await aiAssistant.chat(userMessage);

      // Mettre à jour l'historique
      setMessages(aiAssistant.getHistory());
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    aiAssistant.clearHistory();
    setMessages([]);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Messages */}
      <ScrollArea
        viewportRef={scrollAreaRef}
        style={{ flex: 1, minHeight: 0 }}
        type="auto"
      >
        <Stack gap="lg" pb="md">
          {messages.length === 0 && (
            <Box style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <IconBrain
                size={64}
                color="var(--mantine-color-indigo-5)"
                style={{ margin: '0 auto', marginBottom: '1.5rem' }}
              />
              <Text size="xl" fw={600} c="dark" mb="sm">
                Bonjour ! Je suis Guillaume 👋
              </Text>
              <Text size="sm" c="dimmed" mb="xl">
                Votre assistant intelligent FORNAP
              </Text>

              <Stack gap="sm" align="stretch">
                <Text size="sm" c="dimmed" fw={500} ta="left">
                  Exemples de questions :
                </Text>
                <SuggestionCard
                  icon={IconChartBar}
                  text="Combien d'utilisateurs actifs avons-nous ?"
                  onClick={(text) => setInput(text)}
                />
                <SuggestionCard
                  icon={IconDatabase}
                  text="Quel est le montant total des contributions ce mois ?"
                  onClick={(text) => setInput(text)}
                />
                <SuggestionCard
                  icon={IconSearch}
                  text="Montre-moi les statistiques par forfait"
                  onClick={(text) => setInput(text)}
                />
              </Stack>
            </Box>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <Box>
              <Group gap="xs" mb="xs">
                <IconBrain size={20} color="var(--mantine-color-indigo-6)" />
                <Text size="sm" fw={500} c="indigo">
                  Guillaume
                </Text>
              </Group>
              <Card
                withBorder
                p="md"
                style={{
                  backgroundColor: 'var(--mantine-color-indigo-0)',
                  borderLeft: '3px solid var(--mantine-color-indigo-5)',
                }}
              >
                <Group gap="sm">
                  <Loader size="sm" color="indigo" />
                  <Text size="sm" c="indigo.7" fw={500}>
                    Analyse de votre demande...
                  </Text>
                </Group>
              </Card>
            </Box>
          )}
        </Stack>
      </ScrollArea>

      <Divider my="md" />

      {/* Input avec bouton clear */}
      <Box>
        {messages.length > 0 && (
          <Group justify="flex-end" mb="xs">
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<IconTrash size={14} />}
              onClick={handleClear}
            >
              Effacer la conversation
            </Button>
          </Group>
        )}

        <Group gap="xs" align="flex-end">
          <TextInput
            ref={inputRef}
            flex={1}
            placeholder="Posez votre question à Guillaume..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            size="md"
            styles={{
              input: {
                borderColor: 'var(--mantine-color-indigo-3)',
                '&:focus': {
                  borderColor: 'var(--mantine-color-indigo-5)',
                },
              },
            }}
          />
          <ActionIcon
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            loading={isLoading}
            size={42}
            variant="gradient"
            gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
            aria-label="Envoyer"
          >
            <IconSend size={20} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}

/**
 * Carte de suggestion cliquable
 */
function SuggestionCard({
  icon: Icon,
  text,
  onClick,
}: {
  icon: React.ComponentType<any>;
  text: string;
  onClick: (text: string) => void;
}) {
  return (
    <Card
      withBorder
      p="md"
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--mantine-color-indigo-0)';
        e.currentTarget.style.borderColor = 'var(--mantine-color-indigo-3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
        e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
      }}
      onClick={() => onClick(text)}
    >
      <Group gap="sm">
        <Icon size={18} color="var(--mantine-color-indigo-6)" />
        <Text size="sm" c="dark">
          {text}
        </Text>
      </Group>
    </Card>
  );
}

/**
 * Composant pour une bulle de message
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const [showingSteps, setShowingSteps] = useState<number>(0);

  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  // Animation progressive des étapes (outils)
  useEffect(() => {
    if (!isUser && message.toolCalls && message.toolCalls.length > 0) {
      message.toolCalls.forEach((_, index) => {
        setTimeout(() => {
          setShowingSteps(index + 1);
        }, index * 400); // 400ms entre chaque étape
      });
    }
  }, [message, isUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Mapper les noms d'outils à des icônes et des labels jolis
  const getToolIcon = (toolName: string) => {
    // Outils utilisateurs
    if (toolName === 'get_user') return IconUser;
    if (toolName === 'list_users') return IconUser;
    if (toolName === 'get_users_count') return IconUser;
    if (toolName === 'get_user_stats') return IconChartBar;
    if (toolName === 'get_user_action_history') return IconDatabase;
    if (toolName === 'get_user_membership_history') return IconDatabase;

    // Outils de modification
    if (toolName === 'update_user') return IconCode;
    if (toolName === 'add_loyalty_points') return IconSparkles;
    if (toolName === 'toggle_account_blocked') return IconCode;

    // Outils de visualisation
    if (toolName === 'create_chart') return IconChartBar;
    if (toolName === 'create_contribution_chart') return IconChartBar;
    if (toolName === 'create_item_stats_chart') return IconChartBar;

    // Outils de contributions
    if (toolName === 'get_contribution_kpis') return IconChartBar;
    if (toolName === 'get_contribution_evolution') return IconChartBar;
    if (toolName === 'get_item_statistics') return IconChartBar;
    if (toolName === 'get_contribution_geographic_data') return IconDatabase;
    if (toolName === 'get_contributor_demographics') return IconDatabase;
    if (toolName === 'get_recent_contributions') return IconDatabase;
    if (toolName === 'get_all_contributions') return IconDatabase;

    // Outils de navigation et actions
    if (toolName === 'navigate_to_page') return IconSparkles;
    if (toolName.includes('prepare_')) return IconSparkles;

    // Autres
    if (toolName === 'web_search') return IconSearch;
    if (toolName === 'calculate_custom_stats') return IconCode;

    return IconSparkles;
  };

  const getToolLabel = (toolName: string): string => {
    const toolLabels: Record<string, string> = {
      // Outils utilisateurs
      'get_user': 'Récupération des informations utilisateur',
      'list_users': 'Consultation de la liste des utilisateurs',
      'get_users_count': 'Comptage du nombre d\'utilisateurs',
      'get_user_stats': 'Calcul des statistiques utilisateur',
      'get_user_action_history': 'Consultation de l\'historique d\'actions',
      'get_user_membership_history': 'Consultation de l\'historique d\'abonnement',

      // Outils de modification
      'update_user': 'Mise à jour des informations utilisateur',
      'add_loyalty_points': 'Ajout de points de fidélité',
      'toggle_account_blocked': 'Modification du statut du compte',

      // Outils de visualisation
      'create_chart': 'Génération du graphique',
      'create_contribution_chart': 'Création du graphique des contributions',
      'create_item_stats_chart': 'Génération des statistiques par forfait',

      // Outils de contributions
      'get_contribution_kpis': 'Calcul des indicateurs de performance',
      'get_contribution_evolution': 'Analyse de l\'évolution des contributions',
      'get_item_statistics': 'Calcul des statistiques par forfait',
      'get_contribution_geographic_data': 'Analyse de la répartition géographique',
      'get_contributor_demographics': 'Analyse démographique des contributeurs',
      'get_recent_contributions': 'Récupération des dernières contributions',
      'get_all_contributions': 'Chargement de toutes les contributions',

      // Outils plans
      'get_membership_plans': 'Consultation des plans d\'abonnement',
      'get_membership_plan_by_id': 'Récupération du plan d\'abonnement',

      // Outils de navigation et actions
      'navigate_to_page': 'Préparation de la navigation',
      'prepare_delete_user': 'Préparation de la suppression',
      'prepare_toggle_block_user': 'Préparation du blocage/déblocage',
      'prepare_add_loyalty_points': 'Préparation de l\'ajout de points',

      // Autres
      'web_search': 'Recherche sur le web',
      'calculate_custom_stats': 'Calculs statistiques personnalisés',
    };

    return toolLabels[toolName] || toolName;
  };

  return (
    <Box>
      <Group gap="xs" mb="xs">
        {isUser ? (
          <>
            <IconUser size={20} color="var(--mantine-color-gray-6)" />
            <Text size="sm" fw={500} c="dimmed">
              Vous
            </Text>
          </>
        ) : (
          <>
            <IconBrain size={20} color="var(--mantine-color-indigo-6)" />
            <Text size="sm" fw={500} c="indigo">
              Guillaume
            </Text>
          </>
        )}
        <Text size="xs" c="dimmed">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </Group>

      {/* Afficher les outils utilisés AVANT la réponse (psychologie) - progressivement */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <Stack gap="xs" mb="md">
          <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Étapes d'exécution
          </Text>
          {message.toolCalls.slice(0, showingSteps).map((toolCall, index) => {
            const ToolIcon = getToolIcon(toolCall.name);
            const label = getToolLabel(toolCall.name);

            // Vérifier le type de résultat
            const toolResult = message.toolResults?.find(r => r.toolCallId === toolCall.id);
            const hasChart = toolResult?.result?.chartType === 'chart';
            const hasActionCard = toolResult?.result?.type === 'action_card';
            const hasNavigationCard = toolResult?.result?.type === 'navigation_card';
            const isProcessing = index === showingSteps - 1 && showingSteps < message.toolCalls!.length;
            const isCompleted = index < showingSteps - 1;

            return (
              <Box key={toolCall.id}>
                <Card
                  withBorder
                  p="md"
                  style={{
                    background: isProcessing
                      ? 'linear-gradient(135deg, var(--mantine-color-indigo-0) 0%, var(--mantine-color-violet-0) 100%)'
                      : isCompleted
                      ? 'var(--mantine-color-green-0)'
                      : 'var(--mantine-color-gray-0)',
                    borderLeft: `4px solid ${
                      isProcessing
                        ? 'var(--mantine-color-indigo-5)'
                        : isCompleted
                        ? 'var(--mantine-color-green-5)'
                        : 'var(--mantine-color-gray-4)'
                    }`,
                    animation: 'slideInLeft 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isProcessing ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Group gap="sm" justify="space-between">
                    <Group gap="sm">
                      <Box
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          background: isCompleted
                            ? 'var(--mantine-color-green-1)'
                            : 'var(--mantine-color-indigo-1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ToolIcon
                          size={18}
                          color={isCompleted
                            ? 'var(--mantine-color-green-7)'
                            : 'var(--mantine-color-indigo-7)'
                          }
                        />
                      </Box>
                      <Box>
                        <Text size="sm" fw={600} c={isCompleted ? 'green.8' : 'indigo.8'}>
                          {label}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {isProcessing && 'En cours...'}
                          {isCompleted && 'Terminé'}
                        </Text>
                      </Box>
                    </Group>
                    {isProcessing && (
                      <Loader size="sm" color="indigo" />
                    )}
                    {isCompleted && (
                      <IconCheck size={20} color="var(--mantine-color-green-6)" strokeWidth={2.5} />
                    )}
                  </Group>
                </Card>

                {/* Afficher le graphique si présent */}
                {hasChart && index < showingSteps && (
                  <Box mt="xs" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <ChartDisplay chartData={toolResult.result} />
                  </Box>
                )}

                {/* Afficher l'ActionCard si présente */}
                {hasActionCard && index < showingSteps && (
                  <Box mt="xs" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <ActionCardDisplay actionCard={toolResult.result} />
                  </Box>
                )}

                {/* Afficher la NavigationCard si présente */}
                {hasNavigationCard && index < showingSteps && (
                  <Box mt="xs" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <NavigationCardDisplay navigationCard={toolResult.result} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Animations CSS supplémentaires */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

      `}</style>

      <Card
        withBorder
        p="md"
        style={{
          backgroundColor: isUser
            ? 'var(--mantine-color-blue-0)'
            : isError
            ? 'var(--mantine-color-red-0)'
            : 'var(--mantine-color-gray-0)',
          borderColor: isError
            ? 'var(--mantine-color-red-3)'
            : isUser
            ? 'var(--mantine-color-blue-2)'
            : 'var(--mantine-color-gray-3)',
          borderLeft: isError ? '4px solid var(--mantine-color-red-6)' : undefined,
          animation: isUser ? 'slideInRight 0.3s ease-out' : 'slideInLeft 0.3s ease-out',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Text
            size="sm"
            style={{ whiteSpace: 'pre-wrap', flex: 1, lineHeight: 1.6 }}
            c={isError ? 'red.7' : 'dark'}
            fw={isError ? 500 : 400}
          >
            {message.content}
          </Text>
          {!isUser && !isError && (
            <Tooltip label={copied ? 'Copié !' : 'Copier'}>
              <ActionIcon
                variant="subtle"
                size="sm"
                color={copied ? 'green' : 'gray'}
                onClick={handleCopy}
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Card>

      {/* Animations CSS */}
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </Box>
  );
}
