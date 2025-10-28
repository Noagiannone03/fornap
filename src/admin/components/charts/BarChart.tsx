import { BarChart as MantineBarChart } from '@mantine/charts';
import { Paper, Title } from '@mantine/core';

interface BarChartProps {
  title: string;
  data: any[];
  dataKey: string;
  series: { name: string; color: string }[];
  height?: number;
}

export function BarChart({ title, data, dataKey, series, height = 300 }: BarChartProps) {
  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Title order={4} mb="md">
        {title}
      </Title>
      <MantineBarChart
        h={height}
        data={data}
        dataKey={dataKey}
        series={series}
        withLegend
        withTooltip
        gridAxis="xy"
      />
    </Paper>
  );
}
