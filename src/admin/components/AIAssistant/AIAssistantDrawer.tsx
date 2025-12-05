/**
 * Sidebar de l'Assistant IA
 * S'ouvre depuis la droite et pousse le contenu (pas d'overlay)
 */

import { useState, useEffect } from 'react';
import { Text, Paper, Box, CloseButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconBrain } from '@tabler/icons-react';
import { AIAssistantPanel } from './AIAssistantPanel';

interface AIAssistantDrawerProps {
  opened: boolean;
  onOpenChange: (opened: boolean) => void;
}

export function AIAssistantDrawer({ opened, onOpenChange }: AIAssistantDrawerProps) {
  const [showHelpBubble, setShowHelpBubble] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Afficher la bulle après 2 secondes si le drawer n'est pas ouvert
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!opened) {
        setShowHelpBubble(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [opened]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <>
      {/* Languette sur le côté droit */}
      <div
        style={{
          position: 'fixed',
          right: opened ? (isMobile ? '0' : isTablet ? '350px' : '450px') : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 101,
          transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Languette principale */}
        <div
          onClick={() => onOpenChange(!opened)}
          onMouseEnter={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateX(-10px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isMobile) {
              e.currentTarget.style.transform = 'translateX(0)';
            }
          }}
          style={{
            position: 'relative',
            right: opened ? '0' : '-10px',
            background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-violet-6))',
            borderRadius: '12px 0 0 12px',
            padding: isMobile ? '20px 10px' : '24px 12px',
            cursor: 'pointer',
            boxShadow: '-4px 4px 20px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            minHeight: '140px',
            justifyContent: 'center',
          }}
        >
          {/* Icône */}
          <div
            style={{
              transition: 'all 0.3s ease',
              transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <IconBrain size={isMobile ? 24 : 28} color="white" stroke={2} />
          </div>

          {/* Texte vertical */}
          <div
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              color: 'white',
              fontWeight: 700,
              fontSize: isMobile ? '12px' : '14px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            {opened ? 'Fermer' : 'Assistant IA'}
          </div>

          {/* Pulse animation */}
          {!opened && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                borderRadius: '12px 0 0 12px',
                background: 'rgba(255, 255, 255, 0.2)',
                animation: 'pulseTab 2s infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Indicateur de notification */}
          {showHelpBubble && !opened && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#f03e3e',
                border: '2px solid white',
                animation: 'blink 1.5s infinite',
              }}
            />
          )}
        </div>

        {/* Tooltip au hover (seulement sur desktop) */}
        {!isMobile && !opened && (
          <div
            style={{
              position: 'absolute',
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%) translateX(-8px)',
              marginRight: '8px',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease',
            }}
            className="ai-tab-tooltip"
          >
            <Paper
              shadow="lg"
              p="sm"
              radius="md"
              style={{
                backgroundColor: 'white',
                minWidth: '180px',
                border: '2px solid var(--mantine-color-indigo-2)',
              }}
            >
              <Text size="sm" fw={500} c="dark">
                👋 Besoin d'aide ?
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Cliquez pour ouvrir l'assistant
              </Text>
            </Paper>
          </div>
        )}
      </div>

      {/* Sidebar custom qui slide depuis la droite */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: isMobile ? '100vw' : isTablet ? '350px' : '450px',
          height: '100vh',
          backgroundColor: 'white',
          boxShadow: isMobile ? 'none' : '-4px 0 24px rgba(0, 0, 0, 0.12)',
          transform: opened ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: isMobile ? 200 : 99,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header avec animation */}
        <Box
          style={{
            padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
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
          <Box style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.75rem' }}>
            <Box
              style={{
                padding: isMobile ? '6px' : '8px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--mantine-color-indigo-6), var(--mantine-color-violet-6))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconBrain size={isMobile ? 20 : 24} color="white" />
            </Box>
            <div>
              <Text size={isMobile ? "md" : "lg"} fw={700} c="dark">
                Guillaume
              </Text>
              <Text size="xs" c="dimmed">
                Assistant FORNAP
              </Text>
            </div>
          </Box>
          <CloseButton
            onClick={handleClose}
            size={isMobile ? "md" : "lg"}
            style={{
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'rotate(90deg)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = 'rotate(0deg)';
              }
            }}
          />
        </Box>

        {/* Content avec animation décalée */}
        <Box
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: isMobile ? '0.75rem' : '1rem',
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
        @keyframes pulseTab {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 0.5;
          }
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        /* Afficher le tooltip au hover de la languette */
        [style*="position: fixed"] > div:hover + .ai-tab-tooltip,
        .ai-tab-tooltip:hover {
          opacity: 1 !important;
          pointer-events: auto !important;
        }
      `}</style>
    </>
  );
}
