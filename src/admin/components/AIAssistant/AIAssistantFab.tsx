/**
 * Bouton flottant (FAB) pour accéder rapidement à l'assistant IA
 * Type Cursor AI - toujours accessible
 */

import { useState } from 'react';
import { Affix, ActionIcon, Transition, Modal, rem } from '@mantine/core';
import { IconRobot } from '@tabler/icons-react';
import { AIAssistantPanel } from './AIAssistantPanel';

export function AIAssistantFab() {
  const [opened, setOpened] = useState(false);

  return (
    <>
      {/* Bouton flottant */}
      <Affix position={{ bottom: rem(20), right: rem(20) }} zIndex={100}>
        <Transition transition="slide-up" mounted={!opened}>
          {(transitionStyles) => (
            <ActionIcon
              size={60}
              radius="xl"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
              style={transitionStyles}
              onClick={() => setOpened(true)}
              aria-label="Ouvrir l'assistant IA"
            >
              <IconRobot size={32} />
            </ActionIcon>
          )}
        </Transition>
      </Affix>

      {/* Modal de chat */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Assistant IA FORNAP"
        size="xl"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        styles={{
          body: {
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
          },
          content: {
            height: '80vh',
          },
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AIAssistantPanel />
        </div>
      </Modal>
    </>
  );
}
