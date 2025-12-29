import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Paper,
    Group,
    Button,
    Text,
    Badge,
    LoadingOverlay,
    Table,
    Grid,
    Card,
    Stack,
    ActionIcon,
    TextInput,
    Modal,
    Progress,
    Tooltip,
    Menu,
    Avatar,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconRefresh,
    IconSearch,
    IconCheck,
    IconX,
    IconTicket,
    IconUsers,
    IconCurrencyEuro,
    IconQrcode,
    IconTrash,
    IconDots,
    IconExternalLink,
    IconPlayerStop,
    IconMail,
    IconAlertTriangle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    getInkipitParticipants,
    getInkipitStats,
    unscanInkipitTicket,
    type InkipitParticipant,
    type InkipitStats,
} from '../../../shared/services/inkipitService';
import { cancelPurchase } from '../../../shared/services/purchaseCancellationService';

export function InkipitEventPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState<InkipitParticipant[]>([]);
    const [stats, setStats] = useState<InkipitStats | null>(null);
    const [search, setSearch] = useState('');

    // Modal d'annulation
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [participantToCancel, setParticipantToCancel] = useState<InkipitParticipant | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Modal d'annulation de scan
    const [unscanModalOpen, setUnscanModalOpen] = useState(false);
    const [participantToUnscan, setParticipantToUnscan] = useState<InkipitParticipant | null>(null);
    const [unscanReason, setUnscanReason] = useState('');
    const [unscanning, setUnscanning] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [participantsData, statsData] = await Promise.all([
                getInkipitParticipants(),
                getInkipitStats(),
            ]);
            setParticipants(participantsData);
            setStats(statsData);
        } catch (error) {
            notifications.show({
                title: 'Erreur',
                message: 'Impossible de charger les données',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    // Détecter les utilisateurs avec plusieurs achats (doublons - erreur car nominatif)
    const duplicateUserIds = new Set<string>();
    const userPurchaseCount = new Map<string, number>();
    participants.forEach((p) => {
        if (!p.cancelled) {
            const count = (userPurchaseCount.get(p.userId) || 0) + 1;
            userPurchaseCount.set(p.userId, count);
            if (count > 1) {
                duplicateUserIds.add(p.userId);
            }
        }
    });

    // Nombre de doublons pour les stats
    const duplicateCount = duplicateUserIds.size;

    // Vérifier si un participant est un doublon
    const isDuplicate = (participant: InkipitParticipant): boolean => {
        return duplicateUserIds.has(participant.userId) && !participant.cancelled;
    };

    // Générer le mailto pour un doublon
    const getMailtoLink = (participant: InkipitParticipant): string => {
        const subject = encodeURIComponent('PACK PARTY HARDER - Achat en double');
        const body = encodeURIComponent(
            `Bonjour ${participant.firstName},\n\n` +
            `Nous avons remarqué que vous avez acheté plusieurs PACK PARTY HARDER.\n` +
            `Or, chaque pass est nominatif et correspond à une seule personne.\n\n` +
            `Pourriez-vous nous indiquer pour qui sont destinés les autres pass ?\n` +
            `Nous avons besoin des informations suivantes pour chaque personne :\n` +
            `- Nom\n- Prénom\n- Email\n\n` +
            `Merci de votre compréhension.\n\n` +
            `L'équipe FOR+NAP`
        );
        return `mailto:${participant.email}?subject=${subject}&body=${body}`;
    };

    // Filtrer les participants
    const filteredParticipants = participants.filter((p) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            p.firstName.toLowerCase().includes(searchLower) ||
            p.lastName.toLowerCase().includes(searchLower) ||
            p.email.toLowerCase().includes(searchLower) ||
            p.userId.toLowerCase().includes(searchLower)
        );
    });

    // Ouvrir le modal d'annulation
    const openCancelModal = (participant: InkipitParticipant) => {
        setParticipantToCancel(participant);
        setCancelReason('');
        setCancelModalOpen(true);
    };

    // Annuler un billet
    const handleCancelTicket = async () => {
        if (!participantToCancel) return;

        setCancelling(true);
        try {
            const result = await cancelPurchase(
                participantToCancel.userId,
                participantToCancel.purchaseId,
                'current-admin-id', // TODO: Utiliser l'ID de l'admin connecté
                cancelReason || 'Annulé par admin'
            );

            if (result.success) {
                notifications.show({
                    title: 'Billet annulé',
                    message: `Le billet de ${participantToCancel.firstName} ${participantToCancel.lastName} a été annulé`,
                    color: 'green',
                });
                setCancelModalOpen(false);
                setParticipantToCancel(null);
                loadData();
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: result.error || 'Impossible d\'annuler le billet',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Erreur',
                message: 'Erreur lors de l\'annulation',
                color: 'red',
            });
        } finally {
            setCancelling(false);
        }
    };

    // Ouvrir le modal d'annulation de scan
    const openUnscanModal = (participant: InkipitParticipant) => {
        setParticipantToUnscan(participant);
        setUnscanReason('');
        setUnscanModalOpen(true);
    };

    // Annuler le scan
    const handleUnscan = async () => {
        if (!participantToUnscan) return;

        setUnscanning(true);
        try {
            const result = await unscanInkipitTicket(
                participantToUnscan.userId,
                participantToUnscan.purchaseId,
                'current-admin-id', // TODO: Utiliser l'ID de l'admin connecté
                unscanReason || 'Scan annulé par admin'
            );

            if (result.success) {
                notifications.show({
                    title: 'Scan annulé',
                    message: `Le check-in de ${participantToUnscan.firstName} ${participantToUnscan.lastName} a été annulé`,
                    color: 'green',
                });
                setUnscanModalOpen(false);
                setParticipantToUnscan(null);
                loadData();
            } else {
                notifications.show({
                    title: 'Erreur',
                    message: result.error || 'Impossible d\'annuler le scan',
                    color: 'red',
                });
            }
        } catch (error) {
            notifications.show({
                title: 'Erreur',
                message: 'Erreur lors de l\'annulation du scan',
                color: 'red',
            });
        } finally {
            setUnscanning(false);
        }
    };

    // Naviguer vers le scanner avec le bon mode
    const goToScanner = () => {
        // Ouvrir le scanner dans un nouvel onglet avec le mode event
        window.open('/scanner?event=inkipit', '_blank');
    };

    // Formater une date Timestamp
    const formatDate = (timestamp: any): string => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Container size="xl">
            <LoadingOverlay visible={loading} />

            {/* Header */}
            <Group justify="space-between" mb="xl">
                <Group>
                    <ActionIcon variant="subtle" onClick={() => navigate('/admin/events')}>
                        <IconArrowLeft size={20} />
                    </ActionIcon>
                    <div>
                        <Title order={1}>Soiree Inkipit</Title>
                        <Text c="dimmed" size="sm">
                            PACK PARTY HARDER - 20EUR
                        </Text>
                    </div>
                </Group>
                <Group>
                    <Button
                        variant="light"
                        leftSection={<IconRefresh size={16} />}
                        onClick={loadData}
                    >
                        Actualiser
                    </Button>
                    <Button
                        leftSection={<IconQrcode size={16} />}
                        onClick={goToScanner}
                    >
                        Ouvrir le Scanner
                    </Button>
                </Group>
            </Group>

            {/* Stats Cards */}
            {stats && (
                <Grid mb="xl">
                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Billets Vendus
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {stats.totalSold}
                                    </Text>
                                    {stats.totalCancelled > 0 && (
                                        <Text size="xs" c="red">
                                            {stats.totalCancelled} annulé(s)
                                        </Text>
                                    )}
                                </div>
                                <IconTicket size={32} opacity={0.5} />
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Check-in
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {stats.totalScanned} / {stats.totalSold}
                                    </Text>
                                    <Progress value={stats.scanRate} size="sm" mt="xs" color="green" />
                                    <Text size="xs" c="dimmed" mt="xs">
                                        {stats.scanRate.toFixed(1)}% de présence
                                    </Text>
                                </div>
                                <IconUsers size={32} opacity={0.5} />
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        Revenus
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {stats.totalRevenue}EUR
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                        Prix moyen: {stats.totalSold > 0 ? (stats.totalRevenue / stats.totalSold).toFixed(0) : 0}EUR
                                    </Text>
                                </div>
                                <IconCurrencyEuro size={32} opacity={0.5} />
                            </Group>
                        </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                        <Card withBorder bg={duplicateCount > 0 ? 'red.0' : undefined}>
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" c={duplicateCount > 0 ? 'red' : 'dimmed'} tt="uppercase" fw={700}>
                                        {duplicateCount > 0 ? 'Doublons !' : 'Non scannés'}
                                    </Text>
                                    <Text size="xl" fw={700} c={duplicateCount > 0 ? 'red' : (stats.totalSold - stats.totalScanned > 0 ? 'orange' : 'green')}>
                                        {duplicateCount > 0 ? duplicateCount : stats.totalSold - stats.totalScanned}
                                    </Text>
                                    <Text size="xs" c={duplicateCount > 0 ? 'red' : 'dimmed'}>
                                        {duplicateCount > 0 ? 'Pass nominatifs en double' : 'En attente d\'entree'}
                                    </Text>
                                </div>
                                {duplicateCount > 0 ? <IconAlertTriangle size={32} color="red" /> : <IconQrcode size={32} opacity={0.5} />}
                            </Group>
                        </Card>
                    </Grid.Col>
                </Grid>
            )}

            {/* Search + List */}
            <Paper p="md" withBorder>
                <Group justify="space-between" mb="md">
                    <Title order={3}>Participants ({filteredParticipants.length})</Title>
                    <TextInput
                        placeholder="Rechercher par nom, email..."
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        style={{ width: 300 }}
                    />
                </Group>

                <Table highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Participant</Table.Th>
                            <Table.Th>Date d'achat</Table.Th>
                            <Table.Th>Scanné</Table.Th>
                            <Table.Th>Statut</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredParticipants.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={6}>
                                    <Text ta="center" c="dimmed" py="xl">
                                        Aucun participant trouvé
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            filteredParticipants.map((participant) => {
                                const hasDuplicate = isDuplicate(participant);
                                return (
                                    <Table.Tr
                                        key={`${participant.userId}-${participant.purchaseId}`}
                                        style={{
                                            opacity: participant.cancelled ? 0.5 : 1,
                                            backgroundColor: participant.cancelled
                                                ? 'var(--mantine-color-red-0)'
                                                : hasDuplicate
                                                    ? 'var(--mantine-color-red-1)'
                                                    : undefined,
                                        }}
                                    >
                                        <Table.Td>
                                            <Group gap="sm">
                                                <Avatar color={hasDuplicate ? 'red' : 'indigo'} radius="xl" size="sm">
                                                    {participant.firstName?.[0]}
                                                    {participant.lastName?.[0]}
                                                </Avatar>
                                                <div>
                                                    <Group gap="xs">
                                                        <Text
                                                            size="sm"
                                                            fw={500}
                                                            c={hasDuplicate ? 'red' : undefined}
                                                            td={participant.cancelled ? 'line-through' : undefined}
                                                        >
                                                            {participant.firstName} {participant.lastName}
                                                        </Text>
                                                        {hasDuplicate && (
                                                            <Tooltip label={`Cette personne a ${userPurchaseCount.get(participant.userId)} achats - Les pass sont nominatifs !`}>
                                                                <Badge color="red" size="xs" leftSection={<IconAlertTriangle size={10} />}>
                                                                    x{userPurchaseCount.get(participant.userId)}
                                                                </Badge>
                                                            </Tooltip>
                                                        )}
                                                    </Group>
                                                    <Text size="xs" c={hasDuplicate ? 'red' : 'dimmed'}>
                                                        {participant.email}
                                                    </Text>
                                                </div>
                                            </Group>
                                        </Table.Td>

                                        <Table.Td>
                                            <Text size="sm">{formatDate(participant.purchasedAt)}</Text>
                                        </Table.Td>

                                        <Table.Td>
                                            {participant.inkipitScanned ? (
                                                <Tooltip label={`Scanné le ${formatDate(participant.inkipitScannedAt)}`}>
                                                    <Badge color="green" leftSection={<IconCheck size={12} />}>
                                                        Présent
                                                    </Badge>
                                                </Tooltip>
                                            ) : (
                                                <Badge color="gray">Non scanné</Badge>
                                            )}
                                        </Table.Td>

                                        <Table.Td>
                                            {participant.cancelled ? (
                                                <Tooltip label={participant.cancellationReason || 'Annulé'}>
                                                    <Badge color="red" leftSection={<IconX size={12} />}>
                                                        Annulé
                                                    </Badge>
                                                </Tooltip>
                                            ) : (
                                                <Badge color="blue" variant="light">
                                                    {participant.amount}EUR
                                                </Badge>
                                            )}
                                        </Table.Td>

                                        <Table.Td>
                                            <Group gap="xs">
                                                {hasDuplicate && (
                                                    <Tooltip label="Envoyer un email pour clarifier">
                                                        <ActionIcon
                                                            variant="filled"
                                                            color="red"
                                                            component="a"
                                                            href={getMailtoLink(participant)}
                                                        >
                                                            <IconMail size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                                <Tooltip label="Voir le profil">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        onClick={() => navigate(`/admin/users/${participant.userId}`)}
                                                    >
                                                        <IconExternalLink size={16} />
                                                    </ActionIcon>
                                                </Tooltip>

                                                <Menu shadow="md" width={200}>
                                                    <Menu.Target>
                                                        <ActionIcon variant="subtle" color="gray">
                                                            <IconDots size={16} />
                                                        </ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Label>Actions</Menu.Label>
                                                        <Menu.Item
                                                            leftSection={<IconExternalLink size={14} />}
                                                            onClick={() => navigate(`/admin/users/${participant.userId}`)}
                                                        >
                                                            Voir le profil
                                                        </Menu.Item>

                                                        {participant.inkipitScanned && !participant.cancelled && (
                                                            <Menu.Item
                                                                leftSection={<IconPlayerStop size={14} />}
                                                                color="orange"
                                                                onClick={() => openUnscanModal(participant)}
                                                            >
                                                                Annuler le check-in
                                                            </Menu.Item>
                                                        )}

                                                        {!participant.cancelled && (
                                                            <>
                                                                <Menu.Divider />
                                                                <Menu.Item
                                                                    leftSection={<IconTrash size={14} />}
                                                                    color="red"
                                                                    onClick={() => openCancelModal(participant)}
                                                                >
                                                                    Annuler le billet
                                                                </Menu.Item>
                                                            </>
                                                        )}
                                                    </Menu.Dropdown>
                                                </Menu>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>

            {/* Modal d'annulation de billet */}
            <Modal
                opened={cancelModalOpen}
                onClose={() => !cancelling && setCancelModalOpen(false)}
                title="Annuler le billet"
                centered
            >
                <Stack gap="md">
                    {participantToCancel && (
                        <Text size="sm">
                            Êtes-vous sûr de vouloir annuler le billet de{' '}
                            <strong>
                                {participantToCancel.firstName} {participantToCancel.lastName}
                            </strong>{' '}
                            ?
                        </Text>
                    )}
                    <TextInput
                        label="Raison de l'annulation"
                        placeholder="Ex: Demande du client"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setCancelModalOpen(false)} disabled={cancelling}>
                            Retour
                        </Button>
                        <Button color="red" onClick={handleCancelTicket} loading={cancelling}>
                            Annuler le billet
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal d'annulation de scan */}
            <Modal
                opened={unscanModalOpen}
                onClose={() => !unscanning && setUnscanModalOpen(false)}
                title="Annuler le check-in"
                centered
            >
                <Stack gap="md">
                    {participantToUnscan && (
                        <Text size="sm">
                            Êtes-vous sûr de vouloir annuler le check-in de{' '}
                            <strong>
                                {participantToUnscan.firstName} {participantToUnscan.lastName}
                            </strong>{' '}
                            ? Cette personne pourra être scannée à nouveau.
                        </Text>
                    )}
                    <TextInput
                        label="Raison (optionnel)"
                        placeholder="Ex: Erreur de scan"
                        value={unscanReason}
                        onChange={(e) => setUnscanReason(e.currentTarget.value)}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setUnscanModalOpen(false)} disabled={unscanning}>
                            Retour
                        </Button>
                        <Button color="orange" onClick={handleUnscan} loading={unscanning}>
                            Annuler le check-in
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
