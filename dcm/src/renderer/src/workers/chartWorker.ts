import { Chart, registerables } from 'chart.js'

interface EgramData {
  atrial: number[]
  ventrical: number[]
}

interface MessageData {
  data: Record<string, EgramData>
  rootTime: number
  canvas: OffscreenCanvas
  width: number
  height: number
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
  xWidth: number
  yMin: number
  yMax: number
}

interface ChartPoint {
  x: number
  y: number
}

self.onmessage = (e: MessageEvent<MessageData>): void => {
  const { canvas, series1, series2, xWidth, yMin, yMax } = e.data
  const ctx = canvas.getContext('2d')

  if (ctx) {
    Chart.register(...registerables)
    const chart = new Chart(ctx as any, {
      type: 'line',
      data: {
        labels: series1.data.map((point) => point.x),
        datasets: [
          {
            label: series1.title,
            data: series1.data,
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1,
            pointRadius: 0,
          },
          ...(series2
            ? [
                {
                  label: series2.title,
                  data: series2.data,
                  borderColor: 'rgba(192, 75, 75, 1)',
                  tension: 0.1,
                  pointRadius: 0,
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
            },
          },
          y: {
            min: yMin,
            max: yMax,
            title: {
              display: true,
              text: 'Potential Difference (mV)',
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            onClick: (e, legendItem): void => {
              const index = legendItem.datasetIndex
              if (index !== undefined) {
                const meta = chart.getDatasetMeta(index)
                meta.hidden = !meta.hidden
                chart.update()
                self.postMessage({ type: 'legendClick', index, hidden: meta.hidden })
              }
            },
          },
        },
        parsing: false,
      },
    })

    self.onmessage = (e: MessageEvent<MessageData>): void => {
      const { series1, series2, width, height, xWidth, yMin, yMax } = e.data
      chart.data.datasets[0].data = series1.data
      if (series2) {
        if (chart.data.datasets[1]) {
          chart.data.datasets[1].data = series2.data
        } else {
          chart.data.datasets.push({
            label: series2.title,
            data: series2.data,
            borderColor: 'rgba(192, 75, 75, 1)',
            tension: 0.1,
            pointRadius: 0,
          })
        }
      }
      chart.options.scales?.x &&
        (chart.options.scales.x.min = series1.data.length > 0 ? series1.data[0].x : 0)
      chart.options.scales?.x &&
        (chart.options.scales.x.max =
          series1.data.length > 0 ? series1.data[series1.data.length - 1].x : xWidth)
      chart.options.scales?.y && (chart.options.scales.y.min = yMin)
      chart.options.scales?.y && (chart.options.scales.y.max = yMax)
      chart.resize(width, height)
      chart.update()
    }
  }
}
