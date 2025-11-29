import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Group, Text, Code } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class DebugErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Une erreur est survenue" 
          color="red" 
          variant="filled"
          mt="xl"
        >
          <Text size="sm" mb="xs">L'affichage de ce composant a échoué.</Text>
          <Code block mb="md">
            {this.state.error && this.state.error.toString()}
          </Code>
          <Group>
            <Button variant="white" size="xs" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
          </Group>
        </Alert>
      );
    }

    return this.props.children;
  }
}
