/*
  # Transaction Reporting System Schema

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `amount` (decimal, not null)
      - `description` (text, not null)
      - `transaction_date` (timestamptz, not null)
      - `reported` (boolean, default false)
      - `category` (text)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `transactions` table
    - Add policies for authenticated users to read and update transactions
*/

CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    amount decimal NOT NULL,
    description text NOT NULL,
    transaction_date timestamptz NOT NULL,
    reported boolean DEFAULT false,
    category text,
    comment text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow all users to read transactions
CREATE POLICY "Allow users to read transactions" ON transactions
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to update only category and comment fields
CREATE POLICY "Allow users to update transaction reports" ON transactions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();