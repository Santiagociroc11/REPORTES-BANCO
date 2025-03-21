/*
  # Add Email Configuration

  1. Changes
    - Add email column to users table
    - Add email_verified column to track verification status
    - Add bank_notification_email for bank notifications

  2. Security
    - Keep existing policies
*/

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_notification_email text;

-- Add unique constraint to bank_notification_email
ALTER TABLE users
ADD CONSTRAINT unique_bank_notification_email UNIQUE (bank_notification_email);

-- Update admin user with default email
UPDATE users 
SET email = 'admin@example.com',
    email_verified = true
WHERE username = 'admin'
AND email IS NULL;