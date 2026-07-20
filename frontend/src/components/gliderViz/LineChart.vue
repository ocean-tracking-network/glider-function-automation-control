<!-- LineChart.vue -->
<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  type ChartData,
  type ChartOptions,
  TimeScale
} from 'chart.js'

import 'chartjs-adapter-date-fns'
import { computed } from 'vue';

const props = defineProps<{
    xAxis: any[],
    yAxis: any[]
}>()
// Register the Chart.js components you're using
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale
)

// const chartData: ChartData<'line'> = {
// }

const computedChartData = computed((): ChartData<'line'> => {
    return {
        labels: props.xAxis,
        datasets: [
            {
            label: 'Depth(m)',
            data: props.yAxis,
            borderColor: '#42b883',
            backgroundColor: 'rgba(66, 184, 131, 0.2)',
            tension: 0.4,
            cubicInterpolationMode: 'monotone'
            }
        ]
    }
})

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true
    },
    title: {
      display: false,
      text: 'Glider Data'
    }
  },
  scales: {
    x: {
        type: "time",
        time: {
            // unit: 'minute'
            // displayFormats: {

            // }
        }
    }
  }
}
</script>

<template>
  <div class="chart">
    <Line :data="computedChartData" :options="chartOptions" />
  </div>
</template>
<style scoped>
.chart{
    width: 100%;
    height: 300px;
}
</style>