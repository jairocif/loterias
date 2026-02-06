-- =====================================================
-- MIGRACIÓN 001: Crear estructura de base de datos
-- Sistema de Lotería - Fase 3
-- Fecha: 2026-02-02
-- =====================================================

-- =====================================================
-- 1. EXTENDER TABLA games (agregar columnas nuevas)
-- =====================================================

-- Agregar columna name_en (nombre en inglés)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS name_en VARCHAR(255);

-- Agregar columna config (configuración del juego en JSONB)
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{
  "mainNumbers": {"count": 6, "min": 1, "max": 45, "name": "Números"},
  "extraNumbers": {"count": 0, "min": 0, "max": 0, "name": ""},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb;

-- Agregar columnas de timestamps
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE games 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Crear índices en games si no existen
CREATE INDEX IF NOT EXISTS idx_games_country ON games(country_code);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);

-- =====================================================
-- 2. CREAR TABLA lottery_results (resultados históricos)
-- =====================================================
CREATE TABLE IF NOT EXISTS lottery_results (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  draw_date DATE NOT NULL,
  draw_number VARCHAR(50),
  
  -- Números ganadores en formato JSONB
  numbers JSONB NOT NULL,
  -- Ejemplo: {"main": [5, 12, 23, 31, 42], "extra": [7]}
  
  source VARCHAR(100), -- API, scraping, manual
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para lottery_results
CREATE INDEX IF NOT EXISTS idx_results_game ON lottery_results(game_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON lottery_results(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_results_game_date ON lottery_results(game_id, draw_date DESC);

-- =====================================================
-- 3. CREAR TABLA data_updates (control de actualizaciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS data_updates (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  last_update TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'success', -- success, error, pending
  error_message TEXT,
  records_updated INTEGER DEFAULT 0,
  
  CONSTRAINT unique_game_update UNIQUE(game_id)
);

-- Índice para data_updates
CREATE INDEX IF NOT EXISTS idx_updates_game ON data_updates(game_id);

-- =====================================================
-- 4. CREAR TABLA algorithm_cache (cache de análisis)
-- =====================================================
CREATE TABLE IF NOT EXISTS algorithm_cache (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cache_key VARCHAR(100) NOT NULL,
  
  -- Datos del análisis en JSONB
  analysis_data JSONB NOT NULL,
  -- Ejemplo: {"frequency": {...}, "trends": {...}, "patterns": {...}}
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  CONSTRAINT unique_cache_key UNIQUE(game_id, cache_key)
);

-- Índices para algorithm_cache
CREATE INDEX IF NOT EXISTS idx_cache_game ON algorithm_cache(game_id);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON algorithm_cache(expires_at);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Mostrar las tablas creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('games', 'lottery_results', 'data_updates', 'algorithm_cache')
ORDER BY table_name;