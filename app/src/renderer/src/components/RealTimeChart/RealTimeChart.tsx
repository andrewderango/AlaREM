import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js/auto'
import './RealTimeChart.css'
import type { ChartPoint } from 'src/common/types'

interface RealTimeChartProps {
  series1: {
    data: ChartPoint[]
    title: string
    xWidth: number
    yMin: number
    yMax: number
  }
  series2?: {
    data: ChartPoint[]
    title: string
    xWidth: number
    yMin: number
    yMax: number
  }
  width: number
  height: number
  xAxisFormatter?: (value: number) => string
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({
  series1,
  series2,
  width,
  height,
  xAxisFormatter = (value) => value.toString(),
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
  const [hiddenDatasets, setHiddenDatasets] = useState<number[]>([])

  const xWidth = Math.max(series1.xWidth, series2 ? series2.xWidth : 0)
  const yMin = Math.min(series1.yMin, series2 ? series2.yMin : 0)
  const yMax = Math.max(series1.yMax, series2 ? series2.yMax : 0)

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d')
      if (ctx) {
        Chart.register(...registerables)
        chartInstanceRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: series1.data.map((point) => point.x),
            datasets: [
              {
                label: series1.title,
                data: series1.data,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1,
              },
              ...(series2
                ? [
                    {
                      label: series2.title,
                      data: series2.data,
                      borderColor: 'rgba(192, 75, 75, 1)',
                      tension: 0.1,
                    },
                  ]
                : []),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 0,
            },
            scales: {
              x: {
                type: 'linear',
                position: 'bottom',
                min: series1.data.length > 0 ? series1.data[0].x : 0,
                max: series1.data.length > 0 ? series1.data[series1.data.length - 1].x : xWidth,
                title: {
                  display: true,
                  text: 'Time (s)',
                  color: 'rgba(255, 255, 255, 0.6)',
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.6)',
                  callback: xAxisFormatter,
                },
              },
              y: {
                min: yMin,
                max: yMax,
                title: {
                  display: true,
                  text: 'Potential Difference (mV)',
                  color: 'rgba(255, 255, 255, 0.6)',
                },
                ticks: {
                  color: 'rgba(255, 255, 255, 0.6)',
                },
              },
            },
            plugins: {
              legend: {
                position: 'bottom',
                onClick: (e, legendItem) => {
                  const index = legendItem.datasetIndex
                  setHiddenDatasets((prev) =>
                    prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
                  )
                },
                labels: {
                  color: 'rgba(255, 255, 255, 0.6)',
                },
              },
            },
          },
        })
      }
    }

    return (): void => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
    }
  }, [series1, series2])

  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.data.datasets[0].data = series1.data
      if (series2) {
        if (chartInstanceRef.current.data.datasets[1]) {
          chartInstanceRef.current.data.datasets[1].data = series2.data
        } else {
          chartInstanceRef.current.data.datasets.push({
            label: series2.title,
            data: series2.data,
            borderColor: 'rgba(192, 75, 75, 1)',
            tension: 0.1,
          })
        }
      }
      if (chartInstanceRef.current.options.scales && chartInstanceRef.current.options.scales.x) {
        chartInstanceRef.current.options.scales.x.min =
          series1.data.length > 0 ? series1.data[0].x : 0
        chartInstanceRef.current.options.scales.x.max =
          series1.data.length > 0 ? series1.data[series1.data.length - 1].x : xWidth
      }
      if (chartInstanceRef.current.options.scales && chartInstanceRef.current.options.scales.y) {
        chartInstanceRef.current.options.scales.y.min = yMin
        chartInstanceRef.current.options.scales.y.max = yMax
      }
      chartInstanceRef.current.data.datasets.forEach((dataset, index) => {
        dataset.hidden = hiddenDatasets.includes(index)
      })
      chartInstanceRef.current.update()
    }
  }, [series1, series2, hiddenDatasets])

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default RealTimeChart
