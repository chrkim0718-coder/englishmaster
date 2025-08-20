-- Add DELETE policies for admin functionality

-- Allow authenticated users to delete grammar questions (for admin functionality)
CREATE POLICY "Authenticated users can delete grammar questions" ON public.grammar_questions
  FOR DELETE TO authenticated USING (true);

-- Allow service role to delete grammar questions
CREATE POLICY "Service role can delete grammar questions" ON public.grammar_questions
  FOR DELETE TO service_role USING (true);

-- Allow authenticated users to update grammar questions (for admin functionality)
CREATE POLICY "Authenticated users can update grammar questions" ON public.grammar_questions
  FOR UPDATE TO authenticated USING (true);

-- Allow service role to update grammar questions
CREATE POLICY "Service role can update grammar questions" ON public.grammar_questions
  FOR UPDATE TO service_role USING (true);
