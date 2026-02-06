-- =====================================================
-- MIGRACIÓN 002: Insertar 15 juegos configurados
-- Sistema de Lotería - Fase 3
-- Fecha: 2026-02-02
-- =====================================================

-- =====================================================
-- COLOMBIA (5 juegos)
-- =====================================================

-- 1. BALOTO
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('baloto', 'CO', 'Baloto', 'Baloto', true, 
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 43, "name": "Números"},
  "extraNumbers": {"count": 1, "min": 1, "max": 16, "name": "Superbalota"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 2. BALOTO REVANCHA
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('baloto-revancha', 'CO', 'Baloto Revancha', 'Baloto Revancha', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 43, "name": "Números"},
  "extraNumbers": {"count": 1, "min": 1, "max": 16, "name": "Superbalota"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 3. LOTERÍA DE MEDELLÍN
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('loteria-medellin', 'CO', 'Lotería de Medellín', 'Medellin Lottery', true,
'{
  "mainNumbers": {"count": 4, "min": 0, "max": 9, "name": "Cifras"},
  "extraNumbers": {"count": 1, "min": 0, "max": 999, "name": "Serie"},
  "rules": {"allowRepeated": true, "sorted": false}
}'::jsonb);

-- 4. LOTERÍA DE BOYACÁ
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('loteria-boyaca', 'CO', 'Lotería de Boyacá', 'Boyaca Lottery', true,
'{
  "mainNumbers": {"count": 4, "min": 0, "max": 9, "name": "Cifras"},
  "extraNumbers": {"count": 1, "min": 0, "max": 999, "name": "Serie"},
  "rules": {"allowRepeated": true, "sorted": false}
}'::jsonb);

-- 5. LOTERÍA DE BOGOTÁ
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('loteria-bogota', 'CO', 'Lotería de Bogotá', 'Bogota Lottery', true,
'{
  "mainNumbers": {"count": 4, "min": 0, "max": 9, "name": "Cifras"},
  "extraNumbers": {"count": 1, "min": 0, "max": 999, "name": "Serie"},
  "rules": {"allowRepeated": true, "sorted": false}
}'::jsonb);

-- =====================================================
-- ESPAÑA (5 juegos)
-- =====================================================

-- 1. EUROMILLONES
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('euromillones', 'ES', 'EuroMillones', 'EuroMillions', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 50, "name": "Números"},
  "extraNumbers": {"count": 2, "min": 1, "max": 12, "name": "Estrellas"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 2. LA PRIMITIVA
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('primitiva', 'ES', 'La Primitiva', 'Primitiva', true,
'{
  "mainNumbers": {"count": 6, "min": 1, "max": 49, "name": "Números"},
  "extraNumbers": {"count": 1, "min": 0, "max": 9, "name": "Reintegro"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 3. BONOLOTO
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('bonoloto', 'ES', 'Bonoloto', 'Bonoloto', true,
'{
  "mainNumbers": {"count": 6, "min": 1, "max": 49, "name": "Números"},
  "extraNumbers": {"count": 1, "min": 0, "max": 9, "name": "Reintegro"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 4. EL GORDO DE LA PRIMITIVA
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('elgordo', 'ES', 'El Gordo de la Primitiva', 'El Gordo', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 54, "name": "Números"},
  "extraNumbers": {"count": 1, "min": 0, "max": 9, "name": "Número clave"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 5. LOTERÍA NACIONAL
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('loteria-nacional', 'ES', 'Lotería Nacional', 'National Lottery', true,
'{
  "mainNumbers": {"count": 5, "min": 0, "max": 9, "name": "Cifras"},
  "extraNumbers": {"count": 1, "min": 0, "max": 999, "name": "Serie"},
  "rules": {"allowRepeated": true, "sorted": false}
}'::jsonb);

-- =====================================================
-- USA (5 juegos)
-- =====================================================

-- 1. POWERBALL
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('powerball', 'US', 'Powerball', 'Powerball', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 69, "name": "Numbers"},
  "extraNumbers": {"count": 1, "min": 1, "max": 26, "name": "Powerball"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 2. MEGA MILLIONS
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('megamillions', 'US', 'Mega Millions', 'Mega Millions', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 70, "name": "Numbers"},
  "extraNumbers": {"count": 1, "min": 1, "max": 25, "name": "Mega Ball"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 3. LOTTO AMERICA
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('lottoamerica', 'US', 'Lotto America', 'Lotto America', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 52, "name": "Numbers"},
  "extraNumbers": {"count": 1, "min": 1, "max": 10, "name": "Star Ball"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 4. CASH4LIFE
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('cash4life', 'US', 'Cash4Life', 'Cash4Life', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 60, "name": "Numbers"},
  "extraNumbers": {"count": 1, "min": 1, "max": 4, "name": "Cash Ball"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- 5. LUCKY FOR LIFE
INSERT INTO games (code, country_code, name_es, name_en, is_active, config) VALUES
('luckyforlife', 'US', 'Lucky for Life', 'Lucky for Life', true,
'{
  "mainNumbers": {"count": 5, "min": 1, "max": 48, "name": "Numbers"},
  "extraNumbers": {"count": 1, "min": 1, "max": 18, "name": "Lucky Ball"},
  "rules": {"allowRepeated": false, "sorted": true}
}'::jsonb);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 
  country_code,
  COUNT(*) as juegos_count
FROM games
WHERE is_active = true
GROUP BY country_code
ORDER BY country_code;

SELECT 
  code,
  country_code,
  name_es,
  is_active
FROM games
ORDER BY country_code, code;