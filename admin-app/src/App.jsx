import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import FeatureToggles from './components/FeatureToggles'
import Experiments from './components/Experiments'
import EventLog from './components/EventLog'

const TABS = [
  { id: 'dashboard', label: 'ORACLE DASHBOARD', icon: '\u2609' },
  { id: 'experiments', label: 'EXPERIMENTS', icon: '\u2641' },
  { id: 'toggles', label: 'DIVINE TOGGLES', icon: '\u2BEF' },
  { id: 'events', label: 'EVENT SCROLLS', icon: '\u2627' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="admin-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-bracket">[</span>
          <span className="brand-text">PUSHNAMI</span>
          <span className="brand-bracket">]</span>
          <div className="brand-subtitle">ADMIN TEMPLE</div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            <span>ALL TEMPLES ONLINE</span>
          </div>
          <div className="version-tag">MMXXVI \u00B7 ADMIN</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="main-header">
          <h1 className="page-title">
            {TABS.find((t) => t.id === activeTab)?.icon}{' '}
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
          <div className="header-meta">
            <span className="meta-item">
              <span className="status-dot"></span>
              LIVE
            </span>
          </div>
        </header>
        <div className="content-area">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'experiments' && <Experiments />}
          {activeTab === 'toggles' && <FeatureToggles />}
          {activeTab === 'events' && <EventLog />}
        </div>
      </main>
    </div>
  )
}
