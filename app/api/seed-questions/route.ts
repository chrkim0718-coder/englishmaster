import { type NextRequest, NextResponse } from "next/server"
import { createApiClient } from "@/lib/supabase/server"

import { normalizeGrammarType } from "@/lib/ai/types"
const sampleQuestions = [
  // 가정법 (Conditionals) - Beginner
  {
    question_text: 'If it _____ tomorrow, we will stay home.',
    option_a: 'rain',
    option_b: 'rains', 
    option_c: 'rained',
    option_d: 'will rain',
    correct_answer: 'B',
    explanation: 'In first conditional, use present simple in the if-clause.',
  grammar_type: normalizeGrammarType('Conditionals'),
    difficulty_level: 'beginner'
  },
  {
    question_text: 'If I have time, I _____ call you.',
    option_a: 'will',
    option_b: 'would',
    option_c: 'can', 
    option_d: 'must',
    correct_answer: 'A',
    explanation: 'In first conditional, use "will" in the main clause.',
  grammar_type: normalizeGrammarType('Conditionals'),
    difficulty_level: 'beginner'
  },
  {
    question_text: 'If she _____ early, she catches the bus.',
    option_a: 'leaves',
    option_b: 'leave',
    option_c: 'left',
    option_d: 'will leave', 
    correct_answer: 'A',
    explanation: 'In zero conditional, use present simple in both clauses.',
  grammar_type: normalizeGrammarType('Conditionals'),
    difficulty_level: 'beginner'
  },
  
  // 가정법 (Conditionals) - Advanced
  {
    question_text: 'Had I known about the meeting, I _____ attended.',
    option_a: 'will have',
    option_b: 'would have',
    option_c: 'should have',
    option_d: 'must have',
    correct_answer: 'B',
    explanation: 'Third conditional with inverted structure uses "would have" + past participle.',
  grammar_type: normalizeGrammarType('Conditionals'),
    difficulty_level: 'advanced'
  },
  
  // 조동사 (Modal Verbs) - Beginner
  {
    question_text: 'You _____ wear a helmet when riding a bike.',
    option_a: 'should',
    option_b: 'would',
    option_c: 'could',
    option_d: 'might',
    correct_answer: 'A',
    explanation: 'Use "should" for advice and recommendations.',
  grammar_type: normalizeGrammarType('Modal Verbs'),
    difficulty_level: 'beginner'
  },
  {
    question_text: '_____ I borrow your pen?',
    option_a: 'Should',
    option_b: 'May', 
    option_c: 'Must',
    option_d: 'Will',
    correct_answer: 'B',
    explanation: 'Use "May" for polite permission requests.',
  grammar_type: normalizeGrammarType('Modal Verbs'),
    difficulty_level: 'beginner'
  }
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient()
    
    // Get user from session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('🌱 Seeding database with sample questions...')
    
    const { data, error } = await supabase
      .from('grammar_questions')
      .insert(sampleQuestions)
      .select()
    
    if (error) {
      console.error('❌ Error inserting questions:', error)
      return NextResponse.json({ error: "Failed to insert questions", details: error }, { status: 500 })
    }
    
    console.log('✅ Successfully inserted', data?.length, 'questions')
    
    return NextResponse.json({
      success: true,
      message: `Successfully inserted ${data?.length} questions`,
      questions: data
    })
    
  } catch (error) {
    console.error('❌ Seed API error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
