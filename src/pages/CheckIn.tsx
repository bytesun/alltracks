import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useAlltracks } from "../components/Store";

const markerIcon = new L.Icon({
  iconUrl: "/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "/marker-shadow.png",
  shadowSize: [41, 41],
});

export default function CheckIn() {
  const alltracks = useAlltracks();
  const [checkpoints, setCheckpoints] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function fetchCheckpoints() {
      // Replace with your actual fetch logic
      const result = await alltracks.getLatestCheckPoints?.();
      if (result && result.length > 0) {
        setCheckpoints(result);
        setSelected(result[0]);
      }
    }
    fetchCheckpoints();
  }, [alltracks]);

  return (
    <div style={{ display: "flex", height: "80vh", gap: 16 }}>
      {/* Left: Checkpoint List */}
      <div style={{ flex: 1, overflowY: "auto", borderRight: "1px solid #eee" }}>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {checkpoints.map((cp, idx) => (
            <li
              key={cp.id || idx}
              style={{
                padding: "1em",
                marginBottom: 8,
                background: selected === cp ? "#e3f2fd" : "#fff",
                borderRadius: 6,
                cursor: "pointer",
                border: selected === cp ? "2px solid #1976d2" : "1px solid #ddd",
                transition: "background 0.2s, border 0.2s",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div onClick={() => setSelected(cp)} style={{flex: 1, cursor: 'pointer'}}>
                <div style={{ fontWeight: "bold" }}>{cp.name || `Checkpoint ${idx + 1}`}</div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {cp.timestamp ? new Date(cp.timestamp).toLocaleString() : ""}
                </div>
                <div style={{ fontSize: 12, color: "#777" }}>
                  Lat: {cp.latitude?.toFixed(4)}, Lng: {cp.longitude?.toFixed(4)}, Elev: {cp.elevation ?? "-"}m
                </div>
              </div>
              <button
                style={{ marginLeft: 12, background: '#f44336', color: '#fff', border: 'none', borderRadius: 4, padding: '0.3em 0.7em', cursor: 'pointer' }}
                onClick={e => {
                  e.stopPropagation();
                  setCheckpoints(checkpoints.filter((item, i) => i !== idx));
                  if (selected === cp) {
                    setSelected(checkpoints.filter((item, i) => i !== idx)[0] || null);
                  }
                }}
                title="Remove checkpoint"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Right: Map */}
      <div style={{ flex: 2, minWidth: 0, height: '80vh' }}>
        {selected && selected.latitude && selected.longitude ? (
          <MapContainer
            center={[selected.latitude, selected.longitude]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker
              position={[selected.latitude, selected.longitude]}
              icon={markerIcon}
            >
              <Popup>
                <div>
                  <strong>{selected.name || "Checkpoint"}</strong>
                  <br />
                  {selected.timestamp ? new Date(selected.timestamp).toLocaleString() : ""}
                  <br />
                  Elev: {selected.elevation ?? "-"}m
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          <div style={{padding: 32, color: '#888'}}>No checkpoint selected or invalid coordinates.</div>
        )}
      </div>
    </div>
  );
}

