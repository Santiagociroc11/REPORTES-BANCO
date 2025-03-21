/*
  # Add RLS policies for categories table

  1. Security Changes
    - Enable RLS on categories table
    - Add policy for authenticated users to manage their own categories
    - Add policy for authenticated users to read parent categories
*/

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own categories
CREATE POLICY "Users can manage their own categories"
ON categories
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Policy for users to read parent categories (to support hierarchical categories)
CREATE POLICY "Users can read parent categories"
ON categories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    WITH RECURSIVE category_hierarchy AS (
      -- Base case: direct categories owned by the user
      SELECT id, parent_id
      FROM categories
      WHERE user_id = auth.uid()
      
      UNION ALL
      
      -- Recursive case: parent categories
      SELECT c.id, c.parent_id
      FROM categories c
      INNER JOIN category_hierarchy ch ON ch.parent_id = c.id
    )
    SELECT 1
    FROM category_hierarchy
    WHERE id = categories.id
  )
);