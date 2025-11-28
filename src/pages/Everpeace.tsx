import React from 'react'
import { Link } from 'react-router-dom'

export default function Everpeace() {
  const containerStyle: React.CSSProperties = { maxWidth: 900, margin: '24px auto', padding: 20, background: '#fff', borderRadius: 8, boxShadow: '0 4px 18px rgba(15,20,25,0.06)' }
  const headerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }
  const logoStyle: React.CSSProperties = { width: 176, height: 176, borderRadius: 16, objectFit: 'cover', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }
  const titleStyle: React.CSSProperties = { margin: 0, fontSize: 28 }
  const prologueStyle: React.CSSProperties = { color: '#444', lineHeight: 1.6 }

  return (
    <div style={{ padding: 16 }}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <img src="https://arweave.net/wjUf4LlIqVW5EMI5wK-CKgxAH58V9x0IoZIjMiNQxmc" alt="Mount Everpeace logo (high resolution)" style={logoStyle} />
          <div>
            <h1 style={titleStyle}>Mount Everpeace</h1>
            <div style={{ color: '#666' }}>A man who knows his path fears no storm</div>
          </div>
        </div>

        <section style={{ marginBottom: 18 }}>
          <h3>Prologue</h3>
          <p style={{ ...prologueStyle, fontWeight: 500, fontSize: 16, marginBottom: 12 }}>
            There are countless mountains in this world — some pierce the clouds, some lie quietly across the earth.
            Yet in the heart of a traveler there is one mountain worth a lifetime of steps: Mount Everpeace.
          </p>

          <p style={prologueStyle}>
            You will not find Everpeace on a map. It keeps no official altitude, claims no borders, and resists the gaze
            of satellites. It lives instead in the small decisions of people who choose to look inward: in the slow
            mornings, the careful questions, and the quiet acts of courage that build a life.
          </p>

          <p style={prologueStyle}>
            At the base lies the Plain of Mist — the familiar clutter of life, the noise of cities, and the weight of
            worries. Halfway up, the Path of Trials asks you to meet hardship honestly: steep climbs, cold rain, long
            nights, and the solitude that sharpens the self. At the summit, the Crown of Silence awaits: no flags, no
            trophies — only a stillness that lets the ridges of the world breathe and reveal the truth of the journey.
          </p>

          <blockquote style={{ margin: '12px 0', paddingLeft: 14, borderLeft: '3px solid #e0e6ea', color: '#333', fontStyle: 'italic' }}>
            The only road worth walking is the one that leads inward. To go inward is to go deep; to go deep is to touch
            what is real. In what is real, peace is born.
          </blockquote>

          <p style={prologueStyle}>
            Travelers do not come to conquer Everpeace; they come to see themselves more clearly, and to leave the
            summit bearing a light they can share. From the mist at the base, through the trials along the slopes, to
            the silence at the peak — this book begins there.
          </p>

          <p style={{ ...prologueStyle, marginTop: 8, color: '#555' }}>
            — May you find your Everpeace, and make peace with yourself along the way.
          </p>
        </section>
      </div>
    </div>
  )
}
