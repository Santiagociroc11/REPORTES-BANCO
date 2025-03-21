/*
  # Actualización para soportar ingresos y gastos manuales

  1. Cambios
    - Agregar columna 'type' para distinguir entre ingresos y gastos
    - Agregar 'gasto manual' como tipo de transacción válido
*/

DO $$ 
BEGIN 
  -- Agregar columna type si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'type'
  ) THEN
    ALTER TABLE transactions 
    ADD COLUMN type text NOT NULL DEFAULT 'gasto'
    CHECK (type IN ('ingreso', 'gasto'));
  END IF;

  -- Actualizar constraint de transaction_type
  ALTER TABLE transactions 
    DROP CONSTRAINT IF EXISTS transaction_type_check;
    
  ALTER TABLE transactions 
    ADD CONSTRAINT transaction_type_check 
    CHECK (transaction_type IN (
      'compra con tarjeta',
      'pago por pse',
      'transferencia',
      'pago programado',
      'gasto manual'
    ));
END $$;