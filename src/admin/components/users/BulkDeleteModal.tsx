import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Textarea,
  Button,
  Group,
  Alert,
  Table,
  ScrollArea,
  Badge,
  Progress,
  Divider,
} from '@mantine/core';
import { IconAlertTriangle, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { bulkDeleteUsersByEmails } from '../../../shared/services/userService';

interface BulkDeleteModalProps {
  opened: boolean;
  onClose: () => void;
  adminUserId: string;
  onDeleteComplete: () => void;
}

export function BulkDeleteModal({
  opened,
  onClose,
  adminUserId,
  onDeleteComplete,
}: BulkDeleteModalProps) {
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    totalProcessed: number;
    usersDeleted: number;
    legacyMembersDeleted: number;
    errors: Array<{ email: string; error: string }>;
    details: Array<{ email: string; usersDeleted: number; legacyDeleted: number }>;
  } | null>(null);

  const handleSubmit = async () => {
    // Parser les emails
    const emails = emailsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (emails.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer au moins un email',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const deleteResult = await bulkDeleteUsersByEmails(emails, adminUserId);
      setResult(deleteResult);

      if (deleteResult.success) {
        notifications.show({
          title: 'Suppression réussie',
          message: `${deleteResult.usersDeleted} utilisateurs et ${deleteResult.legacyMembersDeleted} anciens membres supprimés`,
          color: 'green',
        });
        onDeleteComplete();
      } else {
        notifications.show({
          title: 'Suppression partielle',
          message: `${deleteResult.errors.length} erreurs rencontrées`,
          color: 'orange',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Une erreur est survenue',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmailsText('');
    setResult(null);
    onClose();
  };

  const totalEmailsInInput = emailsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0).length;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Suppression en masse par emails"
      size="xl"
      centered
    >
      <Stack gap="md">
        {!result ? (
          <>
            <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
              <Text size="sm" fw={500}>
                ⚠️ Action irréversible
              </Text>
              <Text size="sm">
                Cette action supprimera définitivement tous les utilisateurs et anciens membres
                correspondant aux emails fournis. Les doublons dans toutes les collections seront
                également supprimés.
              </Text>
            </Alert>

            <Textarea
              label="Liste d'emails"
              description="Collez la liste d'emails, un par ligne"
              placeholder={`exemple@email.com\nautreemail@domain.fr\netc...`}
              value={emailsText}
              onChange={(e) => setEmailsText(e.currentTarget.value)}
              minRows={10}
              maxRows={20}
              autosize
            />

            {totalEmailsInInput > 0 && (
              <Text size="sm" c="dimmed">
                {totalEmailsInInput} email{totalEmailsInInput > 1 ? 's' : ''} détecté
                {totalEmailsInInput > 1 ? 's' : ''}
              </Text>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose} disabled={loading}>
                Annuler
              </Button>
              <Button
                color="red"
                leftSection={<IconTrash size={16} />}
                onClick={handleSubmit}
                loading={loading}
                disabled={totalEmailsInInput === 0}
              >
                Supprimer {totalEmailsInInput > 0 ? `(${totalEmailsInInput})` : ''}
              </Button>
            </Group>
          </>
        ) : (
          <>
            <Alert
              icon={result.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />}
              color={result.success ? 'green' : 'orange'}
              variant="light"
            >
              <Text size="sm" fw={500}>
                {result.success
                  ? '✓ Suppression terminée avec succès'
                  : `⚠️ Suppression terminée avec ${result.errors.length} erreur(s)`}
              </Text>
            </Alert>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Résumé de l'opération
              </Text>
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">
                    Emails traités
                  </Text>
                  <Text size="lg" fw={700}>
                    {result.totalProcessed}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Utilisateurs supprimés
                  </Text>
                  <Text size="lg" fw={700} c="red">
                    {result.usersDeleted}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Anciens membres supprimés
                  </Text>
                  <Text size="lg" fw={700} c="orange">
                    {result.legacyMembersDeleted}
                  </Text>
                </div>
              </Group>

              <Progress
                value={
                  ((result.totalProcessed - result.errors.length) / result.totalProcessed) * 100
                }
                color={result.success ? 'green' : 'orange'}
                size="lg"
                mt="sm"
              />
            </Stack>

            {result.details.length > 0 && (
              <>
                <Divider label="Détails par email" labelPosition="center" />
                <ScrollArea h={300}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Utilisateurs</Table.Th>
                        <Table.Th>Legacy</Table.Th>
                        <Table.Th>Total</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {result.details.map((detail, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <Text size="sm">{detail.email}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="red" variant="light">
                              {detail.usersDeleted}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="orange" variant="light">
                              {detail.legacyDeleted}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="gray" variant="filled">
                              {detail.usersDeleted + detail.legacyDeleted}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </>
            )}

            {result.errors.length > 0 && (
              <>
                <Divider label="Erreurs" labelPosition="center" />
                <ScrollArea h={200}>
                  <Stack gap="xs">
                    {result.errors.map((error, index) => (
                      <Alert
                        key={index}
                        icon={<IconX size={14} />}
                        color="red"
                        variant="light"
                      >
                        <Text size="xs" fw={500}>
                          {error.email}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {error.error}
                        </Text>
                      </Alert>
                    ))}
                  </Stack>
                </ScrollArea>
              </>
            )}

            <Group justify="flex-end" mt="md">
              <Button onClick={handleClose}>Fermer</Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
