-- Landing Page Tracking System - Database Schema
-- Pushnami Take-Home Project

-- Experiments table for A/B testing
CREATE TABLE IF NOT EXISTS experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    variants JSONB NOT NULL DEFAULT '["control", "variant"]',
    traffic_split JSONB NOT NULL DEFAULT '{"control": 50, "variant": 50}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Variant assignments for consistent visitor experience
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
    visitor_id VARCHAR(255) NOT NULL,
    variant VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(experiment_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_visitor ON assignments(visitor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_experiment ON assignments(experiment_id);

-- Feature toggles for admin-controlled landing page features
CREATE TABLE IF NOT EXISTS feature_toggles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table for metrics tracking
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id VARCHAR(255) NOT NULL,
    experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL,
    variant VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    page_url TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_variant ON events(variant);
CREATE INDEX IF NOT EXISTS idx_events_experiment ON events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- Seed default experiment
INSERT INTO experiments (name, description, variants, traffic_split, is_active)
VALUES (
    'Landing Page Theme',
    'Test neon vs synthwave cyberpunk theme variants',
    '["neon", "synthwave"]',
    '{"neon": 0, "synthwave": 100}',
    true
);

-- Seed default feature toggles
INSERT INTO feature_toggles (name, key, description, enabled, config) VALUES
    ('Matrix Rain Background', 'matrix_rain', 'Animated matrix-style rain effect on the landing page background', true, '{"speed": "medium", "density": 0.7}'),
    ('Hero Glitch Effect', 'hero_glitch', 'CSS glitch animation on the hero headline text', true, '{"intensity": "medium"}'),
    ('Testimonials Section', 'show_testimonials', 'Display the testimonials/social proof section', true, '{}'),
    ('Music Player', 'show_music_player', 'Floating TEMPLE.FM retro music player on the landing page', true, '{}'),
    ('Scroll Video Animation', 'show_scroll_video', 'Cyberpunk temple scroll-driven video animation between Echoes and Commune sections', true, '{}'),
    ('Scroll Particles', 'show_scroll_particles', 'Glowing cyan orbs that float during video section scrolling', true, '{}'),
    ('Cursor Orb', 'show_cursor_orb', 'Glowing orb that orbits the cursor with delayed follow', true, '{}'),
    ('Neon Selection Box', 'show_neon_select', 'Click-and-drag neon selection box with digital disintegration effect', true, '{}');
