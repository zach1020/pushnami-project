import React, { useState, useEffect } from 'react'
import { getExperiments, createExperiment, updateExperiment, deleteExperiment } from '../api'

export default function Experiments() {
  const [experiments, setExperiments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newExp, setNewExp] = useState({
    name: '',
    description: '',
    variants: 'control,variant',
  })

  useEffect(() => {
    fetchExperiments()
  }, [])

  async function fetchExperiments() {
    try {
      setLoading(true)
      const data = await getExperiments()
      setExperiments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(exp) {
    try {
      setError(null)
      const updated = await updateExperiment(exp.id, { is_active: !exp.is_active })
      setExperiments((prev) => prev.map((e) => (e.id === exp.id ? updated : e)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this experiment? This will also remove all assignments.')) return
    try {
      setError(null)
      await deleteExperiment(id)
      setExperiments((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    try {
      setError(null)
      const variants = newExp.variants.split(',').map((v) => v.trim()).filter(Boolean)
      const splitValue = Math.floor(100 / variants.length)
      const traffic_split = {}
      variants.forEach((v, i) => {
        traffic_split[v] = i === variants.length - 1 ? 100 - splitValue * (variants.length - 1) : splitValue
      })

      const created = await createExperiment({
        name: newExp.name,
        description: newExp.description,
        variants,
        traffic_split,
      })
      setExperiments((prev) => [created, ...prev])
      setShowCreate(false)
      setNewExp({ name: '', description: '', variants: 'control,variant' })
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading-state">LOADING EXPERIMENTS...</div>

  return (
    <div className="experiments-page">
      {error && <div className="error-banner">ERROR: {error}</div>}

      <div className="page-actions">
        <button className="cyber-btn-sm primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ CANCEL' : '+ NEW EXPERIMENT'}
        </button>
      </div>

      {showCreate && (
        <form className="create-form" onSubmit={handleCreate}>
          <div className="form-row">
            <label>NAME</label>
            <input
              type="text"
              value={newExp.name}
              onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
              placeholder="My Experiment"
              required
            />
          </div>
          <div className="form-row">
            <label>DESCRIPTION</label>
            <input
              type="text"
              value={newExp.description}
              onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
              placeholder="Testing hypothesis..."
            />
          </div>
          <div className="form-row">
            <label>VARIANTS (comma-separated)</label>
            <input
              type="text"
              value={newExp.variants}
              onChange={(e) => setNewExp({ ...newExp, variants: e.target.value })}
              placeholder="control,variant"
              required
            />
          </div>
          <button type="submit" className="cyber-btn-sm primary">
            CREATE EXPERIMENT
          </button>
        </form>
      )}

      <div className="experiments-list">
        {experiments.map((exp) => (
          <div key={exp.id} className={`experiment-card ${exp.is_active ? 'active' : 'inactive'}`}>
            <div className="exp-header">
              <div>
                <h3 className="exp-name">{exp.name}</h3>
                <p className="exp-description">{exp.description}</p>
              </div>
              <div className="exp-actions">
                <button
                  className={`cyber-btn-sm ${exp.is_active ? 'danger' : 'primary'}`}
                  onClick={() => handleToggleActive(exp)}
                >
                  {exp.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
                </button>
                <button className="cyber-btn-sm danger" onClick={() => handleDelete(exp.id)}>
                  DELETE
                </button>
              </div>
            </div>
            <div className="exp-details">
              <div className="exp-variants">
                {exp.variants.map((v, i) => (
                  <span key={v} className="variant-pill" style={{ borderColor: ['#ff71ce', '#01cdfe', '#b967ff', '#05ffa1'][i % 4] }}>
                    {v.toUpperCase()} — {exp.traffic_split[v]}%
                  </span>
                ))}
              </div>
              <div className="exp-meta">
                <span className={`status-badge ${exp.is_active ? 'active' : 'inactive'}`}>
                  {exp.is_active ? '● ACTIVE' : '○ INACTIVE'}
                </span>
                <span className="exp-id">ID: {exp.id.slice(0, 8)}...</span>
                <span className="exp-date">Created: {new Date(exp.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
        {experiments.length === 0 && (
          <div className="empty-state">No experiments configured. Create one to get started.</div>
        )}
      </div>
    </div>
  )
}
