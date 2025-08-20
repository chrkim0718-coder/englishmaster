-- Added missing semicolon to complete the INSERT statement
-- Re-executing the sample data insertion script
-- Execute this script to add sample grammar questions

-- Clear existing data first (optional)
-- DELETE FROM public.grammar_questions;

-- Insert sample grammar questions
INSERT INTO public.grammar_questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, grammar_type, difficulty_level) VALUES
('She _____ to the store every morning.', 'go', 'goes', 'going', 'gone', 'B', 'Use "goes" for third person singular in present simple tense.', 'Present Simple', 'beginner'),
('I have _____ finished my homework.', 'already', 'yet', 'still', 'never', 'A', '"Already" is used in positive statements to show completion.', 'Present Perfect', 'intermediate'),
('If I _____ rich, I would travel the world.', 'am', 'was', 'were', 'will be', 'C', 'Use "were" in hypothetical conditional sentences (second conditional).', 'Conditionals', 'intermediate'),
('The book _____ by millions of people.', 'read', 'reads', 'was read', 'reading', 'C', 'Use passive voice "was read" for past actions done to the subject.', 'Passive Voice', 'intermediate'),
('_____ you like some coffee?', 'Do', 'Would', 'Will', 'Are', 'B', 'Use "Would" for polite offers and requests.', 'Modal Verbs', 'beginner'),

-- 가정법 (Conditionals) - 더 많은 문제 추가
('If it _____ tomorrow, we will stay home.', 'rain', 'rains', 'rained', 'will rain', 'B', 'In first conditional, use present simple in the if-clause.', 'Conditionals', 'beginner'),
('If I have time, I _____ call you.', 'will', 'would', 'can', 'must', 'A', 'In first conditional, use "will" in the main clause.', 'Conditionals', 'beginner'),
('If she _____ early, she catches the bus.', 'leaves', 'leave', 'left', 'will leave', 'A', 'In zero conditional, use present simple in both clauses.', 'Conditionals', 'beginner'),
('Had I known about the meeting, I _____ attended.', 'will have', 'would have', 'should have', 'must have', 'B', 'Third conditional with inverted structure uses "would have" + past participle.', 'Conditionals', 'advanced'),
('If you _____ harder last year, you would have passed.', 'studied', 'had studied', 'study', 'have studied', 'B', 'Third conditional requires past perfect in the if-clause.', 'Conditionals', 'advanced'),

-- 조동사 (Modal Verbs) - 더 많은 문제 추가  
('You _____ wear a helmet when riding a bike.', 'should', 'would', 'could', 'might', 'A', 'Use "should" for advice and recommendations.', 'Modal Verbs', 'beginner'),
('_____ I borrow your pen?', 'Should', 'May', 'Must', 'Will', 'B', 'Use "May" for polite permission requests.', 'Modal Verbs', 'beginner'),
('She _____ speak three languages fluently.', 'can', 'should', 'must', 'will', 'A', 'Use "can" to express ability.', 'Modal Verbs', 'intermediate'),
('You _____ have told me earlier!', 'should', 'would', 'could', 'might', 'A', 'Use "should have" for past advice or regret.', 'Modal Verbs', 'advanced'),

-- 수동태 (Passive Voice) - 더 많은 문제 추가
('The letters _____ delivered every morning.', 'is', 'are', 'was', 'were', 'B', 'Use "are" for plural subjects in present simple passive.', 'Passive Voice', 'beginner'),
('This cake _____ made by my grandmother.', 'is', 'are', 'was', 'were', 'C', 'Use "was" for singular past passive voice.', 'Passive Voice', 'beginner'),
('The report _____ completed by tomorrow.', 'will be', 'will', 'is', 'was', 'A', 'Use "will be" + past participle for future passive.', 'Passive Voice', 'intermediate'),
('The building _____ constructed in 1995.', 'is', 'was', 'has been', 'had been', 'B', 'Use simple past passive for completed actions in the past.', 'Passive Voice', 'advanced');
