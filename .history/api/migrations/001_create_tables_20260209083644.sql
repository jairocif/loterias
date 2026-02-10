-- =====================================================
-- MIGRACIÓN 001 CORREGIDA: Crear TODAS las tablas desde cero
-- Para Railway (base de datos vacía)
-- =====================================================

-- =====================================================
-- 1. CREAR TABLA games (desde cero)
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  country_code VARCHAR(5) NOT NULL,
  name_es VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{
    "mainNumbers": {"count": 6, "min": 1, "max": 45, "name": "Números"},
    "extraNumbers": {"count": 0, "min": 0, "max": 0, "name": ""},
    "rules": {"allowRepeated": false, "sorted": true}
  }'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_country ON games(country_code);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(is_active);
CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);

-- =====================================================
-- 2. CREAR TABLA lottery_results
-- =====================================================
CREATE TABLE IF NOT EXISTS lottery_results (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  draw_date DATE NOT NULL,
  draw_number VARCHAR(50),
  numbers JSONB NOT NULL,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_game ON lottery_results(game_id);
CREATE INDEX IF NOT EXISTS idx_results_date ON lottery_results(draw_date DESC);
CREATE INDEX IF NOT EXISTS idx_results_game_date ON lottery_results(game_id, draw_date DESC);

-- =====================================================
-- 3. CREAR TABLA data_updates
-- =====================================================
CREATE TABLE IF NOT EXISTS data_updates (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  last_update TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  records_updated INTEGER DEFAULT 0,
  CONSTRAINT unique_game_update UNIQUE(game_id)
);

CREATE INDEX IF NOT EXISTS idx_updates_game ON data_updates(game_id);

-- =====================================================
-- 4. CREAR TABLA algorithm_cache
-- =====================================================
CREATE TABLE IF NOT EXISTS algorithm_cache (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cache_key VARCHAR(100) NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT unique_cache_key UNIQUE(game_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_cache_game ON algorithm_cache(game_id);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON algorithm_cache(expires_at);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('games', 'lottery_results', 'data_updates', 'algorithm_cache')
ORDER BY table_name;