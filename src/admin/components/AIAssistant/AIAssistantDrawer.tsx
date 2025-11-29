/**
 * Sidebar de l'Assistant IA
 * S'ouvre depuis la droite et pousse le contenu (pas d'overlay)
 */

import { useState, useEffect } from 'react';
import { Affix, ActionIcon, rem, Text, Paper, Box, CloseButton } from '@mantine/core';
import { IconBrain, IconX } from '@tabler/icons-react';
import { AIAssistantPanel } from './AIAssistantPanel';

interface AIAssistantDrawerProps {
  opened: boolean;
  onOpenChange: (opened: boolean) => void;
}

export function AIAssistantDrawer({ opened, onOpenChange }: AIAssistantDrawerProps) {
  const [showHelpBubble, setShowHelpBubble] = useState(false);

  // Afficher la bulle après 2 secondes si le drawer n'est pas ouvert
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!opened) {
        setShowHelpBubble(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [opened]);

  const handleOpen = () => {
    onOpenChange(true);
    setShowHelpBubble(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <>
      {/* Bouton flottant en bas à droite */}
      <Affix position={{ bottom: rem(20), right: opened ? rem(470) : rem(20) }} zIndex={100}>
        <div
          style={{
            position: 'relative',
            transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Bulle d'aide animée */}
          {showHelpBubble && !opened && (
            <Paper
              shadow="lg"
              p="md"
              radius="md"
              style={{
                position: 'absolute',
                bottom: '70px',
                right: 0,
                backgroundColor: 'white',
                minWidth: '220px',
                animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                cursor: 'pointer',
                border: '2px solid var(--mantine-color-indigo-1)',
              }}
              onClick={handleOpen}
            >
              <Text size="sm" fw={500} c="dark">
                👋 Que puis-je faire pour vous ?
              </Text>
              <div
                style={{
                  position: 'absolute',
                  bottom: '-10px',
                  right: '20px',
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '10px solid white',
                }}
              />
            </Paper>
          )}

          <ActionIcon
            size={60}
            radius="xl"
            variant="gradient"
            gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
            onClick={() => onOpenChange(!opened)}
            style={{
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(99, 102, 241, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.35)';
            }}
          >
            {/* Icône qui change selon l'état ouvert/fermé */}
            <div
              style={{
                position: 'absolute',
                transition: 'all 0.3s ease',
                opacity: opened ? 0 : 1,
                transform: opened ? 'rotate(-180deg) scale(0.5)' : 'rotate(0deg) scale(1)',
              }}
            >
              <IconBrain size={32} stroke={2} />
            </div>
            <div
              style={{
                position: 'absolute',
                transition: 'all 0.3s ease',
                opacity: opened ? 1 : 0,
                transform: opened ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(0.5)',
              }}
            >
              <IconX size={32} stroke={2} />
            </div>
            {/* Pulse animation */}
            {!opened && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.4)',
                  animation: 'pulse 2s infinite',
                  pointerEvents: 'none',
                }}
              />
            )}
          </ActionIcon>
        </div>
      </Affix>

      {/* Sidebar custom qui slide depuis la droite */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '450px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
          transform: opened ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header avec animation */}
        <Box
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--mantine-color-gray-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            opacity: opened ? 1 : 0,
            transform: opened ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
          }}
        >
          <Box style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Box
              style={{
                padding: '8px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-violet-6))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconBrain size={24} color="white" />
            </Box>
            <div>
              <Text size="lg" fw={700} c="dark">
                Guillaume
              </Text>
              <Text size="xs" c="dimmed">
                Assistant FORNAP
              </Text>
            </div>
          </Box>
          <CloseButton
            onClick={handleClose}
            size="lg"
            style={{
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          />
        </Box>

        {/* Content avec animation décalée */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            overflow: 'hidden',
            minHeight: 0,
            opacity: opened ? 1 : 0,
            transform: opened ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
          }}
        >
          <AIAssistantPanel />
        </Box>
      </Box>

      {/* Animations CSS */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(30px);
          }
          60% {
            opacity: 1;
            transform: scale(1.1) translateY(-5px);
          }
          80% {
            transform: scale(0.95) translateY(2px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}
