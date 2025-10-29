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

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }: { name: string; percent: number }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
