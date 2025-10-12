-- Create the model_instructions table
CREATE TABLE model_instructions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    profile_name text NOT NULL,
    instructions text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add RLS policies for model_instructions
ALTER TABLE model_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own model instructions"
ON model_instructions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own model instructions"
ON model_instructions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own model instructions"
ON model_instructions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own model instructions"
ON model_instructions
FOR DELETE
USING (auth.uid() = user_id);
