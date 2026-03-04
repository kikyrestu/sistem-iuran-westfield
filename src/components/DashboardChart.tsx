'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { MonthlyData } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardChartProps {
  data: MonthlyData[];
  type?: 'bar' | 'line';
}

export default function DashboardChart({ data, type = 'bar' }: DashboardChartProps) {
  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: 'Pemasukan',
        data: data.map((d) => d.income),
        backgroundColor: type === 'bar' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: type === 'bar' ? 8 : 0,
        fill: type === 'line',
        tension: 0.4,
        pointRadius: type === 'line' ? 4 : 0,
        pointHoverRadius: 6,
      },
      {
        label: 'Pengeluaran',
        data: data.map((d) => d.expense),
        backgroundColor: type === 'bar' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: type === 'bar' ? 8 : 0,
        fill: type === 'line',
        tension: 0.4,
        pointRadius: type === 'line' ? 4 : 0,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function (context: any) {
            const value = context.raw as number;
            return `${context.dataset.label}: Rp ${value.toLocaleString('id-ID')}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: { size: 11 },
          callback: function (value: any) {
            if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
            if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
            return `Rp ${value}`;
          },
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      {type === 'bar' ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  );
}
