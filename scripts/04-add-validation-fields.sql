-- Add validation fields to grammar_questions table
ALTER TABLE grammar_questions 
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_review'
ADD COLUMN IF NOT EXISTS validation_notes TEXT,
ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- Create index for faster validation queries
CREATE INDEX IF NOT EXISTS idx_grammar_questions_validation 
ON grammar_questions(grammar_type, is_validated, validation_status);

-- Add comments for documentation
COMMENT ON COLUMN grammar_questions.is_validated IS 'Whether the question has been manually validated';
COMMENT ON COLUMN grammar_questions.validation_status IS 'Status of validation: pending, approved, rejected, needs_review';
COMMENT ON COLUMN grammar_questions.validation_notes IS 'Notes from the validator about the question';
COMMENT ON COLUMN grammar_questions.validated_by IS 'User ID who validated this question';
COMMENT ON COLUMN grammar_questions.validated_at IS 'Timestamp when the question was validated';
