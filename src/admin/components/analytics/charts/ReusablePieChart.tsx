import { Paper, Title, Text, Box } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature pour Recharts
}

interface ReusablePieChartProps {
  title: string;
  data: PieData[];
  height?: number;
  subtitle?: string;
  innerRadius?: number; // Pour faire un donut chart
}

export function ReusablePieChart({
  title,
  data,
  height = 300,
  subtitle,
  innerRadius = 0,
}: ReusablePieChartProps) {
  // Vérifier si les données sont vides ou nulles
  const hasData = data && data.length > 0 && data.some((item) => item.value > 0);

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Box mb="md">
        <Title order={3} size="h4">
          {title}
        </Title>
        {subtitle && (
          <Text size="sm" c="dimmed" mt={4}>
            {subtitle}
          </Text>
        )}
      </Box>

      {!hasData ? (
        <Box
          style={{
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text c="dimmed" size="sm">
            Aucune donnée à afficher
          </Text>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={innerRadius > 0 ? innerRadius + 40 : 100}
              fill="#8884d8"
              dataKey="value"
              label={(props: any) => {
                const { name, percent } = props;
                return `${name}: ${(percent * 100).toFixed(0)}%`;
              }}
              labelLine={true}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}
