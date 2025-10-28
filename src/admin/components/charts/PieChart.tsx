import { PieChart as MantinePieChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';

interface PieChartProps {
  title: string;
  data: { name: string; value: number; color: string }[];
  height?: number;
}

export function PieChart({ title, data, height = 300 }: PieChartProps) {
  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Title order={4} mb="md">
        {title}
      </Title>
      <MantinePieChart
        h={height}
        data={data}
        withLabels
        withTooltip
        labelsType="percent"
      />
    </Paper>
  );
}
