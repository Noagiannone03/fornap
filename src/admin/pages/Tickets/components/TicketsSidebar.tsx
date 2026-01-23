import { Paper, Stack, NavLink, Text, Badge, Divider, Group, Checkbox, Box } from '@mantine/core';
import {
    IconInbox,
    IconClock,
    IconCheck,
    IconAlertCircle,
    IconFilter,
    IconTag,
    IconArchive,
} from '@tabler/icons-react';
import { TicketPriority, TicketType, TICKET_PRIORITY_LABELS, TICKET_TYPE_LABELS } from '../../../../shared/types/ticket';

interface TicketsSidebarProps {
    activeView: string;
    onViewChange: (view: string) => void;
    counts: {
        active: number;
        waiting: number;
        processed: number;
        unread: number;
    };
    selectedPriorities: TicketPriority[];
    onPriorityChange: (priorities: TicketPriority[]) => void;
    selectedTypes: TicketType[];
    onTypeChange: (types: TicketType[]) => void;
}

export function TicketsSidebar({
    activeView,
    onViewChange,
    counts,
    selectedPriorities,
    onPriorityChange,
    selectedTypes,
    onTypeChange,
}: TicketsSidebarProps) {

    const togglePriority = (priority: TicketPriority) => {
        if (selectedPriorities.includes(priority)) {
            onPriorityChange(selectedPriorities.filter(p => p !== priority));
        } else {
            onPriorityChange([...selectedPriorities, priority]);
        }
    };

    const toggleType = (type: TicketType) => {
        if (selectedTypes.includes(type)) {
            onTypeChange(selectedTypes.filter(t => t !== type));
        } else {
            onTypeChange([...selectedTypes, type]);
        }
    };

    return (
        <Box h="100%" pr="md">
            <Stack gap={4}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" px="sm">Boîte de réception</Text>

                <NavLink
                    label="À Traiter"
                    labelPosition="right"
                    leftSection={<IconInbox size={18} />}
                    active={activeView === 'active'}
                    onClick={() => onViewChange('active')}
                    rightSection={counts.active > 0 && <Badge size="xs" variant="filled" color="blue" circle>{counts.active}</Badge>}
                    variant="subtle"
                    color="blue"
                    fw={600}
                    className="rounded-nav"
                    styles={{ root: { borderRadius: 8 } }}
                />

                <NavLink
                    label="En Attente"
                    labelPosition="right"
                    leftSection={<IconClock size={18} />}
                    active={activeView === 'waiting'}
                    onClick={() => onViewChange('waiting')}
                    rightSection={counts.waiting > 0 && <Badge size="xs" variant="light" color="orange" circle>{counts.waiting}</Badge>}
                    variant="subtle"
                    color="orange"
                    fw={500}
                    styles={{ root: { borderRadius: 8 } }}
                />

                <NavLink
                    label="Résolus / Archivés"
                    labelPosition="right"
                    leftSection={<IconArchive size={18} />}
                    active={activeView === 'processed'}
                    onClick={() => onViewChange('processed')}
                    variant="subtle"
                    color="gray"
                    fw={500}
                    styles={{ root: { borderRadius: 8 } }}
                />

                <Divider my="md" />

                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs" px="sm">Filtres Rapides</Text>

                <Box px="sm" mb="md">
                    <Stack gap={8}>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                            <Checkbox
                                key={key}
                                label={label}
                                checked={selectedPriorities.includes(key as TicketPriority)}
                                onChange={() => togglePriority(key as TicketPriority)}
                                size="xs"
                                color="dark"
                                styles={{ label: { fontSize: '0.9rem', color: 'var(--mantine-color-gray-7)' } }}
                            />
                        ))}
                    </Stack>
                </Box>

                <Box px="sm">
                    <Text size="xs" c="dimmed" mb={8} fw={600}>Type</Text>
                    <Stack gap={8}>
                        {Object.entries(TICKET_TYPE_LABELS).map(([key, label]) => (
                            <Checkbox
                                key={key}
                                label={label}
                                checked={selectedTypes.includes(key as TicketType)}
                                onChange={() => toggleType(key as TicketType)}
                                size="xs"
                                color="gray"
                                styles={{ label: { fontSize: '0.9rem', color: 'var(--mantine-color-gray-7)' } }}
                            />
                        ))}
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
