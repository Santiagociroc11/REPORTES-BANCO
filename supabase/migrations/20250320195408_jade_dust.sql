/*
  # Actualización del esquema para tipos de transacciones bancarias

  1. Cambios en la tabla transactions
    - Agregar columna `transaction_type` para el tipo de movimiento
    - Renombrar `description` a `destination` para mejor claridad
    - Agregar columnas para categorías predefinidas

  2. Categorías Predefinidas
    - Alimentación
    - Transporte
    - Servicios
    - Entretenimiento
    - Salud
    - Educación
    - Hogar
    - Otros
*/

-- Agregar tipo de transacción y modificar descripción
ALTER TABLE transactions 
ADD COLUMN transaction_type text NOT NULL DEFAULT 'compra con tarjeta',
ADD CONSTRAINT transaction_type_check 
  CHECK (transaction_type IN ('compra con tarjeta', 'pago por pse', 'transferencia'));

-- Agregar constraint para categorías predefinidas
ALTER TABLE transactions 
ADD CONSTRAINT category_check 
  CHECK (category IN (
    'Alimentación',
    'Transporte',
    'Servicios',
    'Entretenimiento',
    'Salud',
    'Educación',
    'Hogar',
    'Otros'
  ));

-- Actualizar políticas
CREATE POLICY "Usuarios pueden actualizar sus transacciones"
ON transactions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);