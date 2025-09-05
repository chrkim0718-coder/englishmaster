-- 로그 테이블: 임시 비밀번호 발송 내역
CREATE TABLE IF NOT EXISTS public.temp_password_logs (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);
