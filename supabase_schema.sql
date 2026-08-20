-- Script de Creación de Tablas para Camiones Caídos en Supabase

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    national_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Encargado',
    mine TEXT NOT NULL DEFAULT 'Pribbenow',
    group_name TEXT NOT NULL DEFAULT 'Grupo 1',
    password TEXT NOT NULL DEFAULT 'caidos1234',
    must_change_password BOOLEAN DEFAULT TRUE,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Operadores
CREATE TABLE IF NOT EXISTS operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mine TEXT NOT NULL DEFAULT 'Pribbenow',
    group_name TEXT NOT NULL DEFAULT 'Grupo 1',
    status TEXT DEFAULT 'Activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Reportes de Camiones Caídos
CREATE TABLE IF NOT EXISTS truck_reports (
    id TEXT PRIMARY KEY,
    truck_id TEXT NOT NULL,
    mine TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'Diurno',
    operator TEXT,
    system TEXT,
    detail TEXT,
    location TEXT,
    status TEXT DEFAULT 'DOWN',
    down_time TEXT,
    estimated_return_time TEXT,
    actual_return_time TEXT,
    date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) y permitir lectura/escritura pública
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso público lectura app_users" ON app_users FOR SELECT USING (true);
CREATE POLICY "Acceso público inserción app_users" ON app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Acceso público actualización app_users" ON app_users FOR UPDATE USING (true);
CREATE POLICY "Acceso público eliminación app_users" ON app_users FOR DELETE USING (true);

CREATE POLICY "Acceso público lectura operators" ON operators FOR SELECT USING (true);
CREATE POLICY "Acceso público inserción operators" ON operators FOR INSERT WITH CHECK (true);
CREATE POLICY "Acceso público actualización operators" ON operators FOR UPDATE USING (true);
CREATE POLICY "Acceso público eliminación operators" ON operators FOR DELETE USING (true);

CREATE POLICY "Acceso público lectura truck_reports" ON truck_reports FOR SELECT USING (true);
CREATE POLICY "Acceso público inserción truck_reports" ON truck_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Acceso público actualización truck_reports" ON truck_reports FOR UPDATE USING (true);
CREATE POLICY "Acceso público eliminación truck_reports" ON truck_reports FOR DELETE USING (true);

-- Insertar usuarios iniciales obligatorios si no existen
INSERT INTO app_users (id, national_id, name, role, mine, group_name, password, must_change_password)
VALUES 
    ('u1', '7574445', 'Alexander Francisco Ramirez Cordoba', 'Administrador', 'El Descanso', 'Grupo 1', 'caidos1234', true),
    ('u2', '1234567', 'Efrain Tafur', 'Encargado', 'El Descanso', 'Grupo 1', 'caidos1234', true)
ON CONFLICT (national_id) DO NOTHING;
