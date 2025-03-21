/*
  # Add Email Configuration

  1. Changes
    - Add email columns to users table if they don't exist
    - Add unique constraint for bank notification email
    - Set default email for admin user

  2. Security
    - Ensure unique bank notification emails
*/

-- Add columns if they don't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_notification_email text;

-- Drop the constraint if it exists and recreate it
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_bank_notification_email'
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT unique_bank_notification_email;
    END IF;

    -- Create the constraint
    ALTER TABLE users
    ADD CONSTRAINT unique_bank_notification_email UNIQUE (bank_notification_email);
END $$;

-- Update admin user with default email if not set
UPDATE users 
SET email = 'admin@example.com',
    email_verified = true
WHERE username = 'admin'
AND email IS NULL;