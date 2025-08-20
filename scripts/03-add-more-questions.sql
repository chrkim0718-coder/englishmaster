-- 더 많은 샘플 문제 추가
INSERT INTO public.grammar_questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, grammar_type, difficulty_level) VALUES

-- 가정법 (Conditionals) - Beginner
('If it _____ tomorrow, we will stay home.', 'rain', 'rains', 'rained', 'will rain', 'B', 'In first conditional, use present simple in the if-clause.', 'Conditionals', 'beginner'),
('If I have time, I _____ call you.', 'will', 'would', 'can', 'must', 'A', 'In first conditional, use "will" in the main clause.', 'Conditionals', 'beginner'),
('If she _____ early, she catches the bus.', 'leaves', 'leave', 'left', 'will leave', 'A', 'In zero conditional, use present simple in both clauses.', 'Conditionals', 'beginner'),

-- 가정법 (Conditionals) - Advanced  
('Had I known about the meeting, I _____ attended.', 'will have', 'would have', 'should have', 'must have', 'B', 'Third conditional with inverted structure uses "would have" + past participle.', 'Conditionals', 'advanced'),
('If you _____ harder last year, you would have passed.', 'studied', 'had studied', 'study', 'have studied', 'B', 'Third conditional requires past perfect in the if-clause.', 'Conditionals', 'advanced'),

-- 조동사 (Modal Verbs) - Beginner
('You _____ wear a helmet when riding a bike.', 'should', 'would', 'could', 'might', 'A', 'Use "should" for advice and recommendations.', 'Modal Verbs', 'beginner'),
('_____ I borrow your pen?', 'Should', 'May', 'Must', 'Will', 'B', 'Use "May" for polite permission requests.', 'Modal Verbs', 'beginner'),

-- 수동태 (Passive Voice) - Beginner
('The letters _____ delivered every morning.', 'is', 'are', 'was', 'were', 'B', 'Use "are" for plural subjects in present simple passive.', 'Passive Voice', 'beginner'),
('This cake _____ made by my grandmother.', 'is', 'are', 'was', 'were', 'C', 'Use "was" for singular past passive voice.', 'Passive Voice', 'beginner'),

-- 현재 시제 (Present Simple) - Advanced
('The earth _____ around the sun.', 'revolve', 'revolves', 'revolved', 'revolving', 'B', 'Use present simple for universal truths and facts.', 'Present Simple', 'advanced'),
('She rarely _____ to work late.', 'stay', 'stays', 'stayed', 'staying', 'B', 'Use present simple with frequency adverbs.', 'Present Simple', 'advanced');
