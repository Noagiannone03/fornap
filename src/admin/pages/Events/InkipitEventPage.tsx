import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Paper,
    Group,
    Button,
    Text,
    Stack,
    ActionIcon,
    ThemeIcon,
    Alert,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconDownload,
    IconArchive,
    IconFileSpreadsheet,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    getInkipitParticipants,
    type InkipitParticipant,
} from '../../../shared/services/inkipitService';

/**
 * Page archivee de la Soiree Inkipit
 * L'evenement est termine - cette page permet uniquement d'exporter les donnees
 * Les donnees ne sont chargees qu'a la demande pour eviter de surcharger le site
 */
export function InkipitEventPage() {
    const navigate = useNavigate();
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | null>(null);

    /**
     * Formate une date Timestamp en string lisible
     */
    const formatDate = (timestamp: any): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * Exporte les donnees en CSV
     */
    const exportToCSV = (participants: InkipitParticipant[]) => {
        const headers = [
            'Prenom',
            'Nom',
            'Email',
            'Telephone',
            'Code Postal',
            'Date Achat',
            'Montant',
            'Statut Paiement',
            'Scanne',
            'Date Scan',
            'Annule',
            'Date Annulation',
            'Raison Annulation',
            'Invite',
            'Raison Invite',
            'Abonnement Actif',
            'Type Abonnement',
        ];

        const rows = participants.map((p) => [
            p.firstName,
            p.lastName,
            p.email,
            p.phone || '',
            p.postalCode || '',
            formatDate(p.purchasedAt),
            p.amount.toString(),
            p.paymentStatus,
            p.inkipitScanned ? 'Oui' : 'Non',
            p.inkipitScannedAt ? formatDate(p.inkipitScannedAt) : '',
            p.cancelled ? 'Oui' : 'Non',
            p.cancelledAt ? formatDate(p.cancelledAt) : '',
            p.cancellationReason || '',
            p.isInvite ? 'Oui' : 'Non',
            p.inviteReason || '',
            p.hasActiveSubscription ? 'Oui' : 'Non',
            p.membershipType || '',
        ]);

        // Escape CSV values
        const escapeCSV = (value: string) => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map(escapeCSV).join(',')),
        ].join('\n');

        // Add BOM for Excel compatibility with French characters
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `soiree-inkipit-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    /**
     * Exporte les donnees en XLSX
     */
    const exportToXLSX = async (participants: InkipitParticipant[]) => {
        // Dynamically import xlsx for code splitting
        const XLSX = await import('xlsx');

        const data = participants.map((p) => ({
            'Prenom': p.firstName,
            'Nom': p.lastName,
            'Email': p.email,
            'Telephone': p.phone || '',
            'Code Postal': p.postalCode || '',
            'Date Achat': formatDate(p.purchasedAt),
            'Montant': p.amount,
            'Statut Paiement': p.paymentStatus,
            'Scanne': p.inkipitScanned ? 'Oui' : 'Non',
            'Date Scan': p.inkipitScannedAt ? formatDate(p.inkipitScannedAt) : '',
            'Annule': p.cancelled ? 'Oui' : 'Non',
            'Date Annulation': p.cancelledAt ? formatDate(p.cancelledAt) : '',
            'Raison Annulation': p.cancellationReason || '',
            'Invite': p.isInvite ? 'Oui' : 'Non',
            'Raison Invite': p.inviteReason || '',
            'Abonnement Actif': p.hasActiveSubscription ? 'Oui' : 'Non',
            'Type Abonnement': p.membershipType || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

        // Auto-size columns
        const maxWidths: { [key: string]: number } = {};
        data.forEach((row) => {
            Object.entries(row).forEach(([key, value]) => {
                const len = String(value).length;
                if (!maxWidths[key] || len > maxWidths[key]) {
                    maxWidths[key] = Math.min(len, 50);
                }
            });
        });
        worksheet['!cols'] = Object.keys(maxWidths).map((key) => ({
            wch: Math.max(maxWidths[key], key.length) + 2,
        }));

        XLSX.writeFile(workbook, `soiree-inkipit-export-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    /**
     * Gere l'export des donnees (CSV ou XLSX)
     */
    const handleExport = async (format: 'csv' | 'xlsx') => {
        setExporting(true);
        setExportFormat(format);

        try {
            notifications.show({
                id: 'export-loading',
                title: 'Export en cours...',
                message: 'Recuperation des donnees depuis la base...',
                loading: true,
                autoClose: false,
            });

            // Fetch data only when export is requested
            const participants = await getInkipitParticipants();

            notifications.update({
                id: 'export-loading',
                title: 'Generation du fichier...',
                message: `${participants.length} participants trouves`,
                loading: true,
            });

            if (format === 'csv') {
                exportToCSV(participants);
            } else {
                await exportToXLSX(participants);
            }

            notifications.update({
                id: 'export-loading',
                title: 'Export termine',
                message: `${participants.length} participants exportes en ${format.toUpperCase()}`,
                color: 'green',
                loading: false,
                autoClose: 3000,
            });
        } catch (error: any) {
            console.error('Erreur lors de l\'export:', error);
            notifications.update({
                id: 'export-loading',
                title: 'Erreur',
                message: error.message || 'Impossible d\'exporter les donnees',
                color: 'red',
                loading: false,
                autoClose: 5000,
            });
        } finally {
            setExporting(false);
            setExportFormat(null);
        }
    };

    return (
        <Container size="md">
            {/* Header */}
            <Group justify="space-between" mb="xl">
                <Group>
                    <ActionIcon variant="subtle" onClick={() => navigate('/admin/events')}>
                        <IconArrowLeft size={20} />
                    </ActionIcon>
                    <div>
                        <Title order={1}>Soiree Inkipit</Title>
                        <Text c="dimmed" size="sm">
                            PACK PARTY HARDER - Evenement archive
                        </Text>
                    </div>
                </Group>
            </Group>

            {/* Archived State */}
            <Paper p="xl" withBorder radius="lg">
                <Stack align="center" gap="lg">
                    <ThemeIcon size={80} radius="xl" color="gray" variant="light">
                        <IconArchive size={40} />
                    </ThemeIcon>

                    <div style={{ textAlign: 'center' }}>
                        <Title order={2} mb="xs">
                            Soiree Archivee
                        </Title>
                        <Text c="dimmed" size="lg" maw={500}>
                            L'evenement Soiree Inkipit est termine.
                            Vous pouvez exporter les donnees des participants ci-dessous.
                        </Text>
                    </div>

                    <Alert
                        color="blue"
                        title="Donnees a la demande"
                        radius="md"
                        variant="light"
                        maw={500}
                    >
                        Les donnees ne sont pas chargees automatiquement pour eviter de ralentir le site.
                        Cliquez sur un des boutons ci-dessous pour telecharger l'export.
                    </Alert>

                    {/* Export Buttons */}
                    <Group gap="md">
                        <Button
                            size="lg"
                            leftSection={<IconDownload size={20} />}
                            onClick={() => handleExport('csv')}
                            loading={exporting && exportFormat === 'csv'}
                            disabled={exporting}
                        >
                            Exporter en CSV
                        </Button>
                        <Button
                            size="lg"
                            variant="light"
                            leftSection={<IconFileSpreadsheet size={20} />}
                            onClick={() => handleExport('xlsx')}
                            loading={exporting && exportFormat === 'xlsx'}
                            disabled={exporting}
                        >
                            Exporter en XLSX
                        </Button>
                    </Group>

                    <Text size="sm" c="dimmed">
                        L'export inclut: nom, email, telephone, date d'achat, statut scan, etc.
                    </Text>
                </Stack>
            </Paper>
        </Container>
    );
}
