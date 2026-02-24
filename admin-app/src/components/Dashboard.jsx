import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getStats, getExperiments, getMusicEvents } from '../api'

const COLORS = ['#ff71ce', '#01cdfe', '#b967ff', '#05ffa1', '#fffb96']

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [experiments, setExperiments] = useState([])
  const [selectedExp, setSelectedExp] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [musicStats, setMusicStats] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsData, expData, musicEvts] = await Promise.all([
        getStats(selectedExp || undefined),
        getExperiments(),
        getMusicEvents(),
      ])
      setStats(statsData)
      setExperiments(expData)

      // Process music events
      const mEvents = (musicEvts || []).filter((e) =>
        e.event_name && e.event_name.startsWith('music_')
      )
      const plays = mEvents.filter((e) => e.event_name === 'music_play').length
      const pauses = mEvents.filter((e) => e.event_name === 'music_pause').length
      const nexts = mEvents.filter((e) => e.event_name === 'music_next').length
      const prevs = mEvents.filter((e) => e.event_name === 'music_prev').length
      const selects = mEvents.filter((e) => e.event_name === 'music_track_select').length
      const toggles = mEvents.filter((e) => e.event_name === 'music_player_toggle').length

      // Track popularity from metadata
      const trackCounts = {}
      mEvents.forEach((e) => {
        const track = e.metadata?.track
        if (track) trackCounts[track] = (trackCounts[track] || 0) + 1
      })

      setMusicStats({
        total: mEvents.length,
        plays, pauses, nexts, prevs, selects, toggles,
        trackCounts,
        byAction: [
          { name: 'Play', value: plays },
          { name: 'Pause', value: pauses },
          { name: 'Next', value: nexts },
          { name: 'Prev', value: prevs },
          { name: 'Select', value: selects },
          { name: 'Toggle', value: toggles },
        ].filter((d) => d.value > 0),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [selectedExp])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading && !stats) return <div className="loading-state">LOADING TELEMETRY...</div>
  if (error) return <div className="error-state">ERROR: {error}</div>
  if (!stats) return null

  const eventTypeData = Object.entries(stats.events_by_type).map(([name, value]) => ({ name, value }))
  const variantData = Object.entries(stats.events_by_variant).map(([name, value]) => ({ name, value }))

  const conversionData = Object.entries(stats.conversion_by_variant).map(([variant, data]) => ({
    variant,
    ...data,
  }))

  return (
    <div className="dashboard">
      {/* Experiment filter */}
      <div className="dashboard-controls">
        <select
          className="cyber-select"
          value={selectedExp}
          onChange={(e) => setSelectedExp(e.target.value)}
        >
          <option value="">ALL EXPERIMENTS</option>
          {experiments.map((exp) => (
            <option key={exp.id} value={exp.id}>
              {exp.name.toUpperCase()} {exp.is_active ? '● ACTIVE' : '○ INACTIVE'}
            </option>
          ))}
        </select>
        <button className="cyber-btn-sm" onClick={fetchData}>
          ↻ REFRESH
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{stats.total_events.toLocaleString()}</div>
          <div className="kpi-label">TOTAL EVENTS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{stats.unique_visitors.toLocaleString()}</div>
          <div className="kpi-label">UNIQUE VISITORS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{Object.keys(stats.events_by_type).length}</div>
          <div className="kpi-label">EVENT TYPES</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{Object.keys(stats.events_by_variant).length}</div>
          <div className="kpi-label">ACTIVE VARIANTS</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Events by Type */}
        <div className="chart-card">
          <h3 className="chart-title">EVENTS BY TYPE</h3>
          {eventTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={eventTypeData}>
                <XAxis dataKey="name" stroke="#555" tick={{ fill: '#888', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(26,26,46,0.95)',
                    border: '1px solid rgba(255,113,206,0.25)',
                    borderRadius: 2,
                    fontFamily: 'Share Tech Mono',
                    color: '#ff71ce',
                  }}
                />
                <Bar dataKey="value" fill="#ff71ce" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">NO DATA YET</div>
          )}
        </div>

        {/* Events by Variant */}
        <div className="chart-card">
          <h3 className="chart-title">EVENTS BY VARIANT</h3>
          {variantData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={variantData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {variantData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(26,26,46,0.95)',
                    border: '1px solid rgba(255,113,206,0.25)',
                    borderRadius: 2,
                    fontFamily: 'Share Tech Mono',
                    color: '#ff71ce',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">NO DATA YET</div>
          )}
        </div>
      </div>

      {/* Conversion Table */}
      {conversionData.length > 0 && (
        <div className="chart-card full-width">
          <h3 className="chart-title">VARIANT PERFORMANCE</h3>
          <table className="cyber-table">
            <thead>
              <tr>
                <th>VARIANT</th>
                <th>PAGE VIEWS</th>
                <th>CLICKS</th>
                <th>SUBMISSIONS</th>
                <th>CLICK RATE</th>
                <th>SUBMIT RATE</th>
              </tr>
            </thead>
            <tbody>
              {conversionData.map((row, i) => (
                <tr key={row.variant}>
                  <td>
                    <span className="variant-badge" style={{ borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}>
                      {row.variant.toUpperCase()}
                    </span>
                  </td>
                  <td>{row.views}</td>
                  <td>{row.clicks}</td>
                  <td>{row.submissions}</td>
                  <td className="metric-highlight">{row.click_rate}%</td>
                  <td className="metric-highlight">{row.submit_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Music Player Metrics */}
      {musicStats && musicStats.total > 0 && (
        <>
          <h3 className="section-divider">TEMPLE.FM METRICS</h3>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{musicStats.total}</div>
              <div className="kpi-label">TOTAL INTERACTIONS</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{musicStats.plays}</div>
              <div className="kpi-label">PLAYS</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{musicStats.pauses}</div>
              <div className="kpi-label">PAUSES</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{musicStats.selects + musicStats.nexts + musicStats.prevs}</div>
              <div className="kpi-label">TRACK CHANGES</div>
            </div>
          </div>
          <div className="charts-row">
            <div className="chart-card">
              <h3 className="chart-title">PLAYER ACTIONS</h3>
              {musicStats.byAction.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={musicStats.byAction}>
                    <XAxis dataKey="name" stroke="#555" tick={{ fill: '#888', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                    <YAxis stroke="#555" tick={{ fill: '#888', fontSize: 11, fontFamily: 'Share Tech Mono' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(26,26,46,0.95)',
                        border: '1px solid rgba(185,103,255,0.25)',
                        borderRadius: 2,
                        fontFamily: 'Share Tech Mono',
                        color: '#b967ff',
                      }}
                    />
                    <Bar dataKey="value" fill="#b967ff" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">NO DATA YET</div>
              )}
            </div>
            <div className="chart-card">
              <h3 className="chart-title">TRACK POPULARITY</h3>
              {Object.keys(musicStats.trackCounts).length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(musicStats.trackCounts).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      stroke="none"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.keys(musicStats.trackCounts).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(26,26,46,0.95)',
                        border: '1px solid rgba(185,103,255,0.25)',
                        borderRadius: 2,
                        fontFamily: 'Share Tech Mono',
                        color: '#b967ff',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-chart">NO DATA YET</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
