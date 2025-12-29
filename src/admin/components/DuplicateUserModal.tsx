import { useState, useEffect } from 'react';
import {
    Modal,
    Stack,
    Group,
    Text,
    Title,
    Paper,
    Badge,
    Button,
    Radio,
    Divider,
    LoadingOverlay,
    Alert,
    ScrollArea,
    Avatar,
    ThemeIcon,
    Grid,
    Checkbox,
    Tooltip,
} from '@mantine/core';
import {
    IconUser,
    IconPhone,
    IconMapPin,
    IconCalendar,
    IconCreditCard,
    IconShoppingCart,
    IconHistory,
    IconAlertTriangle,
    IconX,
    IconGitMerge,
    IconMail,
    IconTag,
    IconUserPlus,
} from '@tabler/icons-react';
import type { FullUserDetails, UserMergeData } from '../../shared/services/duplicateDetectionService';
import { getFullUserDetails } from '../../shared/services/duplicateDetectionService';
import { Timestamp } from 'firebase/firestore';
import {
    MEMBERSHIP_TYPE_LABELS,
    MEMBERSHIP_STATUS_LABELS,
    REGISTRATION_SOURCE_LABELS,
} from '../../shared/types/user';

interface DuplicateUserModalProps {
    opened: boolean;
    onClose: () => void;
    userAId: string;
    userBId: string;
    email: string;
    onMerge: (keepUserId: string, deleteUserId: string, mergeData: UserMergeData) => Promise<void>;
    onSkip: () => void;
    currentIndex: number;
    totalCount: number;
}

type FieldChoice = 'A' | 'B';

interface FieldChoices {
    email: FieldChoice;
    firstName: FieldChoice;
    lastName: FieldChoice;
    phone: FieldChoice;
    postalCode: FieldChoice;
    birthDate: FieldChoice;
    createdAt: FieldChoice;
    membership: FieldChoice;
    loyaltyPoints: FieldChoice;
    tags: FieldChoice;
    registrationSource: FieldChoice;
}

// Helper pour convertir differents formats de date en Date
function toDate(value: unknown): Date | null {
    if (!value) return null;

    // Si c'est deja une Date
    if (value instanceof Date) return value;

    // Si c'est un Timestamp Firebase
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
        try {
            return (value as Timestamp).toDate();
        } catch {
            return null;
        }
    }

    // Si c'est un objet avec seconds (timestamp serialise)
    if (value && typeof value === 'object' && 'seconds' in value) {
        try {
            return new Date((value as { seconds: number }).seconds * 1000);
        } catch {
            return null;
        }
    }

    // Si c'est une string
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Si c'est un number (timestamp ms)
    if (typeof value === 'number') {
        return new Date(value);
    }

    return null;
}

function formatDate(value: unknown): string {
    const date = toDate(value);
    if (!date) return 'Non defini';

    try {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return 'Date invalide';
    }
}

function formatDateTime(value: unknown): string {
    const date = toDate(value);
    if (!date) return 'Non defini';

    try {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return 'Date invalide';
    }
}

