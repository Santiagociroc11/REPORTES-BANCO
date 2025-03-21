/*
  # Actualizar tabla de transacciones

  1. Cambios
    - Eliminar columna `category` que ya no se usa
    - Eliminar restricción `category_check` que ya no es necesaria
    - Mantener `category_id` como la única referencia a categorías

  2. Notas
    - Se usa DO $$ BEGIN ... END $$ para manejar condicionalmente la eliminación
    - Se verifica la existencia antes de eliminar para evitar errores
*/

DO $$ 
BEGIN
  -- Eliminar la restricción category_check si existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'category_check' 
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT category_check;
  END IF;

  -- Eliminar la columna category si existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE transactions DROP COLUMN category;
  END IF;
END $$;