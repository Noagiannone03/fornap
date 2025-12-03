import { useState } from 'react';
import {
  Modal,
  Button,
  Text,
  Stack,
  FileButton,
  Group,
  Paper,
  Progress,
  Alert,
  List,
  Divider,
  ScrollArea,
} from '@mantine/core';
import {
  IconUpload,
  IconFileTypeCsv,
  IconCheck,
  IconAlertCircle,
  IconX,
} from '@tabler/icons-react';
import { importUsersFromCsv } from '../services/csvImportService';
import type { ImportResult } from '../services/csvImportService';

interface CsvImportModalProps {
  opened: boolean;
  onClose: () => void;
  adminUserId: string;
  onImportComplete: () => void;
}

export function CsvImportModal({
  opened,
  onClose,
  adminUserId,
  onImportComplete,
}: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const csvContent = await file.text();
      const importResult = await importUsersFromCsv(csvContent, adminUserId);
      setResult(importResult);

      if (importResult.success > 0) {
        onImportComplete();
      }
    } catch (error: any) {
      setResult({
        success: 0,
        errors: [{ row: 0, email: '', error: error.message }],
        skipped: 0,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Importer des utilisateurs depuis un CSV"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>Format attendu:</strong> Fichier CSV (le séparateur est détecté automatiquement)
          </Text>
          <Text size="xs" mt="xs">
            Colonnes requises: Nom, Prénom, Email
          </Text>
          <Text size="xs">
            Colonnes optionnelles: Téléphone, Date de naissance, Code postal, Horodateur
          </Text>
        </Alert>

        {!result && (
          <>
            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group>
                  <IconFileTypeCsv size={32} />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {file ? file.name : 'Aucun fichier sélectionné'}
                    </Text>
                    {file && (
                      <Text size="xs" c="dimmed">
                        {(file.size / 1024).toFixed(2)} KB
                      </Text>
                    )}
                  </div>
                </Group>

                <Group justify="space-between">
                  <FileButton onChange={handleFileSelect} accept=".csv,.tsv,text/csv,text/tab-separated-values">
                    {(props) => (
                      <Button {...props} leftSection={<IconUpload size={16} />} variant="light">
                        Choisir un fichier
                      </Button>
                    )}
                  </FileButton>

                  {file && (
                    <Button variant="subtle" color="red" onClick={() => setFile(null)}>
                      Annuler
                    </Button>
                  )}
                </Group>
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={handleClose} disabled={importing}>
                Fermer
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importing}
                loading={importing}
                leftSection={<IconUpload size={16} />}
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </Button>
            </Group>
          </>
        )}

        {importing && (
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Import en cours...
              </Text>
              <Progress value={100} animated />
              <Text size="xs" c="dimmed">
                Veuillez patienter pendant la création des comptes utilisateurs
              </Text>
            </Stack>
          </Paper>
        )}

        {result && (
          <>
            <Divider my="sm" />

            <Paper withBorder p="md" radius="md">
              <Stack gap="md">
                <Text size="lg" fw={600}>
                  Résultat de l'import
                </Text>

                {result.debugInfo && (
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    <Text size="xs" fw={600} mb="xs">
                      Informations de débogage:
                    </Text>
                    <Text size="xs">
                      • Séparateur détecté: <strong>{result.debugInfo.separator}</strong>
                    </Text>
                    <Text size="xs">
                      • Nombre de colonnes: <strong>{result.debugInfo.headers.length}</strong>
                    </Text>
                    {result.debugInfo.firstRowSample && (
                      <>
                        <Text size="xs" mt="xs" fw={600}>
                          Échantillon première ligne:
                        </Text>
                        <Text size="xs">
                          • Nom: <strong>{result.debugInfo.firstRowSample.nom || '(vide)'}</strong>
                        </Text>
                        <Text size="xs">
                          • Prénom: <strong>{result.debugInfo.firstRowSample.prenom || '(vide)'}</strong>
                        </Text>
                        <Text size="xs">
                          • Email: <strong>{result.debugInfo.firstRowSample.email || '(vide)'}</strong>
                        </Text>
                        <Text size="xs">
                          • Téléphone: <strong>{result.debugInfo.firstRowSample.telephone || '(vide)'}</strong>
                        </Text>
                      </>
                    )}
                  </Alert>
                )}

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
                          {result.errors.length}
                        </Text>
                      </div>
                    </Group>
                  </Paper>

                  <Paper withBorder p="sm" radius="md" bg="gray.0">
                    <Group>
                      <IconAlertCircle size={24} color="gray" />
                      <div>
                        <Text size="xs" c="dimmed">
                          Ignorés
                        </Text>
                        <Text size="xl" fw={700} c="gray">
                          {result.skipped}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                </Group>

                {result.errors.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Text size="sm" fw={600} mb="xs">
                        Détails des erreurs:
                      </Text>
                      <ScrollArea h={200}>
                        <List size="xs" spacing="xs">
                          {result.errors.map((err, idx) => (
                            <List.Item key={idx}>
                              <Text size="xs">
                                <strong>Ligne {err.row}</strong> ({err.email}): {err.error}
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
                      {result.success} utilisateur{result.success > 1 ? 's ont' : ' a'} été créé
                      {result.success > 1 ? 's' : ''} avec succès !
                    </Text>
                    <Text size="xs" mt="xs">
                      Les documents utilisateurs ont été créés dans la base de données. Les utilisateurs devront créer leur compte pour se connecter.
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
