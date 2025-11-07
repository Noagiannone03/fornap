/**
 * Page de diagnostics du système d'envoi d'emails
 * 
 * Permet de vérifier:
 * - Configuration des variables d'environnement
 * - Connexion à Resend
 * - Connexion à QStash
 * - Envoyer un email de test
 * - Voir les logs des dernières campagnes
 */

import { useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Button,
  Group,
  Text,
  Badge,
  Alert,
  TextInput,
  Loader,
  Card,
  Code,
  Divider,
  Accordion,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconX,
  IconRefresh,
  IconMail,
  IconBug,
} from '@tabler/icons-react';

interface ConfigCheck {
  key: string;
  label: string;
  status: 'checking' | 'valid' | 'invalid' | 'unknown';
  value?: string;
  error?: string;
}

interface ServiceStatus {
  service: string;
  status: 'checking' | 'connected' | 'error' | 'unknown';
  message?: string;
  details?: any;
}

export function EmailDiagnosticsPage() {
  const [loading, setLoading] = useState(false);
  const [configChecks, setConfigChecks] = useState<ConfigCheck[]>([]);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);

  /**
   * Vérifie la configuration des variables d'environnement
   */
  const checkConfiguration = async () => {
    setLoading(true);

    const checks: ConfigCheck[] = [
      {
        key: 'RESEND_API_KEY',
        label: 'Resend API Key',
        status: 'checking',
      },
      {
        key: 'QSTASH_TOKEN',
        label: 'QStash Token',
        status: 'checking',
      },
      {
        key: 'QSTASH_CURRENT_SIGNING_KEY',
        label: 'QStash Current Signing Key',
        status: 'checking',
      },
      {
        key: 'QSTASH_NEXT_SIGNING_KEY',
        label: 'QStash Next Signing Key',
        status: 'checking',
      },
      {
        key: 'WEBHOOK_BASE_URL',
        label: 'Webhook Base URL',
        status: 'checking',
      },
    ];

    setConfigChecks(checks);

    try {
      const apiUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/diagnostics/config`);
      const data = await response.json();

      const updatedChecks = checks.map((check) => ({
        ...check,
        status: data.config[check.key] ? 'valid' : 'invalid',
        value: data.config[check.key] ? '✓ Configurée' : '✗ Manquante',
      })) as ConfigCheck[];

      setConfigChecks(updatedChecks);
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de vérifier la configuration',
        color: 'red',
      });

      setConfigChecks(
        checks.map((check) => ({
          ...check,
          status: 'unknown',
          error: 'Erreur de vérification',
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Teste les connexions aux services externes
   */
  const testServices = async () => {
    setLoading(true);

    const initialStatuses: ServiceStatus[] = [
      { service: 'Resend', status: 'checking' },
      { service: 'QStash', status: 'checking' },
    ];

    setServiceStatuses(initialStatuses);

    try {
      const apiUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/diagnostics/services`);
      const data = await response.json();

      const updatedStatuses: ServiceStatus[] = [
        {
          service: 'Resend',
          status: data.resend.success ? 'connected' : 'error',
          message: data.resend.message,
          details: data.resend,
        },
        {
          service: 'QStash',
          status: data.qstash.success ? 'connected' : 'error',
          message: data.qstash.message,
          details: data.qstash,
        },
      ];

      setServiceStatuses(updatedStatuses);

      if (data.resend.success && data.qstash.success) {
        notifications.show({
          title: 'Succès',
          message: 'Tous les services sont connectés',
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Attention',
          message: 'Certains services ont des problèmes',
          color: 'orange',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de tester les services',
        color: 'red',
      });

      setServiceStatuses(
        initialStatuses.map((s) => ({
          ...s,
          status: 'error',
          message: 'Erreur de test',
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Envoie un email de test
   */
  const sendTestEmail = async () => {
    if (!testEmail) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer une adresse email',
        color: 'red',
      });
      return;
    }

    setSendingTest(true);
    setLastTestResult(null);

    try {
      const apiUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const response = await fetch(`${apiUrl}/api/diagnostics/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await response.json();
      setLastTestResult(data);

      if (data.success) {
        notifications.show({
          title: 'Email de test envoyé',
          message: `Vérifiez votre boîte ${testEmail}`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Erreur d\'envoi',
          message: data.error || 'Impossible d\'envoyer l\'email de test',
          color: 'red',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible d\'envoyer l\'email de test',
        color: 'red',
      });
    } finally {
      setSendingTest(false);
    }
  };

  /**
   * Lance tous les diagnostics
   */
  const runAllDiagnostics = async () => {
    await checkConfiguration();
    await testServices();
  };

  const getStatusBadge = (status: ConfigCheck['status'] | ServiceStatus['status']) => {
    switch (status) {
      case 'valid':
      case 'connected':
        return <Badge color="green" leftSection={<IconCheck size={14} />}>OK</Badge>;
      case 'invalid':
      case 'error':
        return <Badge color="red" leftSection={<IconX size={14} />}>Erreur</Badge>;
      case 'checking':
        return <Badge color="blue" leftSection={<Loader size={14} />}>Vérification...</Badge>;
      default:
        return <Badge color="gray">Non vérifié</Badge>;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={1}>Diagnostics Emails</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Vérifiez la configuration et testez le système d'envoi d'emails
            </Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={runAllDiagnostics}
            loading={loading}
          >
            Lancer tous les diagnostics
          </Button>
        </Group>

        {/* Alert d'information */}
        <Alert icon={<IconAlertCircle size={16} />} title="À propos" color="blue">
          Cette page vous permet de diagnostiquer les problèmes d'envoi d'emails.
          Vérifiez que toutes les variables d'environnement sont configurées et que
          les services externes sont accessibles.
        </Alert>

        {/* Configuration */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Variables d'environnement</Title>
            <Button
              variant="light"
              size="sm"
              onClick={checkConfiguration}
              loading={loading}
            >
              Vérifier
            </Button>
          </Group>

          {configChecks.length > 0 ? (
            <Stack gap="xs">
              {configChecks.map((check) => (
                <Group key={check.key} justify="space-between" p="xs">
                  <div>
                    <Text size="sm" fw={500}>
                      {check.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {check.key}
                    </Text>
                  </div>
                  <Group gap="xs">
                    {check.value && (
                      <Text size="sm" c="dimmed">
                        {check.value}
                      </Text>
                    )}
                    {getStatusBadge(check.status)}
                  </Group>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              Cliquez sur "Vérifier" pour analyser la configuration
            </Text>
          )}
        </Card>

        {/* Status des services */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Connexion aux services</Title>
            <Button variant="light" size="sm" onClick={testServices} loading={loading}>
              Tester
            </Button>
          </Group>

          {serviceStatuses.length > 0 ? (
            <Stack gap="md">
              {serviceStatuses.map((service) => (
                <Paper key={service.service} p="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{service.service}</Text>
                    {getStatusBadge(service.status)}
                  </Group>
                  {service.message && (
                    <Text size="sm" c="dimmed">
                      {service.message}
                    </Text>
                  )}
                  {service.details && (
                    <Accordion mt="xs">
                      <Accordion.Item value="details">
                        <Accordion.Control>Détails techniques</Accordion.Control>
                        <Accordion.Panel>
                          <Code block>{JSON.stringify(service.details, null, 2)}</Code>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              Cliquez sur "Tester" pour vérifier les connexions
            </Text>
          )}
        </Card>

        {/* Email de test */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Envoyer un email de test
          </Title>

          <Stack gap="md">
            <TextInput
              label="Adresse email destinataire"
              placeholder="votre.email@exemple.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.currentTarget.value)}
              leftSection={<IconMail size={16} />}
            />

            <Button
              leftSection={<IconMail size={16} />}
              onClick={sendTestEmail}
              loading={sendingTest}
              disabled={!testEmail}
            >
              Envoyer l'email de test
            </Button>

            {lastTestResult && (
              <Alert
                icon={lastTestResult.success ? <IconCheck size={16} /> : <IconX size={16} />}
                color={lastTestResult.success ? 'green' : 'red'}
                title={lastTestResult.success ? 'Email envoyé' : 'Erreur d\'envoi'}
              >
                {lastTestResult.success ? (
                  <Stack gap="xs">
                    <Text size="sm">L'email de test a été envoyé avec succès !</Text>
                    {lastTestResult.messageId && (
                      <Text size="xs" c="dimmed">
                        Message ID: {lastTestResult.messageId}
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Stack gap="xs">
                    <Text size="sm">{lastTestResult.error}</Text>
                    {lastTestResult.details && (
                      <Code block>{JSON.stringify(lastTestResult.details, null, 2)}</Code>
                    )}
                  </Stack>
                )}
              </Alert>
            )}
          </Stack>
        </Card>

        {/* Instructions de debugging */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group mb="md">
            <IconBug size={20} />
            <Title order={3}>Guide de dépannage</Title>
          </Group>

          <Stack gap="md">
            <div>
              <Text fw={500} mb="xs">
                1. Variables d'environnement manquantes
              </Text>
              <Text size="sm" c="dimmed">
                Vérifiez que toutes les variables sont configurées dans les Settings de Vercel.
                Vous devez redéployer après avoir ajouté des variables.
              </Text>
            </div>

            <Divider />

            <div>
              <Text fw={500} mb="xs">
                2. Erreur de connexion Resend
              </Text>
              <Text size="sm" c="dimmed">
                Vérifiez que votre API Key Resend est valide et que votre domaine est vérifié
                dans le dashboard Resend.
              </Text>
            </div>

            <Divider />

            <div>
              <Text fw={500} mb="xs">
                3. Erreur de connexion QStash
              </Text>
              <Text size="sm" c="dimmed">
                Vérifiez votre token QStash et que votre URL de webhook est accessible publiquement.
                QStash doit pouvoir appeler votre endpoint /api/campaigns/process-batch.
              </Text>
            </div>

            <Divider />

            <div>
              <Text fw={500} mb="xs">
                4. Emails non reçus
              </Text>
              <Text size="sm" c="dimmed">
                Vérifiez vos spams, la console Resend pour voir les logs d'envoi, et les logs
                Vercel pour voir les erreurs côté serveur.
              </Text>
            </div>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

