/**
 * Sidebar de l'Assistant IA
 * S'ouvre depuis la droite et pousse le contenu (pas d'overlay)
 */

import { useState, useEffect } from 'react';
import { Affix, ActionIcon, rem, Text, Paper, Box, CloseButton } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';
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
        <div style={{ position: 'relative', transition: 'right 0.3s ease' }}>
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
                minWidth: '200px',
                animation: 'bounceIn 0.5s ease-out',
                cursor: 'pointer',
              }}
              onClick={handleOpen}
            >
              <Text size="sm" fw={500} c="dark">
                Que puis-je faire pour vous ?
              </Text>
              <div
                style={{
                  position: 'absolute',
                  bottom: '-8px',
                  right: '20px',
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid white',
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
              transition: 'all 0.3s ease',
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
            <IconBrain size={32} stroke={2} />
            {/* Pulse animation */}
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
          </ActionIcon>
        </div>
      </Affix>

      {/* Sidebar custom qui pousse le contenu */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          right: opened ? 0 : '-450px',
          width: '450px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: opened ? '-4px 0 20px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'right 0.3s ease',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--mantine-color-gray-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <IconBrain size={28} color="var(--mantine-color-indigo-6)" />
            <div>
              <Text size="lg" fw={700} c="dark">
                Guillaume
              </Text>
              <Text size="xs" c="dimmed">
                Assistant FORNAP
              </Text>
            </div>
          </Box>
          <CloseButton onClick={handleClose} size="lg" />
        </Box>

        {/* Content */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            overflow: 'hidden',
            minHeight: 0,
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
            transform: scale(1.3);
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
            transform: scale(0.3) translateY(20px);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}
