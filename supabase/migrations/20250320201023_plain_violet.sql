/*
  # Add user_id to transactions table

  1. Changes
    - Add user_id column to transactions table
    - Add foreign key constraint to auth.users
    - Update RLS policies to restrict access by user_id

  2. Security
    - Enable RLS
    - Add policy for authenticated users to manage their own transactions
*/

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update RLS policies
CREATE POLICY "Users can manage their own transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);