export function DuplicateUserModal({
    opened,
    onClose,
    userAId,
    userBId,
    email,
    onMerge,
    onSkip,
    currentIndex,
    totalCount,
}: DuplicateUserModalProps) {
    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [userADetails, setUserADetails] = useState<FullUserDetails | null>(null);
    const [userBDetails, setUserBDetails] = useState<FullUserDetails | null>(null);
    const [choices, setChoices] = useState<FieldChoices>({
        email: 'A',
        firstName: 'A',
        lastName: 'A',
        phone: 'A',
        postalCode: 'A',
        birthDate: 'A',
        createdAt: 'A',
        membership: 'A',
        loyaltyPoints: 'A',
        tags: 'A',
        registrationSource: 'A',
    });
    const [keepUser, setKeepUser] = useState<'A' | 'B'>('A');

    // États pour la sélection des achats (par ID)
    const [selectedPurchasesA, setSelectedPurchasesA] = useState<Set<string>>(new Set());
    const [selectedPurchasesB, setSelectedPurchasesB] = useState<Set<string>>(new Set());

    // Charger les details complets des deux utilisateurs
    useEffect(() => {
        if (opened && userAId && userBId) {
            loadUserDetails();
        }
    }, [opened, userAId, userBId]);

    const loadUserDetails = async () => {
        setLoading(true);
        try {
            const [detailsA, detailsB] = await Promise.all([
                getFullUserDetails(userAId),
                getFullUserDetails(userBId),
            ]);
            setUserADetails(detailsA);
            setUserBDetails(detailsB);

            // Par défaut, sélectionner tous les achats des deux comptes
            if (detailsA?.purchases) {
                setSelectedPurchasesA(new Set(detailsA.purchases.map(p => p.id)));
            }
            if (detailsB?.purchases) {
                setSelectedPurchasesB(new Set(detailsB.purchases.map(p => p.id)));
            }
        } catch (error) {
            console.error('Error loading user details:', error);
        } finally {
            setLoading(false);
        }
    };

    // Helpers pour gérer la sélection des achats
    const togglePurchaseA = (purchaseId: string) => {
        setSelectedPurchasesA(prev => {
            const newSet = new Set(prev);
            if (newSet.has(purchaseId)) {
                newSet.delete(purchaseId);
            } else {
                newSet.add(purchaseId);
            }
            return newSet;
        });
    };

    const togglePurchaseB = (purchaseId: string) => {
        setSelectedPurchasesB(prev => {
            const newSet = new Set(prev);
            if (newSet.has(purchaseId)) {
                newSet.delete(purchaseId);
            } else {
                newSet.add(purchaseId);
            }
            return newSet;
        });
    };

    const selectAllPurchasesA = (selected: boolean) => {
        if (selected && userADetails?.purchases) {
            setSelectedPurchasesA(new Set(userADetails.purchases.map(p => p.id)));
        } else {
            setSelectedPurchasesA(new Set());
        }
    };

    const selectAllPurchasesB = (selected: boolean) => {
        if (selected && userBDetails?.purchases) {
            setSelectedPurchasesB(new Set(userBDetails.purchases.map(p => p.id)));
        } else {
            setSelectedPurchasesB(new Set());
        }
    };

    const handleSelectAll = (choice: 'A' | 'B') => {
        setChoices({
            email: choice,
            firstName: choice,
            lastName: choice,
            phone: choice,
            postalCode: choice,
            birthDate: choice,
            createdAt: choice,
            membership: choice,
            loyaltyPoints: choice,
            tags: choice,
            registrationSource: choice,
        });
        // Ne change plus keepUser - le choix du compte a conserver est maintenant independant
    };

    const handleMerge = async () => {
        if (!userADetails || !userBDetails) return;

        setMerging(true);
        try {
            const userA = userADetails.user;
            const userB = userBDetails.user;

            // Le status de base vient du compte qu'on garde (pour isAccountBlocked, isCardBlocked, etc.)
            // Mais on remplace les tags par ceux du choix
            const baseStatus = keepUser === 'A' ? userA.status : userB.status;
            const selectedTags = choices.tags === 'A' ? (userA.status?.tags || []) : (userB.status?.tags || []);
            const mergedStatus = {
                ...baseStatus,
                tags: selectedTags,
            };

            // La registration vient du choix de source, pas du keepUser
            const selectedRegistration = choices.registrationSource === 'A' ? userA.registration : userB.registration;

            // Déterminer les achats à garder et à transférer selon keepUser
            // Si keepUser = A: on garde les achats sélectionnés de A, on transfère ceux de B
            // Si keepUser = B: on garde les achats sélectionnés de B, on transfère ceux de A
            const purchaseIdsToKeep = keepUser === 'A'
                ? Array.from(selectedPurchasesA)
                : Array.from(selectedPurchasesB);
            const purchaseIdsToTransfer = keepUser === 'A'
                ? Array.from(selectedPurchasesB)
                : Array.from(selectedPurchasesA);

            // Construire les donnees fusionnees selon les choix
            const mergeData: UserMergeData = {
                email: choices.email === 'A' ? userA.email : userB.email,
                firstName: choices.firstName === 'A' ? userA.firstName : userB.firstName,
                lastName: choices.lastName === 'A' ? userA.lastName : userB.lastName,
                phone: choices.phone === 'A' ? userA.phone : userB.phone,
                postalCode: choices.postalCode === 'A' ? userA.postalCode : userB.postalCode,
                birthDate: choices.birthDate === 'A' ? userA.birthDate : userB.birthDate,
                createdAt: choices.createdAt === 'A' ? userA.createdAt : userB.createdAt,
                currentMembership: choices.membership === 'A' ? userA.currentMembership : userB.currentMembership,
                loyaltyPoints: choices.loyaltyPoints === 'A' ? userA.loyaltyPoints : userB.loyaltyPoints,
                status: mergedStatus,
                registration: selectedRegistration,
                extendedProfile: keepUser === 'A' ? userA.extendedProfile : userB.extendedProfile,
                // Achats sélectionnés
                purchaseIdsToKeep,
                purchaseIdsToTransfer,
            };

            const keepUserId = keepUser === 'A' ? userAId : userBId;
            const deleteUserId = keepUser === 'A' ? userBId : userAId;

            await onMerge(keepUserId, deleteUserId, mergeData);
        } catch (error) {
            console.error('Error merging users:', error);
        } finally {
            setMerging(false);
        }
    };

    const userA = userADetails?.user;
    const userB = userBDetails?.user;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group>
                    <ThemeIcon size="lg" color="yellow" variant="light">
                        <IconGitMerge size={20} />
                    </ThemeIcon>
                    <div>
                        <Title order={4}>Fusion de comptes en double</Title>
                        <Text size="sm" c="dimmed">
                            {email} - Doublon {currentIndex + 1}/{totalCount}
                        </Text>
                    </div>
                </Group>
            }
            size="xl"
            centered
        >
            <LoadingOverlay visible={loading || merging} />

            {!loading && userA && userB && (
                <Stack gap="md">
                    {/* Selecteur du compte a conserver */}
                    <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Stack gap="xs">
                            <Text fw={600} size="sm">Quel compte conserver ?</Text>
                            <Text size="xs" c="dimmed">
                                Le compte conserve recevra les donnees fusionnees. L'autre sera marque comme "fusionne" et redirigera vers celui-ci.
                            </Text>
                            <Group grow>
                                <Paper
                                    withBorder
                                    p="sm"
                                    radius="md"
                                    bg={keepUser === 'A' ? 'blue.1' : 'white'}
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: keepUser === 'A' ? 'var(--mantine-color-blue-6)' : undefined,
                                        borderWidth: keepUser === 'A' ? 2 : 1,
                                    }}
                                    onClick={() => setKeepUser('A')}
                                >
                                    <Group gap="xs">
                                        <Radio checked={keepUser === 'A'} onChange={() => setKeepUser('A')} />
                                        <Avatar color="blue" size="sm">{userA.firstName[0]}{userA.lastName[0]}</Avatar>
                                        <div>
                                            <Text size="sm" fw={500}>User A - {userA.firstName} {userA.lastName}</Text>
                                            <Text size="xs" c="dimmed">Cree le {formatDate(userA.createdAt)}</Text>
                                        </div>
                                    </Group>
                                </Paper>
                                <Paper
                                    withBorder
                                    p="sm"
                                    radius="md"
                                    bg={keepUser === 'B' ? 'grape.1' : 'white'}
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: keepUser === 'B' ? 'var(--mantine-color-grape-6)' : undefined,
                                        borderWidth: keepUser === 'B' ? 2 : 1,
                                    }}
                                    onClick={() => setKeepUser('B')}
                                >
                                    <Group gap="xs">
                                        <Radio checked={keepUser === 'B'} onChange={() => setKeepUser('B')} />
                                        <Avatar color="grape" size="sm">{userB.firstName[0]}{userB.lastName[0]}</Avatar>
                                        <div>
                                            <Text size="sm" fw={500}>User B - {userB.firstName} {userB.lastName}</Text>
                                            <Text size="xs" c="dimmed">Cree le {formatDate(userB.createdAt)}</Text>
                                        </div>
                                    </Group>
                                </Paper>
                            </Group>
                        </Stack>
                    </Paper>

                    {/* Boutons de selection rapide */}
                    <Group justify="center" gap="md">
                        <Button
                            variant="light"
                            color="blue"
                            size="xs"
                            onClick={() => handleSelectAll('A')}
                        >
                            Prendre toutes les valeurs de A
                        </Button>
                        <Button
                            variant="light"
                            color="grape"
                            size="xs"
                            onClick={() => handleSelectAll('B')}
                        >
                            Prendre toutes les valeurs de B
                        </Button>
                    </Group>

                    <Divider label="Choisir les valeurs a conserver" labelPosition="center" />

                    <ScrollArea h={400}>
                        <Grid gutter="md">
                            {/* En-tete des colonnes */}
                            <Grid.Col span={4}>
                                <Text fw={600} ta="center" c="dimmed">Champ</Text>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Paper p="xs" bg="blue.0" radius="md">
                                    <Group justify="center" gap="xs">
                                        <Avatar color="blue" size="sm">{userA.firstName[0]}{userA.lastName[0]}</Avatar>
                                        <div>
                                            <Text size="sm" fw={600}>User A</Text>
                                            <Badge size="xs" color="blue">
                                                {formatDate(userA.createdAt)}
                                            </Badge>
                                        </div>
                                    </Group>
                                </Paper>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Paper p="xs" bg="grape.0" radius="md">
                                    <Group justify="center" gap="xs">
                                        <Avatar color="grape" size="sm">{userB.firstName[0]}{userB.lastName[0]}</Avatar>
                                        <div>
                                            <Text size="sm" fw={600}>User B</Text>
                                            <Badge size="xs" color="grape">
                                                {formatDate(userB.createdAt)}
                                            </Badge>
                                        </div>
                                    </Group>
                                </Paper>
                            </Grid.Col>

                            {/* Email */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconMail size={16} />
                                    <Text size="sm">Email</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userA.email || '-'}
                                    checked={choices.email === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, email: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userB.email || '-'}
                                    checked={choices.email === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, email: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Prenom */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconUser size={16} />
                                    <Text size="sm">Prenom</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userA.firstName || '-'}
                                    checked={choices.firstName === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, firstName: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userB.firstName || '-'}
                                    checked={choices.firstName === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, firstName: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Nom */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconUser size={16} />
                                    <Text size="sm">Nom</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userA.lastName || '-'}
                                    checked={choices.lastName === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, lastName: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userB.lastName || '-'}
                                    checked={choices.lastName === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, lastName: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Telephone */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconPhone size={16} />
                                    <Text size="sm">Telephone</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userA.phone || '-'}
                                    checked={choices.phone === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, phone: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userB.phone || '-'}
                                    checked={choices.phone === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, phone: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Code postal */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconMapPin size={16} />
                                    <Text size="sm">Code postal</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userA.postalCode || '-'}
                                    checked={choices.postalCode === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, postalCode: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={userB.postalCode || '-'}
                                    checked={choices.postalCode === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, postalCode: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Date de naissance */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconCalendar size={16} />
                                    <Text size="sm">Date de naissance</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={formatDate(userA.birthDate)}
                                    checked={choices.birthDate === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, birthDate: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={formatDate(userB.birthDate)}
                                    checked={choices.birthDate === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, birthDate: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Date de creation */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconCalendar size={16} />
                                    <Text size="sm">Date de creation</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={formatDate(userA.createdAt)}
                                    checked={choices.createdAt === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, createdAt: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={formatDate(userB.createdAt)}
                                    checked={choices.createdAt === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, createdAt: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Source d'inscription */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconUserPlus size={16} />
                                    <Text size="sm">Source d'inscription</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    checked={choices.registrationSource === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, registrationSource: 'A' }))}
                                    label={
                                        <Badge size="sm" variant="light">
                                            {REGISTRATION_SOURCE_LABELS[userA.registration?.source || 'platform']}
                                        </Badge>
                                    }
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    checked={choices.registrationSource === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, registrationSource: 'B' }))}
                                    label={
                                        <Badge size="sm" variant="light">
                                            {REGISTRATION_SOURCE_LABELS[userB.registration?.source || 'platform']}
                                        </Badge>
                                    }
                                />
                            </Grid.Col>

                            <Grid.Col span={12}>
                                <Divider my="xs" />
                            </Grid.Col>

                            {/* Abonnement */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconCreditCard size={16} />
                                    <Text size="sm">Abonnement</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    checked={choices.membership === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, membership: 'A' }))}
                                    label={
                                        <Stack gap={2}>
                                            <Badge size="sm" color={userA.currentMembership?.status === 'active' ? 'green' : 'red'}>
                                                {MEMBERSHIP_STATUS_LABELS[userA.currentMembership?.status || 'pending']}
                                            </Badge>
                                            <Text size="xs">{MEMBERSHIP_TYPE_LABELS[userA.currentMembership?.planType || 'monthly']}</Text>
                                            <Text size="xs" c="dimmed">Exp: {formatDate(userA.currentMembership?.expiryDate)}</Text>
                                        </Stack>
                                    }
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    checked={choices.membership === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, membership: 'B' }))}
                                    label={
                                        <Stack gap={2}>
                                            <Badge size="sm" color={userB.currentMembership?.status === 'active' ? 'green' : 'red'}>
                                                {MEMBERSHIP_STATUS_LABELS[userB.currentMembership?.status || 'pending']}
                                            </Badge>
                                            <Text size="xs">{MEMBERSHIP_TYPE_LABELS[userB.currentMembership?.planType || 'monthly']}</Text>
                                            <Text size="xs" c="dimmed">Exp: {formatDate(userB.currentMembership?.expiryDate)}</Text>
                                        </Stack>
                                    }
                                />
                            </Grid.Col>

                            {/* Points de fidelite */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconHistory size={16} />
                                    <Text size="sm">Points de fidelite</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={`${userA.loyaltyPoints || 0} points`}
                                    checked={choices.loyaltyPoints === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, loyaltyPoints: 'A' }))}
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    label={`${userB.loyaltyPoints || 0} points`}
                                    checked={choices.loyaltyPoints === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, loyaltyPoints: 'B' }))}
                                />
                            </Grid.Col>

                            {/* Tags */}
                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconTag size={16} />
                                    <Text size="sm">Tags</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    checked={choices.tags === 'A'}
                                    onChange={() => setChoices(c => ({ ...c, tags: 'A' }))}
                                    label={
                                        <Group gap={4} wrap="wrap">
                                            {(userA.status?.tags || []).length > 0 ? (
                                                userA.status.tags.slice(0, 3).map((tag, i) => (
                                                    <Badge key={i} size="xs" variant="light">{tag}</Badge>
                                                ))
                                            ) : (
                                                <Text size="xs" c="dimmed">Aucun tag</Text>
                                            )}
                                        </Group>
                                    }
                                />
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Radio
                                    checked={choices.tags === 'B'}
                                    onChange={() => setChoices(c => ({ ...c, tags: 'B' }))}
                                    label={
                                        <Group gap={4} wrap="wrap">
                                            {(userB.status?.tags || []).length > 0 ? (
                                                userB.status.tags.slice(0, 3).map((tag, i) => (
                                                    <Badge key={i} size="xs" variant="light">{tag}</Badge>
                                                ))
                                            ) : (
                                                <Text size="xs" c="dimmed">Aucun tag</Text>
                                            )}
                                        </Group>
                                    }
                                />
                            </Grid.Col>

                            <Grid.Col span={12}>
                                <Divider my="xs" label="Achats a conserver (selectionnez ceux a garder)" labelPosition="center" />
                            </Grid.Col>

                            {/* Achats User A */}
                            <Grid.Col span={6}>
                                <Paper withBorder p="sm" radius="md" bg="blue.0">
                                    <Group justify="space-between" mb="xs">
                                        <Group gap="xs">
                                            <IconShoppingCart size={16} />
                                            <Text size="sm" fw={600}>Achats User A</Text>
                                            <Badge size="xs" color="blue">{selectedPurchasesA.size}/{userADetails?.purchases.length || 0}</Badge>
                                        </Group>
                                        <Group gap="xs">
                                            <Button
                                                size="xs"
                                                variant="subtle"
                                                onClick={() => selectAllPurchasesA(true)}
                                            >
                                                Tout
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="subtle"
                                                color="gray"
                                                onClick={() => selectAllPurchasesA(false)}
                                            >
                                                Aucun
                                            </Button>
                                        </Group>
                                    </Group>
                                    <Stack gap={4} mah={150} style={{ overflowY: 'auto' }}>
                                        {(userADetails?.purchases.length || 0) === 0 ? (
                                            <Text size="xs" c="dimmed" fs="italic">Aucun achat</Text>
                                        ) : (
                                            userADetails?.purchases.map((p) => (
                                                <Checkbox
                                                    key={p.id}
                                                    size="xs"
                                                    checked={selectedPurchasesA.has(p.id)}
                                                    onChange={() => togglePurchaseA(p.id)}
                                                    label={
                                                        <Tooltip label={`ID: ${p.id}`} withArrow>
                                                            <Text size="xs">
                                                                {formatDateTime(p.purchasedAt)} - {p.itemName || p.type || 'Achat'} ({p.amount}€)
                                                            </Text>
                                                        </Tooltip>
                                                    }
                                                />
                                            ))
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            {/* Achats User B */}
                            <Grid.Col span={6}>
                                <Paper withBorder p="sm" radius="md" bg="grape.0">
                                    <Group justify="space-between" mb="xs">
                                        <Group gap="xs">
                                            <IconShoppingCart size={16} />
                                            <Text size="sm" fw={600}>Achats User B</Text>
                                            <Badge size="xs" color="grape">{selectedPurchasesB.size}/{userBDetails?.purchases.length || 0}</Badge>
                                        </Group>
                                        <Group gap="xs">
                                            <Button
                                                size="xs"
                                                variant="subtle"
                                                onClick={() => selectAllPurchasesB(true)}
                                            >
                                                Tout
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="subtle"
                                                color="gray"
                                                onClick={() => selectAllPurchasesB(false)}
                                            >
                                                Aucun
                                            </Button>
                                        </Group>
                                    </Group>
                                    <Stack gap={4} mah={150} style={{ overflowY: 'auto' }}>
                                        {(userBDetails?.purchases.length || 0) === 0 ? (
                                            <Text size="xs" c="dimmed" fs="italic">Aucun achat</Text>
                                        ) : (
                                            userBDetails?.purchases.map((p) => (
                                                <Checkbox
                                                    key={p.id}
                                                    size="xs"
                                                    checked={selectedPurchasesB.has(p.id)}
                                                    onChange={() => togglePurchaseB(p.id)}
                                                    label={
                                                        <Tooltip label={`ID: ${p.id}`} withArrow>
                                                            <Text size="xs">
                                                                {formatDateTime(p.purchasedAt)} - {p.itemName || p.type || 'Achat'} ({p.amount}€)
                                                            </Text>
                                                        </Tooltip>
                                                    }
                                                />
                                            ))
                                        )}
                                    </Stack>
                                </Paper>
                            </Grid.Col>

                            <Grid.Col span={12}>
                                <Divider my="xs" label="Historique (transfere automatiquement)" labelPosition="center" />
                            </Grid.Col>

                            <Grid.Col span={4}>
                                <Group gap="xs">
                                    <IconHistory size={16} />
                                    <Text size="sm" c="dimmed">Historique</Text>
                                </Group>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Text size="sm">{userADetails?.actionHistory.length || 0} action(s)</Text>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Text size="sm">{userBDetails?.actionHistory.length || 0} action(s)</Text>
                            </Grid.Col>
                        </Grid>
                    </ScrollArea>

                    <Alert icon={<IconAlertTriangle size={16} />} color={keepUser === 'A' ? 'blue' : 'grape'} variant="light">
                        <Text size="sm">
                            <strong>{keepUser === 'A' ? `${userA.firstName} ${userA.lastName}` : `${userB.firstName} ${userB.lastName}`}</strong> (User {keepUser}) sera conserve.
                            <br />
                            <strong>{keepUser === 'A' ? `${userB.firstName} ${userB.lastName}` : `${userA.firstName} ${userA.lastName}`}</strong> sera marque comme "fusionne" et redirigera vers le compte conserve.
                            <br />
                            Tous les achats et l'historique seront transferes.
                        </Text>
                    </Alert>

                    <Divider />

                    {/* Boutons d'action */}
                    <Group justify="space-between">
                        <Button
                            variant="subtle"
                            color="gray"
                            leftSection={<IconX size={16} />}
                            onClick={onSkip}
                        >
                            Passer ce doublon
                        </Button>
                        <Group>
                            <Button
                                variant="light"
                                onClick={onClose}
                            >
                                Annuler
                            </Button>
                            <Button
                                color="green"
                                leftSection={<IconGitMerge size={16} />}
                                onClick={handleMerge}
                                loading={merging}
                            >
                                Fusionner les comptes
                            </Button>
                        </Group>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
