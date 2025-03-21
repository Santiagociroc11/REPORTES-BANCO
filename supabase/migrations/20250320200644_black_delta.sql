/*
  # Add Telegram Configuration

  1. New Tables
    - `telegram_config`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `chat_id` (text)
      - `enabled` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `telegram_config` table
    - Add policies for authenticated users to manage their own config
*/

CREATE TABLE IF NOT EXISTS telegram_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  chat_id text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE telegram_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own telegram config"
  ON telegram_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_telegram_config_updated_at
  BEFORE UPDATE ON telegram_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();