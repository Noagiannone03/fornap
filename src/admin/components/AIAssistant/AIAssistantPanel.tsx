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
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderColor: 'var(--mantine-color-indigo-2)',
                }}
              >
                <Group gap="sm">
                  <Loader size="sm" color="indigo" />
                  <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
                    Je réfléchis...
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
    if (toolName.includes('search') || toolName.includes('query')) return IconSearch;
    if (toolName.includes('database') || toolName.includes('firestore')) return IconDatabase;
    if (toolName.includes('code') || toolName.includes('execute')) return IconCode;
    if (toolName.includes('chart') || toolName.includes('graph')) return IconChartBar;
    return IconSparkles;
  };

  const getToolLabel = (toolName: string) => {
    if (toolName.includes('search')) return 'Recherche dans les données';
    if (toolName.includes('database') || toolName.includes('firestore')) return 'Consultation de la base';
    if (toolName.includes('query')) return 'Analyse des informations';
    if (toolName.includes('code')) return 'Calculs en cours';
    if (toolName.includes('chart') || toolName.includes('graph')) return 'Génération de graphique';
    return toolName;
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
          {message.toolCalls.slice(0, showingSteps).map((toolCall, index) => {
            const ToolIcon = getToolIcon(toolCall.name);
            const label = getToolLabel(toolCall.name);

            // Vérifier le type de résultat
            const toolResult = message.toolResults?.find(r => r.toolCallId === toolCall.id);
            const hasChart = toolResult?.result?.chartType === 'chart';
            const hasActionCard = toolResult?.result?.type === 'action_card';
            const hasNavigationCard = toolResult?.result?.type === 'navigation_card';

            return (
              <Box key={toolCall.id}>
                <Card
                  withBorder
                  p="sm"
                  bg="var(--mantine-color-indigo-0)"
                  style={{
                    borderLeft: '3px solid var(--mantine-color-indigo-5)',
                    animation: 'slideInLeft 0.3s ease-out',
                  }}
                >
                  <Group gap="xs" justify="space-between">
                    <Group gap="xs">
                      <ToolIcon size={18} color="var(--mantine-color-indigo-7)" />
                      <Text size="xs" fw={500} c="indigo.7">
                        {label}
                      </Text>
                    </Group>
                    {index === showingSteps - 1 && showingSteps < message.toolCalls!.length && (
                      <Loader size="xs" color="indigo" />
                    )}
                    {index < showingSteps - 1 && <IconCheck size={16} color="var(--mantine-color-green-6)" />}
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
