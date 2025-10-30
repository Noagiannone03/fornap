import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { AuthProvider } from './shared/contexts/AuthContext';
import { theme } from './shared/theme/mantineTheme';
import App from './App';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import './index.css';
import './shared/styles/animations.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <AuthProvider>
          <App />
        </AuthProvider>
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>
);
