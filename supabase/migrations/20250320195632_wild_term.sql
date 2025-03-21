/*
  # Actualización del esquema para pagos programados y estadísticas

  1. Cambios
    - Agregar "pago programado" como tipo de transacción válido
*/

DO $$ 
BEGIN 
  ALTER TABLE transactions 
    DROP CONSTRAINT IF EXISTS transaction_type_check;
    
  ALTER TABLE transactions 
    ADD CONSTRAINT transaction_type_check 
    CHECK (transaction_type IN (
      'compra con tarjeta',
      'pago por pse',
      'transferencia',
      'pago programado'
    ));
END $$;