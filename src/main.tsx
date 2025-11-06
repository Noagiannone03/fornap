import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { DatesProvider } from '@mantine/dates';
import { AuthProvider } from './shared/contexts/AuthContext';
import { theme } from './shared/theme/mantineTheme';
import App from './App';
import 'dayjs/locale/fr';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import '@mantine/dates/styles.css';
import './index.css';
import './shared/styles/animations.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: 'fr', firstDayOfWeek: 1, weekendDays: [0, 6] }}>
        <ModalsProvider>
          <Notifications position="top-right" />
          <AuthProvider>
            <App />
          </AuthProvider>
        </ModalsProvider>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>
);
