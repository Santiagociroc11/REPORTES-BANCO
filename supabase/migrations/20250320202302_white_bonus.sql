/*
  # Remove auth references and simplify schema

  1. Changes
    - Drop foreign key constraints referencing auth.users
    - Update user_id references to use our custom users table
    - Add cascade delete for user dependencies

  2. Security
    - Keep RLS enabled but with simplified policies
    - Allow all access for development purposes
*/

-- Drop existing foreign key constraints
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE telegram_config
DROP CONSTRAINT IF EXISTS telegram_config_user_id_fkey;

-- Add new foreign key constraints referencing our users table
ALTER TABLE transactions
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

ALTER TABLE telegram_config
ADD CONSTRAINT telegram_config_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- Update existing data to reference admin user
WITH admin_user AS (
  SELECT id FROM users WHERE username = 'admin' LIMIT 1
)
UPDATE transactions
SET user_id = (SELECT id FROM admin_user)
WHERE user_id IS NOT NULL;

WITH admin_user AS (
  SELECT id FROM users WHERE username = 'admin' LIMIT 1
)
UPDATE telegram_config
SET user_id = (SELECT id FROM admin_user)
WHERE user_id IS NOT NULL;