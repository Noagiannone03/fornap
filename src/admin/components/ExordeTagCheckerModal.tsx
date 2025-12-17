import { useState, useEffect } from 'react';
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
    Divider,
    ScrollArea,
    Badge,
} from '@mantine/core';
import {
    IconUpload,
    IconFileTypeCsv,
    IconCheck,
    IconAlertCircle,
    IconX,
    IconSearch,
    IconTag,
    IconUserCheck,
    IconUserX,
} from '@tabler/icons-react';
import { getUserByEmail, bulkAddTagsToUsers } from '../../shared/services/userService';
import type { User } from '../../shared/types/user';
import * as XLSX from 'xlsx';

interface ExordeTagCheckerModalProps {
    opened: boolean;
    onClose: () => void;
    adminUserId: string;
    onComplete: () => void;
}

interface CheckResult {
    email: string;
    user: User | null;
    hasExordeTag: boolean;
}

interface SummaryResult {
    usersWithTag: CheckResult[];
    usersWithoutTag: CheckResult[];
    notFound: string[];
}

const EXORDE_TAG = 'EXORDE';

export function ExordeTagCheckerModal({
    opened,
    onClose,
    adminUserId,
    onComplete,
}: ExordeTagCheckerModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [checking, setChecking] = useState(false);
    const [addingTag, setAddingTag] = useState(false);
    const [summary, setSummary] = useState<SummaryResult | null>(null);
    const [progress, setProgress] = useState(0);
    const [tagAddResult, setTagAddResult] = useState<{ success: number; errors: number } | null>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!opened) {
            setFile(null);
            setChecking(false);
            setAddingTag(false);
            setSummary(null);
            setProgress(0);
            setTagAddResult(null);
        }
    }, [opened]);

    /**
     * Parse emails from CSV/XLSX file
     */
    const parseEmailsFromFile = async (file: File): Promise<string[]> => {
        const emails: string[] = [];

        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let content: string;

        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Parse XLSX
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            content = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
        } else {
            // Parse CSV
            content = await file.text();
        }

        // Split into lines
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 1) return emails;

        // Detect separator
        const firstLine = lines[0];
        const separator = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

        // Find email column index
        const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
        const emailColIndex = headers.findIndex(h =>
            h.includes('email') || h.includes('e-mail') || h.includes('adresse')
        );

        // If no email header found, try to detect emails by pattern
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (emailColIndex === -1) {
            // Try to find emails anywhere in the file
            for (const line of lines) {
                const parts = line.split(separator);
                for (const part of parts) {
                    const cleaned = part.trim().toLowerCase().replace(/"/g, '');
                    if (emailPattern.test(cleaned)) {
                        emails.push(cleaned);
                    }
                }
            }
        } else {
            // Extract emails from the identified column
            for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(separator);
                if (parts[emailColIndex]) {
                    const email = parts[emailColIndex].trim().toLowerCase().replace(/"/g, '');
                    if (emailPattern.test(email)) {
                        emails.push(email);
                    }
                }
            }
        }

        // Remove duplicates
        return Array.from(new Set(emails));
    };

    /**
     * Check emails against database
     */
    const handleCheck = async () => {
        if (!file) return;

        setChecking(true);
        setSummary(null);
        setProgress(0);

        try {
            // Parse emails from file
            const emails = await parseEmailsFromFile(file);
            console.log(`[EXORDE CHECK] ${emails.length} emails uniques trouves dans le fichier`);

            if (emails.length === 0) {
                setSummary({
                    usersWithTag: [],
                    usersWithoutTag: [],
                    notFound: [],
                });
                return;
            }

            const usersWithTag: CheckResult[] = [];
            const usersWithoutTag: CheckResult[] = [];
            const notFound: string[] = [];

            // Check each email
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];

                try {
                    const user = await getUserByEmail(email);

                    if (user) {
                        const hasExordeTag = user.status?.tags?.includes(EXORDE_TAG) || false;

                        if (hasExordeTag) {
                            usersWithTag.push({ email, user, hasExordeTag: true });
                        } else {
                            usersWithoutTag.push({ email, user, hasExordeTag: false });
                        }
                    } else {
                        notFound.push(email);
                    }
                } catch (error) {
                    console.error(`Error checking email ${email}:`, error);
                    notFound.push(email);
                }

                // Update progress
                setProgress(Math.round(((i + 1) / emails.length) * 100));
            }

            setSummary({
                usersWithTag,
                usersWithoutTag,
                notFound,
            });

            console.log(`[EXORDE CHECK] Resultats: ${usersWithTag.length} avec tag, ${usersWithoutTag.length} sans tag, ${notFound.length} non trouves`);

        } catch (error) {
            console.error('Error parsing file:', error);
        } finally {
            setChecking(false);
        }
    };

    /**
     * Add EXORDE tag to users without it
     */
    const handleAddTag = async () => {
        if (!summary || summary.usersWithoutTag.length === 0) return;

        setAddingTag(true);

        try {
            const userIds = summary.usersWithoutTag
                .map(r => r.user?.uid)
                .filter((uid): uid is string => !!uid);

            const result = await bulkAddTagsToUsers(userIds, [EXORDE_TAG], adminUserId);

            setTagAddResult({
                success: result.success,
                errors: result.errors,
            });

            if (result.success > 0) {
                onComplete();
            }
        } catch (error) {
            console.error('Error adding tags:', error);
            setTagAddResult({
                success: 0,
                errors: summary.usersWithoutTag.length,
            });
        } finally {
            setAddingTag(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setSummary(null);
        setTagAddResult(null);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title="Verificateur de tag EXORDE"
            size="lg"
            centered
        >
            <Stack gap="md">
                <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    <Text size="sm">
                        <strong>Fonctionnement:</strong> Importez un fichier CSV ou XLSX contenant des emails.
                        Le systeme verifiera quels utilisateurs existent dans la base de donnees et n'ont pas
                        encore le tag <Badge size="xs" color="cyan">EXORDE</Badge>.
                    </Text>
                </Alert>

                {/* File selection */}
                {!summary && !tagAddResult && (
                    <Paper withBorder p="md" radius="md">
                        <Stack gap="sm">
                            <Group>
                                <IconFileTypeCsv size={32} />
                                <div style={{ flex: 1 }}>
                                    <Text size="sm" fw={500}>
                                        {file ? file.name : 'Aucun fichier selectionne'}
                                    </Text>
                                    {file && (
                                        <Text size="xs" c="dimmed">
                                            {(file.size / 1024).toFixed(2)} KB
                                        </Text>
                                    )}
                                </div>
                            </Group>

                            <Group justify="space-between">
                                <FileButton
                                    onChange={setFile}
                                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                >
                                    {(props) => (
                                        <Button {...props} leftSection={<IconUpload size={16} />} variant="light">
                                            Choisir un fichier
                                        </Button>
                                    )}
                                </FileButton>

                                {file && (
                                    <Button
                                        onClick={handleCheck}
                                        loading={checking}
                                        leftSection={<IconSearch size={16} />}
                                    >
                                        Verifier les emails
                                    </Button>
                                )}
                            </Group>

                            {checking && (
                                <div>
                                    <Text size="xs" c="dimmed" mb="xs">
                                        Verification en cours... {progress}%
                                    </Text>
                                    <Progress value={progress} animated />
                                </div>
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* Results */}
                {summary && !tagAddResult && (
                    <>
                        <Divider my="sm" />

                        <Paper withBorder p="md" radius="md">
                            <Stack gap="md">
                                <Text size="lg" fw={600}>
                                    Resultats de la verification
                                </Text>

                                <Group grow>
                                    <Paper withBorder p="sm" radius="md" bg="green.0">
                                        <Group>
                                            <IconUserCheck size={24} color="green" />
                                            <div>
                                                <Text size="xs" c="dimmed">
                                                    Avec tag EXORDE
                                                </Text>
                                                <Text size="xl" fw={700} c="green">
                                                    {summary.usersWithTag.length}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Paper>

                                    <Paper withBorder p="sm" radius="md" bg="orange.0">
                                        <Group>
                                            <IconUserX size={24} color="orange" />
                                            <div>
                                                <Text size="xs" c="dimmed">
                                                    Sans tag EXORDE
                                                </Text>
                                                <Text size="xl" fw={700} c="orange">
                                                    {summary.usersWithoutTag.length}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Paper>

                                    <Paper withBorder p="sm" radius="md" bg="gray.0">
                                        <Group>
                                            <IconX size={24} color="gray" />
                                            <div>
                                                <Text size="xs" c="dimmed">
                                                    Non trouves
                                                </Text>
                                                <Text size="xl" fw={700} c="gray">
                                                    {summary.notFound.length}
                                                </Text>
                                            </div>
                                        </Group>
                                    </Paper>
                                </Group>

                                {/* List of users without tag */}
                                {summary.usersWithoutTag.length > 0 && (
                                    <>
                                        <Divider />
                                        <div>
                                            <Text size="sm" fw={600} mb="xs">
                                                Utilisateurs sans le tag EXORDE ({summary.usersWithoutTag.length})
                                            </Text>
                                            <ScrollArea h={200}>
                                                <Stack gap="xs">
                                                    {summary.usersWithoutTag.map((result, idx) => (
                                                        <Paper key={idx} withBorder p="xs" radius="sm">
                                                            <Group justify="space-between">
                                                                <div>
                                                                    <Text size="sm" fw={500}>
                                                                        {result.user?.firstName} {result.user?.lastName}
                                                                    </Text>
                                                                    <Text size="xs" c="dimmed">
                                                                        {result.email}
                                                                    </Text>
                                                                </div>
                                                                <Badge color="orange" variant="light">
                                                                    Sans EXORDE
                                                                </Badge>
                                                            </Group>
                                                        </Paper>
                                                    ))}
                                                </Stack>
                                            </ScrollArea>
                                        </div>
                                    </>
                                )}

                                {/* Action buttons */}
                                <Group justify="flex-end" mt="md">
                                    <Button variant="subtle" onClick={() => setSummary(null)}>
                                        Nouveau fichier
                                    </Button>
                                    {summary.usersWithoutTag.length > 0 && (
                                        <Button
                                            onClick={handleAddTag}
                                            loading={addingTag}
                                            leftSection={<IconTag size={16} />}
                                            color="cyan"
                                        >
                                            Ajouter le tag EXORDE a {summary.usersWithoutTag.length} utilisateur{summary.usersWithoutTag.length > 1 ? 's' : ''}
                                        </Button>
                                    )}
                                </Group>
                            </Stack>
                        </Paper>
                    </>
                )}

                {/* Tag add result */}
                {tagAddResult && (
                    <>
                        <Divider my="sm" />

                        <Alert
                            icon={tagAddResult.errors === 0 ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
                            color={tagAddResult.errors === 0 ? 'green' : 'orange'}
                            variant="light"
                        >
                            <Text size="sm" fw={500}>
                                {tagAddResult.success} utilisateur{tagAddResult.success > 1 ? 's' : ''} mis a jour avec succes
                                {tagAddResult.errors > 0 && ` (${tagAddResult.errors} erreur${tagAddResult.errors > 1 ? 's' : ''})`}
                            </Text>
                            <Text size="xs" mt="xs">
                                Le tag EXORDE a ete ajoute aux utilisateurs selectionnes.
                            </Text>
                        </Alert>

                        <Group justify="flex-end">
                            <Button onClick={handleClose}>Fermer</Button>
                        </Group>
                    </>
                )}
            </Stack>
        </Modal>
    );
}
