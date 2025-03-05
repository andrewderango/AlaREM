import React, { useEffect, useState } from 'react'
import pacemakerHeart from '../../assets/pacemaker-heart.png'
import RealTimeChart from '../../components/RealTimeChart/RealTimeChart'
import { useToast } from '@renderer/context/ToastContext'
import useStore from '@renderer/store/mainStore'
import type { ChartPoint } from 'src/common/types'

interface MainContentProps {
  submittedMode:
    | 'VOO'
    | 'AOO'
    | 'VVI'
    | 'AAI'
    | 'VOOR'
    | 'AOOR'
    | 'VVIR'
    | 'AAIR'
    | 'OFF'
    | 'DDDR'
    | 'DDD'
    | null
  telemetryRate: number
  isRightSidebarVisible: boolean
}

const MainContent: React.FC<MainContentProps> = ({
  submittedMode,
  telemetryRate,
  isRightSidebarVisible,
}) => {
  const NUM_POINTS = 5000
  const [series1, setSeries1] = useState<ChartPoint[]>(() => {
    return Array.from({ length: NUM_POINTS }, () => ({ x: 0, y: 0 }))
  })
  const [series2, setSeries2] = useState<ChartPoint[]>(() => {
    return Array.from({ length: NUM_POINTS }, () => ({ x: 0, y: 0 }))
  })
  const [isEgramHidden, setIsEgramHidden] = useState(false)
  const [rootTime, setRootTime] = useState(0)
  const [heartRate, setHeartRate] = useState(0)
  const [prevHeartRateUpdateTime, setPrevHeartRateUpdateTime] = useState(Date.now())
  const [rateOfChange, setRateOfChange] = useState(0)
  const [heartRateState, setHeartRateState] = useState<'nominal' | 'warning' | 'critical'>(
    'nominal',
  )
  const { addToast } = useToast()
  const { dispatch } = useStore()

  useEffect(() => {
    const handleSerialDataMessage = (message: any): void => {
      if (message.type === 'data' && message.dataType === 'egram') {
        const newSeries1: ChartPoint[] = []
        const newSeries2: ChartPoint[] = []

        Object.entries(message.data).forEach(([timestamp, egramData]) => {
          const { atrial, ventrical }: { atrial: number[]; ventrical: number[] } = egramData as {
            atrial: number[]
            ventrical: number[]
          }
          const baseTimestamp = parseInt(timestamp, 10)
          if (rootTime === 0) {
            setRootTime(baseTimestamp)
          }

          const time = (baseTimestamp - rootTime) / 1000

          atrial.forEach((value: number, index: number) => {
            newSeries1.push({ x: time + index * 0.002, y: value })
          })
          ventrical.forEach((value: number, index: number) => {
            newSeries2.push({ x: time + index * 0.002, y: value })
          })
        })

        setSeries1((prev) => {
          const updatedSeries = [...prev, ...newSeries1]
          return updatedSeries.slice(-NUM_POINTS)
        })

        setSeries2((prev) => {
          const updatedSeries = [...prev, ...newSeries2]
          return updatedSeries.slice(-NUM_POINTS)
        })
      }
    }

    window.api.onSerialDataMessage(handleSerialDataMessage)

    return (): void => {
      window.api.removeSerialDataMessageListener()
    }
  }, [rootTime, setRootTime])

  useEffect(() => {
    const handleHideEgram = (): void => {
      setIsEgramHidden((prev) => !prev)
    }

    window.addEventListener('hideEgram', handleHideEgram)

    return (): void => {
      window.removeEventListener('hideEgram', handleHideEgram)
    }
  }, [])

  useEffect(() => {
    if (Date.now() - prevHeartRateUpdateTime > 1500) {
      const series1Values = series1.map((point) => point.y)
      const series2Values = series2.map((point) => point.y)
      const peaksSeries1: number[] = []
      const peaksSeries2: number[] = []
      const smoothingFactor = 0.5
      const threshold = 0.25
      let dipped = false

      for (let i = 1; i < series1Values.length - 1; i++) {
        if (
          series1Values[i] < series1Values[i - 1] &&
          series1Values[i] > series1Values[i + 1] &&
          series1Values[i] < threshold
        ) {
          if (!dipped) {
            peaksSeries1.push(i)
            dipped = true
          }
        } else if (
          series1Values[i] > series1Values[i - 1] &&
          series1Values[i] < series1Values[i + 1] &&
          series1Values[i] > threshold
        ) {
          dipped = false
        }
      }

      for (let i = 1; i < series2Values.length - 1; i++) {
        if (
          series2Values[i] < series2Values[i - 1] &&
          series2Values[i] > series2Values[i + 1] &&
          series2Values[i] < threshold
        ) {
          if (!dipped) {
            peaksSeries2.push(i)
            dipped = true
          }
        } else if (
          series2Values[i] > series2Values[i - 1] &&
          series2Values[i] < series2Values[i + 1] &&
          series2Values[i] > threshold
        ) {
          dipped = false
        }
      }

      const time = series1[series1.length - 1].x - series1[0].x
      const atrialHeartRate = (peaksSeries1.length / time) * 60
      const ventricalHeartRate = (peaksSeries2.length / time) * 60
      const currentHeartRate = Math.min(atrialHeartRate, ventricalHeartRate)
      const smoothedHeartRate = Math.round(
        currentHeartRate * smoothingFactor +
          (Number.isNaN(heartRate) ? 0 : heartRate) * (1 - smoothingFactor),
      )
      const newRateOfChange = smoothedHeartRate - heartRate
      setHeartRate(smoothedHeartRate)
      setRateOfChange(newRateOfChange)
      dispatch({ type: 'UPDATE_TELEMETRY', payload: { heartRate: smoothedHeartRate } })
      setPrevHeartRateUpdateTime(Date.now())

      if (
        (heartRate < 35 || rateOfChange < -10) &&
        !Number.isNaN(heartRate) &&
        rateOfChange !== 0
      ) {
        if (heartRateState !== 'critical') {
          setHeartRateState('critical')
        }
      } else if (rateOfChange < -5 && !Number.isNaN(heartRate) && rateOfChange !== 0) {
        if (heartRateState !== 'warning') {
          setHeartRateState('warning')
        }
      } else {
        if (heartRateState !== 'nominal') {
          setHeartRateState('nominal')
        }
      }
    }
  }, [series1, series2, heartRate, prevHeartRateUpdateTime, rateOfChange, heartRateState])

  useEffect(() => {
    if (heartRateState === 'critical') {
      addToast('Heart rate is critically low', 'error')
    } else if (heartRateState === 'warning') {
      addToast('Heart rate is low', 'error')
    }
  }, [heartRateState])

  const getHeartRateClass = (): string => {
    if (heartRateState === 'critical') {
      return 'stat-box critical'
    } else if (heartRateState === 'warning') {
      return 'stat-box warning'
    } else {
      return 'stat-box'
    }
  }

  return (
    <div className={`main-content ${isRightSidebarVisible ? '' : 'expanded'}`}>
      {isEgramHidden ? (
        <img
          alt="pacemaker heart"
          className={submittedMode === 'OFF' ? 'pacemaker-heart-stop' : 'pacemaker-heart'}
          src={pacemakerHeart}
        />
      ) : (
        <div className="electrogram-container">
          <h2>REAL-TIME ELECTROGRAM</h2>
          <div className="electrogram">
            <RealTimeChart
              series1={{
                data: series1,
                title: 'Atrium',
                xWidth: NUM_POINTS,
                yMin: 0,
                yMax: 1,
              }}
              series2={{
                data: series2,
                title: 'Ventricle',
                xWidth: NUM_POINTS,
                yMin: 0,
                yMax: 1,
              }}
              width={isRightSidebarVisible ? 550 : 900}
              height={500}
            />
          </div>
        </div>
      )}
      <div className="stats-container">
        <div className="stat-box">
          <h3>Current Mode</h3>
          <p>{submittedMode}</p>
        </div>
        <div className="stat-box">
          <h3>Telemetry Rate</h3>
          <p>{telemetryRate} Hz</p>
        </div>
        <div className={getHeartRateClass()}>
          <h3>Heart BPM</h3>
          <p>
            {Number.isNaN(heartRate) || heartRate >= 200 || heartRate <= 15 ? '---' : heartRate}
          </p>
        </div>
      </div>
    </div>
  )
}

export default MainContent
