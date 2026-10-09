import React from 'react'
import { Globe as GlobeIcon, Compass, Sparkles } from 'lucide-react'
import InteractiveGlobeExplorer from '../components/ui/interactive-globe-explorer'

export default function GlobalExplorer() {
  return (
    <div className="global-page-container">
      <section className="hero-copy" style={{ textAlign: 'center', marginBottom: '16px' }}>
        <span className="eyebrow"><GlobeIcon size={12} className="inline mr-1" /> GLOBAL NETWORK</span>
        <h2>Explore Connected<br /><span>Smart Mobility Hubs</span></h2>
        <p style={{ margin: '0 auto', maxWidth: '640px' }}>
          Vektor is expanding from India to 20 synchronized metropolitan transit hubs. Click any city to rotate the 3D globe, preview regional transport nodes, and copy partner contacts.
        </p>
      </section>

      <div className="my-6">
        <InteractiveGlobeExplorer />
      </div>

      <div className="verification-strip justify-center mt-6">
        <span><Compass size={16} /> 20 Active Hubs</span>
        <span><Sparkles size={16} /> High-precision 3D WebGL Projection</span>
        <span><GlobeIcon size={16} /> Real-time Coordinate Sync</span>
      </div>
    </div>
  )
}
