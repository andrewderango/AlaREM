import React, { useEffect, useState } from 'react'
import pacemakerHeart from '../../assets/pacemaker-heart.png'
import RealTimeChart from '../../components/RealTimeChart/RealTimeChart'
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
  telemetry: { heartRate: number }
  telemetryRate: number
  isRightSidebarVisible: boolean
}

const MainContent: React.FC<MainContentProps> = ({
  submittedMode,
  telemetry,
  telemetryRate,
  isRightSidebarVisible,
}) => {
  const [series1, setSeries1] = useState<ChartPoint[]>([])
  const [series2, setSeries2] = useState<ChartPoint[]>([])
  const [isEgramHidden, setIsEgramHidden] = useState(false)
  const [bpm, setBpm] = useState(telemetry.heartRate)
  const [targetBpm, setTargetBpm] = useState(telemetry.heartRate)
  let time = 0
  let period = 60
  let atriumType = 0
  // const scaler = 0.05
  const scaler = 0.04775

  useEffect(() => {
    const interval = setInterval(() => {
      time += (1/scaler)
      const atrialHeartBeat = (t: number) => {
        const split = t % period
        if (split < 6) {
          if (atriumType === 0) {
            return -0.642222*split**2 + 3.85333*split + (Math.random() * 1.5 - 1.5/2)
          } else {
            return -1.11111*split**2 + 6.66667*split + (Math.random() * 2 - 2/2)
          }
        } else if (split < 20) {
          return 0.0540816*(split)**2 - 1.40612*(split) + 6.4898 + (Math.random() * 0.75 - 0.75/2)
        } else {
          return (Math.random() * 0.75 - 0.75/2)
        }
      }
      const ventricularHeartBeat = (t: number) => {
        const split = t % period
        if (split < 10) {
          return Math.random() * 0.75 - 0.75/2
        } else if (split < 11) {
          return Math.random() * 1 + (-3 - 1/2)
        } else if (split < 14) {
          return Math.random() * 5 + (21 - 5/2)
        } else if (split < 16) {
          return Math.random() * 1.5 + (-5 - 1.5/2)
        } else if (split < 22) {
          return Math.random() * 0.75 - 0.75/2
        } else if (split < 30) {
          return -0.125*split**2 + 6.5*split - 82.5 + (Math.random() * 0.75 - 0.75/2)
        }
        else {
          return Math.random() * 0.75 - 0.75/2
        }
      }

      const newVal1 = atrialHeartBeat(time*scaler)
      // const newVal2 = heartBeat(time*scaler + 0.3*(period / 2)) // phase shift for second series
      const newVal2 = ventricularHeartBeat(time*scaler)

      setSeries1((prev) => {
        const newVals = [...prev, { x: time / 1000, y: newVal1 }]
        if (newVals.length > 300) {
          newVals.shift()
        }
        return newVals
      })
      setSeries2((prev) => {
        const newVals = [...prev, { x: time / 1000, y: newVal2 }]
        if (newVals.length > 300) {
          newVals.shift()
        }
        return newVals
      })
    }, 10)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setBpm((prevBpm) => {
        if (prevBpm < targetBpm) {
          return Math.min(prevBpm + 1, targetBpm);
        } else if (prevBpm > targetBpm) {
          return Math.max(prevBpm - 1, targetBpm);
        }
        return prevBpm;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [targetBpm]);

  useEffect(() => {
    const handleHideEgram = () => {
      setIsEgramHidden((prev) => !prev)
    }

    window.addEventListener('hideEgram', handleHideEgram)

    return () => {
      window.removeEventListener('hideEgram', handleHideEgram)
    }
  }, [])

  useEffect(() => {
    const handleChangePeriod = (event: CustomEvent) => {
      period = event.detail;
      setTargetBpm(-2 * period + 180);
    };

    window.addEventListener('changePeriod', handleChangePeriod);

    return () => {
      window.removeEventListener('changePeriod', handleChangePeriod);
    };
  }, []);

  useEffect(() => {
    const handleChangeAtriumType = (event: CustomEvent) => {
      atriumType = event.detail;
    };

    window.addEventListener('changeAtriumType', handleChangeAtriumType);

    return () => {
      window.removeEventListener('changeAtriumType', handleChangeAtriumType);
    };
  }, []);

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
                xWidth: 100,
                yMin: -10,
                yMax: 30,
              }}
              series2={{
                data: series2,
                title: 'Ventricle',
                xWidth: 100,
                yMin: -10,
                yMax: 30,
              }}
              width={isRightSidebarVisible ? 550 : 900}
              height={500}
              xAxisFormatter={(value) => value.toFixed(1)}
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
        <div className="stat-box">
          <h3>Heart BPM</h3>
          <p>{Math.round(bpm)}</p>
        </div>
      </div>
    </div>
  )
}

export default MainContent
