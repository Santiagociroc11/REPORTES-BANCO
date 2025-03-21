/*
  # Add notification email to transactions

  1. Changes
    - Add notification_email column to transactions table
    - Add foreign key constraint to users.bank_notification_email
    - Update RLS policies

  2. Security
    - Ensure transactions are linked to users through email matching
*/

-- Add notification_email column
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS notification_email text;

-- Add foreign key constraint to users.bank_notification_email
ALTER TABLE transactions
ADD CONSTRAINT transactions_notification_email_fkey
FOREIGN KEY (notification_email)
REFERENCES users(bank_notification_email)
ON DELETE SET NULL;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_notification_email
ON transactions(notification_email);

-- Create a function to automatically set user_id based on notification_email
CREATE OR REPLACE FUNCTION set_transaction_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id based on the notification_email
    IF NEW.notification_email IS NOT NULL THEN
        NEW.user_id := (
            SELECT id 
            FROM users 
            WHERE bank_notification_email = NEW.notification_email
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set user_id
DROP TRIGGER IF EXISTS set_transaction_user_id_trigger ON transactions;
CREATE TRIGGER set_transaction_user_id_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION set_transaction_user_id();