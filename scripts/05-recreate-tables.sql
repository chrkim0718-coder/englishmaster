-- 기존 테이블 삭제 및 재생성
-- 데이터베이스 제약조건 문제 해결

-- 기존 테이블들 삭제 (외래키 순서에 맞게)
DROP TABLE IF EXISTS public.quiz_question_results CASCADE;
DROP TABLE IF EXISTS public.quiz_sessions CASCADE;
DROP TABLE IF EXISTS public.user_answers CASCADE;
DROP TABLE IF EXISTS public.grammar_questions CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- 사용자 프로필 테이블 재생성
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 문법 문제 테이블 재생성
CREATE TABLE public.grammar_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT NOT NULL,
  grammar_type TEXT NOT NULL,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 답안 테이블 재생성
CREATE TABLE public.user_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.grammar_questions(id) ON DELETE CASCADE,
  selected_answer CHAR(1) NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- 퀴즈 세션 테이블 재생성
CREATE TABLE public.quiz_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  grammar_type TEXT,
  difficulty_level TEXT,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percentage DECIMAL(5,2) NOT NULL,
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 퀴즈 문제별 결과 테이블 재생성
CREATE TABLE public.quiz_question_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.grammar_questions(id) ON DELETE CASCADE,
  user_answer CHAR(1) NOT NULL CHECK (user_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  question_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_results ENABLE ROW LEVEL SECURITY;

-- 사용자 프로필 정책
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 문법 문제 정책 (모든 인증된 사용자가 읽기 가능)
CREATE POLICY "Authenticated users can view questions" ON public.grammar_questions
  FOR SELECT USING (auth.role() = 'authenticated');

-- 사용자 답안 정책
CREATE POLICY "Users can view own answers" ON public.user_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answers" ON public.user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 퀴즈 세션 정책
CREATE POLICY "Users can view own sessions" ON public.quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 퀴즈 문제별 결과 정책
CREATE POLICY "Users can view own question results" ON public.quiz_question_results
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.quiz_sessions WHERE id = session_id)
  );

CREATE POLICY "Users can insert own question results" ON public.quiz_question_results
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.quiz_sessions WHERE id = session_id)
  );
