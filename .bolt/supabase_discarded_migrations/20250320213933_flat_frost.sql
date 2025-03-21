/*
  # Sample transactions data

  1. Content
    - Examples of each transaction type
    - Mix of reported and unreported transactions
    - Various categories and amounts
    - Both income and expenses
*/

-- Get admin user id
WITH admin_user AS (
  SELECT id FROM users WHERE username = 'admin' LIMIT 1
)

-- Insert sample transactions
INSERT INTO transactions (
  user_id,
  amount,
  description,
  transaction_date,
  reported,
  category,
  comment,
  transaction_type,
  type
)
SELECT
  id as user_id,
  -- Gastos con tarjeta
  unnest(ARRAY[
    -- Compras con tarjeta
    (150000, 'Éxito Poblado', '2025-03-20 10:30:00', true, 'Alimentación', 'Compras del mes', 'compra con tarjeta', 'gasto'),
    (45000, 'Netflix', '2025-03-19 15:20:00', true, 'Entretenimiento', 'Suscripción mensual', 'compra con tarjeta', 'gasto'),
    (25000, 'Uber', '2025-03-18 08:45:00', false, null, null, 'compra con tarjeta', 'gasto'),
    
    -- Pagos PSE
    (250000, 'EPM Servicios', '2025-03-17 14:00:00', true, 'Servicios', 'Factura de servicios', 'pago por pse', 'gasto'),
    (80000, 'Claro Internet', '2025-03-16 11:30:00', false, null, null, 'pago por pse', 'gasto'),
    
    -- Transferencias
    (500000, 'Transferencia a Juan Pérez', '2025-03-15 16:45:00', true, 'Otros', 'Pago arriendo', 'transferencia', 'gasto'),
    (120000, 'Transferencia a María López', '2025-03-14 09:15:00', false, null, null, 'transferencia', 'gasto'),
    
    -- Pagos programados
    (1200000, 'Pago Hipoteca Bancolombia', '2025-03-13 00:00:00', true, 'Hogar', 'Cuota mensual', 'pago programado', 'gasto'),
    (350000, 'Seguro de Vida Sura', '2025-03-12 00:00:00', true, 'Salud', 'Póliza anual', 'pago programado', 'gasto'),
    
    -- Gastos manuales
    (15000, 'Taxi', '2025-03-11 22:30:00', true, 'Transporte', 'Viaje nocturno', 'gasto manual', 'gasto'),
    (8000, 'Parqueadero Centro Comercial', '2025-03-10 17:00:00', false, null, null, 'gasto manual', 'gasto'),
    
    -- Ingresos por transferencia
    (2500000, 'Nómina Empresa XYZ', '2025-03-25 00:00:00', true, 'Otros', 'Salario mensual', 'transferencia', 'ingreso'),
    (800000, 'Pago Freelance Proyecto ABC', '2025-03-24 14:20:00', true, 'Otros', 'Desarrollo web', 'transferencia', 'ingreso'),
    
    -- Ingresos manuales
    (100000, 'Venta artículos usados', '2025-03-23 16:00:00', true, 'Otros', 'Venta en marketplace', 'gasto manual', 'ingreso'),
    (50000, 'Reembolso gastos oficina', '2025-03-22 11:30:00', false, null, null, 'gasto manual', 'ingreso')
  ]::record[])
FROM admin_user;