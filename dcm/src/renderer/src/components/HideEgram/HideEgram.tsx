import React, { useState } from 'react'
import { EyeOff, Eye } from 'lucide-react'
import './HideEgram.css'

const HideEgramData: React.FC = () => {
  const [isEgramHidden, setIsEgramHidden] = useState(false)

  const handleHideEgram = (): void => {
    const event = new CustomEvent('hideEgram')
    window.dispatchEvent(event)
    setIsEgramHidden((prev) => !prev)
  }

  return (
    <button className="egram-button" type="button" onClick={handleHideEgram}>
      {isEgramHidden ? <Eye size={24} /> : <EyeOff size={24} />}
      <span>{isEgramHidden ? 'Show Electrogram' : 'Hide Electrogram'}</span>
    </button>
  )
}

export default HideEgramData
