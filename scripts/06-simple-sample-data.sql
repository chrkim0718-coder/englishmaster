-- 간단한 샘플 데이터 (테스트용)
-- 위의 05-recreate-tables.sql을 먼저 실행한 후 이 스크립트를 실행하세요

INSERT INTO public.grammar_questions (
  question_text, 
  option_a, option_b, option_c, option_d, 
  correct_answer, 
  explanation, 
  grammar_type, 
  difficulty_level
) VALUES 

-- 가정법 초급 문제들
('If it _____ tomorrow, we will stay home.', 
 'rain', 'rains', 'rained', 'will rain', 
 'B', 
 'In first conditional, use present simple in the if-clause.', 
 'Conditionals', 
 'beginner'),

('If I have time, I _____ call you.', 
 'will', 'would', 'can', 'must', 
 'A', 
 'In first conditional, use will in the main clause.', 
 'Conditionals', 
 'beginner'),

('Water _____ if you heat it to 100°C.', 
 'boil', 'boils', 'boiled', 'will boil', 
 'B', 
 'In zero conditional for scientific facts, use present simple.', 
 'Conditionals', 
 'beginner'),

-- 조동사 초급 문제들
('You _____ wear a helmet when riding a bike.', 
 'should', 'would', 'could', 'might', 
 'A', 
 'Use should for advice and recommendations.', 
 'Modal Verbs', 
 'beginner'),

('_____ I borrow your pen?', 
 'Should', 'May', 'Must', 'Will', 
 'B', 
 'Use May for polite permission requests.', 
 'Modal Verbs', 
 'beginner'),

-- 수동태 초급 문제들
('The letters _____ delivered every morning.', 
 'is', 'are', 'was', 'were', 
 'B', 
 'Use are for plural subjects in present simple passive.', 
 'Passive Voice', 
 'beginner'),

('This cake _____ made by my grandmother.', 
 'is', 'are', 'was', 'were', 
 'C', 
 'Use was for singular past passive voice.', 
 'Passive Voice', 
 'beginner'),

-- 현재 시제 초급 문제들
('She _____ to the store every morning.', 
 'go', 'goes', 'going', 'gone', 
 'B', 
 'Use goes for third person singular in present simple tense.', 
 'Present Simple', 
 'beginner'),

('They _____ football every weekend.', 
 'play', 'plays', 'playing', 'played', 
 'A', 
 'Use base form for plural subjects in present simple.', 
 'Present Simple', 
 'beginner'),

-- 가정법 중급 문제
('If I _____ rich, I would travel the world.', 
 'am', 'was', 'were', 'will be', 
 'C', 
 'Use were in hypothetical conditional sentences (second conditional).', 
 'Conditionals', 
 'intermediate');
