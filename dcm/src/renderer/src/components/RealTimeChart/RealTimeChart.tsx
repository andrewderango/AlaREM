import React, { useEffect, useRef } from 'react'
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
}

const RealTimeChart: React.FC<RealTimeChartProps> = ({ series1, series2, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const offscreenCanvas = canvasRef.current.transferControlToOffscreen()
      offscreenCanvas.width = width
      offscreenCanvas.height = height
      workerRef.current = new Worker(new URL('../../workers/chartWorker.ts', import.meta.url))

      workerRef.current.postMessage(
        {
          canvas: offscreenCanvas,
          width,
          height,
          series1,
          series2,
          xWidth: Math.max(series1.xWidth, series2 ? series2.xWidth : 0),
          yMin: Math.min(series1.yMin, series2 ? series2.yMin : 0),
          yMax: Math.max(series1.yMax, series2 ? series2.yMax : 0),
        },
        [offscreenCanvas],
      )

      workerRef.current.onmessage = (
        e: MessageEvent<{ type: string; index: number; hidden: boolean }>,
      ): void => {
        if (e.data.type === 'legendClick') {
          console.log(`Legend item ${e.data.index} clicked, hidden: ${e.data.hidden}`)
        }
      }
    }

    return (): void => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        series1,
        series2,
        width,
        height,
        xWidth: Math.max(series1.xWidth, series2 ? series2.xWidth : 0),
        yMin: Math.min(series1.yMin, series2 ? series2.yMin : 0),
        yMax: Math.max(series1.yMax, series2 ? series2.yMax : 0),
      })
    }
  }, [series1, series2, width, height])

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

export default RealTimeChart
