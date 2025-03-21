/*
  # Add active status and role to users table

  1. Changes
    - Add `active` column to users table with default value true
    - Add `role` column to users table with default value 'user'
    - Add NOT NULL constraints after setting defaults

  2. Security
    - Enable RLS policies for active users only
    - Update transaction policies to check for active status
*/

-- Add active and role columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Add NOT NULL constraints after setting defaults
ALTER TABLE users 
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

-- Update RLS policies to check for active status
CREATE POLICY "Only active users can access their own data"
  ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id AND active = true)
  WITH CHECK (auth.uid() = id AND active = true);

-- Update transaction policies to check for active status
CREATE POLICY "Only active users can access their transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND active = true
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND active = true
    )
  );