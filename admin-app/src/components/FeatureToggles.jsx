import React, { useState, useEffect, useRef } from 'react'
import { getToggles, updateToggle, getTracks, uploadTrack, deleteTrack, saveTrackOrder } from '../api'

export default function FeatureToggles() {
  const [toggles, setToggles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(null)
  const [tracks, setTracks] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    fetchToggles()
    fetchTracks()
  }, [])

  async function fetchToggles() {
    try {
      setLoading(true)
      const data = await getToggles()
      setToggles(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTracks() {
    try {
      const data = await getTracks()
      setTracks(data)
    } catch (err) {
      console.warn('Failed to load tracks:', err.message)
    }
  }

  async function handleToggle(key, currentEnabled) {
    try {
      setUpdating(key)
      setError(null)
      const updated = await updateToggle(key, { enabled: !currentEnabled })
      setToggles((prev) => prev.map((t) => (t.key === key ? updated : t)))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      setUploadMsg(null)
      await uploadTrack(file)
      setUploadMsg(`Uploaded: ${file.name}`)
      fileRef.current.value = ''
      await fetchTracks()
    } catch (err) {
      setUploadMsg(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteTrack(filename) {
    try {
      await deleteTrack(filename)
      await fetchTracks()
    } catch (err) {
      setUploadMsg(`Delete error: ${err.message}`)
    }
  }

  function handleDragStart(e, idx) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, idx) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIdx(idx)
  }

  function handleDragLeave() {
    setDragOverIdx(null)
  }

  async function handleDrop(e, dropIdx) {
    e.preventDefault()
    setDragOverIdx(null)
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null)
      return
    }
    const reordered = [...tracks]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(dropIdx, 0, moved)
    setTracks(reordered)
    setDragIdx(null)
    try {
      await saveTrackOrder(reordered.map((t) => t.filename))
    } catch (err) {
      setUploadMsg(`Reorder error: ${err.message}`)
    }
  }

  function handleDragEnd() {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  if (loading) return <div className="loading-state">LOADING TOGGLE STATES...</div>
  if (error) return <div className="error-state">ERROR: {error}</div>

  return (
    <div className="toggles-page">
      <p className="section-desc">
        Control landing page features in real-time. Changes take effect on the next page load.
      </p>

      <div className="toggles-grid">
        {toggles.map((toggle) => (
          <div key={toggle.key} className={`toggle-card ${toggle.enabled ? 'enabled' : 'disabled'}`}>
            <div className="toggle-header">
              <div className="toggle-info">
                <h3 className="toggle-name">{toggle.name}</h3>
                <code className="toggle-key">{toggle.key}</code>
              </div>
              <button
                className={`toggle-switch ${toggle.enabled ? 'on' : 'off'}`}
                onClick={() => handleToggle(toggle.key, toggle.enabled)}
                disabled={updating === toggle.key}
              >
                <span className="switch-track">
                  <span className="switch-thumb"></span>
                </span>
                <span className="switch-label">
                  {updating === toggle.key ? '...' : toggle.enabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
            <p className="toggle-description">{toggle.description}</p>
            <div className="toggle-meta">
              <span className="meta-tag">
                {toggle.enabled ? '● ENABLED' : '○ DISABLED'}
              </span>
              <span className="meta-date">
                Updated: {new Date(toggle.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Music Library Management */}
      <h3 className="section-divider">TEMPLE.FM LIBRARY</h3>
      <div className="music-manager">
        <div className="upload-section">
          <label className="upload-label">UPLOAD NEW TRACK</label>
          <div className="upload-row">
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              ref={fileRef}
              className="upload-input"
            />
            <button
              className="cyber-btn-sm"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'UPLOADING...' : 'UPLOAD MP3'}
            </button>
          </div>
          {uploadMsg && (
            <div className={`upload-msg ${uploadMsg.startsWith('Error') ? 'error' : 'success'}`}>
              {uploadMsg}
            </div>
          )}
        </div>

        <div className="track-list">
          <label className="upload-label">CURRENT TRACKS ({tracks.length})</label>
          {tracks.length === 0 ? (
            <div className="empty-state">No tracks uploaded yet.</div>
          ) : (
            tracks.map((track, i) => (
              <div
                key={track.filename}
                className={
                  'track-row' +
                  (dragIdx === i ? ' dragging' : '') +
                  (dragOverIdx === i ? ' drag-over' : '')
                }
                draggable
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={handleDragEnd}
              >
                <span className="track-drag-handle" title="Drag to reorder">⠿</span>
                <span className="track-name">{track.name}</span>
                <button
                  className="track-delete"
                  onClick={() => handleDeleteTrack(track.filename)}
                  title="Remove track"
                >
                  x
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
