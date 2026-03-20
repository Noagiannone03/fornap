import { useEffect, useState } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  Group,
  Paper,
  Progress,
  Alert,
  List,
  Divider,
  ScrollArea,
  TextInput,
  Badge,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertCircle,
  IconX,
  IconSend,
  IconFlask,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { sendCampaignEmails, sendCampaignTestEmail } from '../../../shared/services/campaignService';
import { Timestamp } from 'firebase/firestore';

interface SendCampaignModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete: () => void;
  campaignId: string;
  campaignName: string;
  totalRecipients: number;
  lastTestSentAt?: Timestamp;
  lastTestSentTo?: string;
}

interface ProgressState {
  current: number;
  total: number;
  currentRecipient: string;
  success: number;
  errors: number;
}

interface ResultState {
  success: number;
  errors: number;
  total: number;
  errorDetails: Array<{ userId: string; userName: string; error: string }>;
}

export function SendCampaignModal({
  opened,
  onClose,
  onComplete,
  campaignId,
  campaignName,
  totalRecipients,
  lastTestSentAt,
  lastTestSentTo,
}: SendCampaignModalProps) {
  const [testEmail, setTestEmail] = useState(lastTestSentTo || '');
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [testStatus, setTestStatus] = useState<{
    message: string;
    sentAt?: string;
    email: string;
  } | null>(
    lastTestSentAt && lastTestSentTo
      ? {
          message: `Dernier test envoyé à ${lastTestSentTo}`,
          sentAt: lastTestSentAt.toDate().toISOString(),
          email: lastTestSentTo,
        }
      : null
  );

  const canSendDefinitively = Boolean(lastTestSentAt) || Boolean(testStatus);

  useEffect(() => {
    if (!opened) return;

    setTestEmail(lastTestSentTo || '');
    setTestStatus(
      lastTestSentAt && lastTestSentTo
        ? {
            message: `Dernier test envoyé à ${lastTestSentTo}`,
            sentAt: lastTestSentAt.toDate().toISOString(),
            email: lastTestSentTo,
          }
        : null
    );
    setProgress(null);
    setResult(null);
  }, [lastTestSentAt, lastTestSentTo, opened]);

  const formatDate = (value?: string) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString('fr-FR');
  };

  const handleSendTest = async () => {
    const normalizedEmail = testEmail.trim();

    if (!normalizedEmail) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer une adresse email de test',
        color: 'red',
      });
      return;
    }

    setSendingTest(true);

    try {
      const response = await sendCampaignTestEmail(campaignId, normalizedEmail);

      setTestStatus({
        message: response.message,
        sentAt: response.sentAt,
        email: normalizedEmail,
      });

      notifications.show({
        title: 'Test envoyé',
        message: `Vérifiez la boîte ${normalizedEmail} avant l’envoi définitif`,
        color: 'green',
      });

      onComplete();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Impossible d’envoyer le test',
        color: 'red',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setProgress({
      current: 0,
      total: totalRecipients,
      currentRecipient: 'Démarrage...',
      success: 0,
      errors: 0,
    });
    setResult(null);

    try {
      const sendResult = await sendCampaignEmails(campaignId, (progressUpdate) => {
        setProgress(progressUpdate);
      });

      setResult(sendResult);
      onComplete();
    } catch (error: any) {
      setResult({
        success: 0,
        errors: totalRecipients,
        total: totalRecipients,
        errorDetails: [{ userId: 'system', userName: 'Erreur système', error: error.message }],
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending && !sendingTest) {
      setProgress(null);
      setResult(null);
      onClose();
    }
  };

  const progressPercentage = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Envoyer la campagne: ${campaignName}`}
      size="lg"
      centered
      closeOnClickOutside={!sending}
      closeOnEscape={!sending && !sendingTest}
    >
      <Stack gap="md">
        {!result && !sending && (
          <>
            <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                <strong>Envoi de la campagne email</strong>
              </Text>
              <Text size="xs" mt="xs">
                Le premier passage doit être un envoi de test. Une fois validé dans votre boîte mail,
                vous pouvez lancer l’envoi définitif.
              </Text>
              <Text size="xs" mt="xs" fw={600}>
                Nombre de destinataires : {totalRecipients}
              </Text>
            </Alert>

            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <IconFlask size={18} />
                    <Text size="sm" fw={600}>
                      Test avant diffusion
                    </Text>
                  </Group>
                  <Badge color={canSendDefinitively ? 'green' : 'orange'} variant="light">
                    {canSendDefinitively ? 'Test prêt' : 'Test requis'}
                  </Badge>
                </Group>

                <TextInput
                  label="Adresse email de test"
                  placeholder="exemple@domaine.com"
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.currentTarget.value)}
                  disabled={sendingTest || sending}
                />

                {(testStatus || lastTestSentAt) && (
                  <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                    <Text size="sm">
                      {testStatus?.message || `Dernier test envoyé à ${lastTestSentTo}`}
                    </Text>
                    {formatDate(testStatus?.sentAt || lastTestSentAt?.toDate().toISOString()) && (
                      <Text size="xs" mt="xs">
                        {formatDate(testStatus?.sentAt || lastTestSentAt?.toDate().toISOString())}
                      </Text>
                    )}
                  </Alert>
                )}

                <Group justify="space-between" mt="xs">
                  <Button
                    variant="default"
                    leftSection={<IconFlask size={16} />}
                    onClick={handleSendTest}
                    loading={sendingTest}
                    disabled={sending}
                  >
                    {canSendDefinitively ? 'Renvoyer un test' : 'Envoyer un test'}
                  </Button>

                  <Button
                    onClick={handleSend}
                    leftSection={<IconSend size={16} />}
                    color="blue"
                    disabled={!canSendDefinitively || sendingTest}
                  >
                    Envoyer définitivement
                  </Button>
                </Group>
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose}>
                Annuler
              </Button>
            </Group>
          </>
        )}

        {sending && progress && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Envoi en cours...
              </Text>
              <Progress value={progressPercentage} animated />
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  {progress.current} / {progress.total}
                </Text>
                <Text size="xs" c="dimmed">
                  {progressPercentage}%
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Traitement : <strong>{progress.currentRecipient}</strong>
              </Text>
              <Group justify="space-between">
                <Text size="xs" c="green">
                  ✓ Succès : {progress.success}
                </Text>
                <Text size="xs" c="red">
                  ✗ Erreurs : {progress.errors}
                </Text>
              </Group>
            </Stack>
          </Paper>
        )}

        {result && (
          <>
            <Divider my="sm" />

            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Text size="lg" fw={600}>
                  Résultat de l'envoi
                </Text>

                <Group grow>
                  <Paper withBorder p="sm" radius="md" bg="green.0">
                    <Group>
                      <IconCheck size={24} color="green" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Réussis
                        </Text>
                        <Text size="xl" fw={700} c="green">
                          {result.success}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <Paper withBorder p="sm" radius="md" bg="red.0">
                    <Group>
                      <IconX size={24} color="red" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Erreurs
                        </Text>
                        <Text size="xl" fw={700} c="red">
                          {result.errors}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <Paper withBorder p="sm" radius="md" bg="gray.0">
                    <Group>
                      <IconAlertCircle size={24} color="gray" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Total
                        </Text>
                        <Text size="xl" fw={700} c="gray">
                          {result.total}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Group>

                {result.errors > 0 && result.errorDetails.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Text size="sm" fw={600} mb="xs">
                        Détails des erreurs:
                      </Text>
                      <ScrollArea h={200}>
                        <List size="xs" spacing="xs">
                          {result.errorDetails.map((err, idx) => (
                            <List.Item key={idx}>
                              <Text size="xs">
                                <strong>{err.userName}</strong>: {err.error}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </ScrollArea>
                    </div>
                  </>
                )}

                {result.success > 0 && (
                  <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                    <Text size="sm">
                      {result.success} email{result.success > 1 ? 's ont' : ' a'} été envoyé
                      {result.success > 1 ? 's' : ''} avec succès !
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button onClick={handleClose}>Fermer</Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
