import { Stack, Title, Text, Button, Badge, Group } from '@mantine/core';

interface WelcomeStepProps {
  onNext: () => void;
  planName: string;
}

export const WelcomeStep = ({ onNext, planName }: WelcomeStepProps) => {
  return (
    <div className="fade-in" style={{ textAlign: 'center' }}>
      <Stack gap={28} align="center">
        <div>
          <Title
            order={1}
            size={32}
            fw={900}
            style={{
              letterSpacing: '0.02em',
              marginBottom: '8px',
            }}
          >
            Bienvenue
          </Title>
          <Text size="md" c="gray.6" fw={600}>
            Rejoignez la communauté Fornap
          </Text>
        </div>

        <div
          style={{
            padding: '20px 24px',
            borderRadius: '8px',
            background: '#fafafa',
            border: '2px solid #000',
            maxWidth: '100%',
          }}
        >
          <Text size="sm" fw={600} mb={10} lh={1.6}>
            Quelques étapes simples pour rejoindre une communauté de créateurs et entrepreneurs.
          </Text>
          <Group gap={8} justify="center">
            <Text size="sm" c="gray.7">
              Formule :
            </Text>
            <Badge
              size="md"
              color="dark"
              style={{
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              {planName}
            </Badge>
          </Group>
        </div>

        <Stack gap={10} style={{ width: '100%' }}>
          <Text size="xs" c="gray.6" fw={500}>
            Environ 2 minutes
          </Text>
          <Button
            size="lg"
            onClick={onNext}
            styles={{
              root: {
                background: '#000',
                color: '#fff',
                borderRadius: '8px',
                height: '48px',
                fontSize: '15px',
                fontWeight: 700,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: '#212529',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                },
              },
            }}
          >
            Commencer
          </Button>
        </Stack>
      </Stack>
    </div>
  );
};
