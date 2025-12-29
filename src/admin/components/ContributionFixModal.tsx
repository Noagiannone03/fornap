/**
 * Modal de correction des contributions
 * Verifie que chaque contribution avec membership a un document user associe
 * et que les achats sont bien dans la sous-collection purchases
 */

import { useState } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  Progress,
  ScrollArea,
  Paper,
  Group,
  Badge,
  Alert,
} from '@mantine/core';
import { IconBug, IconUserPlus, IconShoppingCart, IconAlertTriangle } from '@tabler/icons-react';
import {
  fixContributionsWithMissingUsers,
  type ContributionFixResult,
} from '../../shared/services/contributionFixService';

interface ContributionFixModalProps {
  opened: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ContributionFixModal({ opened, onClose, onComplete }: ContributionFixModalProps) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ContributionFixResult | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const handleFix = async (dryRun: boolean) => {
    setRunning(true);
    setIsDryRun(dryRun);
    setLogs([]);
    setProgress(0);
    setProgressText('Demarrage...');
    setResult(null);

    try {
      const fixResult = await fixContributionsWithMissingUsers(dryRun, (current, total, log) => {
        setProgress((current / total) * 100);
        setProgressText(log);
      });

      setResult(fixResult);
      setLogs(fixResult.logs);

      if (!dryRun) {
        onComplete?.();
      }
    } catch (error) {
      setLogs((prev) => [...prev, `❌ Erreur: ${error}`]);
    } finally {
      setRunning(false);
      setProgress(100);
      setProgressText('Termine!');
    }
  };

  const handleClose = () => {
    if (!running) {
      setResult(null);
      setLogs([]);
      setProgress(0);
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconBug size={20} />
          <Text fw={600}>Correction des Contributions (Bug Inkipit)</Text>
        </Group>
      }
      size="xl"
      closeOnClickOutside={!running}
      closeOnEscape={!running}
    >
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light">
          <Text size="sm">
            Ce script verifie les contributions depuis le <strong>23 decembre 2025</strong> (date du bug)
            et corrige les cas ou un utilisateur aurait du etre cree mais ne l'a pas ete.
          </Text>
          <Text size="sm" mt="xs">
            <strong>Bug concerne:</strong> Les achats via la page Inkipit avec le nom
            "20€ - PACK PARTY HARDER - edition limitee" qui ne correspondait pas au mapping.
          </Text>
        </Alert>

        <Paper withBorder p="md" radius="md" bg="blue.0">
          <Text size="sm" fw={500} mb="xs">Ce script va:</Text>
          <Stack gap={4}>
            <Group gap="xs">
              <Badge size="xs" color="blue">1</Badge>
              <Text size="sm">Recuperer les contributions depuis le 23/12/2025</Text>
            </Group>
            <Group gap="xs">
              <Badge size="xs" color="blue">2</Badge>
              <Text size="sm">Filtrer celles qui auraient du creer un user (passes avec membership)</Text>
            </Group>
            <Group gap="xs">
              <Badge size="xs" color="blue">3</Badge>
              <Text size="sm">Verifier si un user existe pour chaque email</Text>
            </Group>
            <Group gap="xs">
              <Badge size="xs" color="blue">4</Badge>
              <Text size="sm">Creer le user s'il manque, ou ajouter le purchase si le user existe</Text>
            </Group>
          </Stack>
        </Paper>

        {!result && !running && (
          <Group>
            <Button
              leftSection={<IconBug size={16} />}
              variant="light"
              color="blue"
              onClick={() => handleFix(true)}
              loading={running}
            >
              Preview (Dry Run)
            </Button>
            <Button
              leftSection={<IconUserPlus size={16} />}
              color="green"
              onClick={() => handleFix(false)}
              loading={running}
            >
              Executer la Correction
            </Button>
          </Group>
        )}

        {running && (
          <Stack gap="xs">
            <Text size="sm">{progressText}</Text>
            <Progress value={progress} animated />
          </Stack>
        )}

        {result && (
          <Paper withBorder p="md" radius="md">
            <Group mb="md">
              <Badge color={isDryRun ? 'blue' : 'green'} size="lg">
                {isDryRun ? 'Preview (Dry Run)' : 'Execute'}
              </Badge>
            </Group>
            <Group gap="lg" wrap="wrap">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">Total verifiees</Text>
                <Text fw={700}>{result.totalContributions}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">Deja OK</Text>
                <Text fw={700} c="gray">{result.alreadyOk}</Text>
              </Stack>
              <Stack gap={2}>
                <Group gap={4}>
                  <IconUserPlus size={14} />
                  <Text size="xs" c="dimmed">Users crees</Text>
                </Group>
                <Text fw={700} c="green">{result.usersCreated}</Text>
              </Stack>
              <Stack gap={2}>
                <Group gap={4}>
                  <IconShoppingCart size={14} />
                  <Text size="xs" c="dimmed">Purchases ajoutes</Text>
                </Group>
                <Text fw={700} c="blue">{result.purchasesAdded}</Text>
              </Stack>
              <Stack gap={2}>
                <Text size="xs" c="dimmed">Erreurs</Text>
                <Text fw={700} c="red">{result.errors}</Text>
              </Stack>
            </Group>
          </Paper>
        )}

        {logs.length > 0 && (
          <ScrollArea h={350} type="always">
            <Paper withBorder p="sm" radius="sm" bg="gray.0">
              <pre
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.4,
                }}
              >
                {logs.join('\n')}
              </pre>
            </Paper>
          </ScrollArea>
        )}

        {result && !running && (
          <Group justify="flex-end">
            {isDryRun && (result.usersCreated > 0 || result.purchasesAdded > 0) && (
              <Button color="green" onClick={() => handleFix(false)}>
                Executer pour de vrai
              </Button>
            )}
            <Button variant="light" onClick={handleClose}>
              Fermer
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
