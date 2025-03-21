/*
  # Simplificar autenticación y usuarios

  1. Cambios
    - Eliminar dependencia de auth.uid()
    - Crear tabla users simple con usuario y contraseña
    - Actualizar políticas para no usar auth
    
  2. Nuevas Tablas
    - users
      - id (uuid, primary key)
      - username (text, unique)
      - password (text)
      - created_at (timestamp)
*/

-- Crear tabla de usuarios simple
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insertar usuario por defecto
INSERT INTO users (username, password) 
VALUES ('admin', 'admin123');

-- Actualizar políticas de transactions
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
DROP POLICY IF EXISTS "Allow users to read transactions" ON transactions;
DROP POLICY IF EXISTS "Allow users to update transaction reports" ON transactions;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus transacciones" ON transactions;

CREATE POLICY "Enable all access" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Actualizar políticas de telegram_config
DROP POLICY IF EXISTS "Users can manage their own telegram config" ON telegram_config;

CREATE POLICY "Enable all access for telegram_config" ON telegram_config
  FOR ALL
  USING (true)
  WITH CHECK (true);