import React, { useState, useEffect } from 'react'
import { getEvents } from '../api'

export default function EventLog() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ event_type: '', variant: '' })

  async function fetchEvents() {
    try {
      setLoading(true)
      const params = {}
      if (filters.event_type) params.event_type = filters.event_type
      if (filters.variant) params.variant = filters.variant
      params.limit = 50
      const data = await getEvents(params)
      setEvents(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 5000)
    return () => clearInterval(interval)
  }, [filters.event_type, filters.variant])

  return (
    <div className="events-page">
      <div className="filter-bar">
        <select
          className="cyber-select"
          value={filters.event_type}
          onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
        >
          <option value="">ALL EVENT TYPES</option>
          <option value="page_view">PAGE_VIEW</option>
          <option value="click">CLICK</option>
          <option value="form_submit">FORM_SUBMIT</option>
          <option value="scroll">SCROLL</option>
          <option value="engagement">ENGAGEMENT</option>
        </select>
        <select
          className="cyber-select"
          value={filters.variant}
          onChange={(e) => setFilters({ ...filters, variant: e.target.value })}
        >
          <option value="">ALL VARIANTS</option>
          <option value="neon">NEON</option>
          <option value="synthwave">SYNTHWAVE</option>
        </select>
        <button className="cyber-btn-sm" onClick={fetchEvents}>
          ↻ REFRESH
        </button>
      </div>

      {error && <div className="error-banner">ERROR: {error}</div>}

      <div className="event-log">
        <div className="log-header">
          <span className="log-col time">TIMESTAMP</span>
          <span className="log-col type">EVENT TYPE</span>
          <span className="log-col name">EVENT NAME</span>
          <span className="log-col variant">VARIANT</span>
          <span className="log-col visitor">VISITOR</span>
        </div>
        {loading && events.length === 0 ? (
          <div className="loading-state">STREAMING EVENTS...</div>
        ) : events.length === 0 ? (
          <div className="empty-state">No events recorded yet. Visit the landing page to generate data.</div>
        ) : (
          events.map((evt) => (
            <div key={evt.id} className="log-row">
              <span className="log-col time">
                {new Date(evt.created_at).toLocaleTimeString()}
              </span>
              <span className={`log-col type badge-${evt.event_type}`}>
                {evt.event_type.toUpperCase()}
              </span>
              <span className="log-col name">{evt.event_name || '—'}</span>
              <span className={`log-col variant ${evt.variant || ''}`}>
                {evt.variant?.toUpperCase() || '—'}
              </span>
              <span className="log-col visitor" title={evt.visitor_id}>
                {evt.visitor_id.slice(0, 8)}...
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
