import {
    Group,
    Title,
    Button,
    Paper,
    Text,
    TextInput,
    SegmentedControl,
    Select,
} from '@mantine/core';
import {
    IconSearch,
    IconRefresh,
    IconFilter,
} from '@tabler/icons-react';
import {
    TICKET_PRIORITY_LABELS,
} from '../../../../shared/types/ticket';

interface TicketsHeaderProps {
    loading: boolean;
    onRefresh: () => void;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    activeTab: string;
    onTabChange: (value: string) => void;
    typeFilter: string[];
    onTypeChange: (value: string[]) => void;
    priorityFilter: string[];
    onPriorityChange: (value: string[]) => void;
}

export function TicketsHeader({
    loading,
    onRefresh,
    searchQuery,
    onSearchChange,
    activeTab,
    onTabChange,
    typeFilter: _typeFilter,
    priorityFilter,
    onPriorityChange,
    onTypeChange: _onTypeChange
}: TicketsHeaderProps) {
    return (
        <div style={{ marginBottom: 'var(--mantine-spacing-xl)' }}>
            {/* 1. Title Line */}
            <Group justify="space-between" mb="lg" align="center">
                <div>
                    <Title order={2} fw={800} style={{ fontSize: '2rem' }}>Support</Title>
                    <Text c="dimmed" size="sm">Centre de gestion des tickets</Text>
                </div>
                <Button
                    leftSection={<IconRefresh size={16} />}
                    variant="default"
                    onClick={onRefresh}
                    loading={loading}
                >
                    Actualiser
                </Button>
            </Group>

            {/* 2. Toolbar Line */}
            <Paper p="sm" radius="md" withBorder bg="white">
                <Group justify="space-between" wrap="wrap" gap="sm">

                    {/* Left: View Filter Tabs */}
                    <SegmentedControl
                        value={activeTab}
                        onChange={onTabChange}
                        data={[
                            { label: 'À Traiter', value: 'active' },
                            { label: 'En Attente', value: 'waiting' },
                            { label: 'Résolus / Fermés', value: 'processed' },
                        ]}
                        radius="md"
                        size="sm"
                    />

                    {/* Right: Search & Quick Filters */}
                    <Group gap="xs" style={{ flexGrow: 1, maxWidth: 600 }} justify="flex-end">
                        <TextInput
                            placeholder="Rechercher (n°, sujet, email)..."
                            leftSection={<IconSearch size={16} />}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.currentTarget.value)}
                            style={{ flex: 1, minWidth: 200 }}
                            size="sm"
                        />

                        {/* Simple Dropdown for Priority - Quick access */}
                        <Select
                            placeholder="Priorité"
                            leftSection={<IconFilter size={16} />}
                            data={[
                                { value: 'all', label: 'Toutes' },
                                ...Object.entries(TICKET_PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }))
                            ]}
                            value={priorityFilter[0] || 'all'}
                            onChange={(val) => onPriorityChange(val === 'all' || !val ? [] : [val])}
                            size="sm"
                            style={{ width: 140 }}
                        />
                    </Group>

                </Group>
            </Paper>
        </div>
    );
}
