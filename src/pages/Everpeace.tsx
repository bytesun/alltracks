import React from 'react'
import { Link } from 'react-router-dom'

export default function Everpeace() {
  const containerStyle: React.CSSProperties = { maxWidth: 900, margin: '24px auto', padding: 20, background: '#fff', borderRadius: 8, boxShadow: '0 4px 18px rgba(15,20,25,0.06)' }
  const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }
  const logoStyle: React.CSSProperties = { width: 96, height: 96, borderRadius: 12, objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
  const titleStyle: React.CSSProperties = { margin: 0, fontSize: 28 }
  const prologueStyle: React.CSSProperties = { color: '#444', lineHeight: 1.6 }

  return (
    <div style={{ padding: 16 }}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <img src="/192x192.png" alt="Mount Everpeace logo" style={logoStyle} />
          <div>
            <h1 style={titleStyle}>Mount Everpeace</h1>
            <div style={{ color: '#666' }}>A quiet peak of gentle trails and wide views</div>
          </div>
        </div>

        <section style={{ marginBottom: 18 }}>
          <h3>Prologue</h3>
          <p style={prologueStyle}>
            Mount Everpeace stands as a calm sentinel overlooking the valley — a place of long, winding ridgelines,
            whispering pines and stone terraces carved by time. Hikers find solace along its soft meadows, and
            photographers come at dawn for the quiet light that settles across the lakes below. Everpeace is not the
            tallest mountain, but it is the one that asks you to slow down and listen.
          </p>
        </section>

        <section>
          <h3>Details</h3>
          <ul>
            <li><strong>Elevation:</strong> 2,134 m</li>
            <li><strong>Difficulty:</strong> Moderate — well-marked trails, some steep sections</li>
            <li><strong>Best time to visit:</strong> May through October</li>
            <li><strong>Facilities:</strong> Trailheads with parking, picnic areas, seasonal ranger station</li>
          </ul>
        </section>

        <div style={{ marginTop: 18 }}>
          <Link to="/" className="primary-btn">Back to home</Link>
        </div>
      </div>
    </div>
  )
}
