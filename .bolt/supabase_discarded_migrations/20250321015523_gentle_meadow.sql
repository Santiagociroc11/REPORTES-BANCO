/*
  # Add custom categories and tags support

  1. New Tables
    - `custom_categories`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `parent_id` (uuid, self-reference for subcategories)
      - `user_id` (uuid, reference to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transaction_tags`
      - `transaction_id` (uuid, reference to transactions)
      - `tag_id` (uuid, reference to tags)
      - Primary key on (transaction_id, tag_id)

    - `tags`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `user_id` (uuid, reference to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Create custom_categories table
CREATE TABLE IF NOT EXISTS custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES custom_categories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Create transaction_tags table
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

-- Enable RLS
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

-- Policies for custom_categories
CREATE POLICY "Users can manage their own categories"
  ON custom_categories
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for tags
CREATE POLICY "Users can manage their own tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for transaction_tags
CREATE POLICY "Users can manage tags for their transactions"
  ON transaction_tags
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_id
    AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = transaction_id
    AND t.user_id = auth.uid()
  ));

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_categories_updated_at
  BEFORE UPDATE ON custom_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();