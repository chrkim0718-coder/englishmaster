-- 샘플 문법 문제 데이터 삽입
-- 데이터베이스 제약조건에 맞게 작성됨
-- difficulty_level: 'beginner', 'intermediate', 'advanced'
-- correct_answer: 'A', 'B', 'C', 'D'

-- 기존 데이터 삭제 (선택사항)
-- DELETE FROM public.grammar_questions;

-- 샘플 문법 문제들 삽입
INSERT INTO public.grammar_questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, grammar_type, difficulty_level) VALUES

-- 가정법 (Conditionals) - Beginner
('If it _____ tomorrow, we will stay home.', 'rain', 'rains', 'rained', 'will rain', 'B', 'In first conditional, use present simple in the if-clause.', 'Conditionals', 'beginner'),
('If I have time, I _____ call you.', 'will', 'would', 'can', 'must', 'A', 'In first conditional, use "will" in the main clause.', 'Conditionals', 'beginner'),
('If she _____ early, she catches the bus.', 'leaves', 'leave', 'left', 'will leave', 'A', 'In zero conditional, use present simple in both clauses.', 'Conditionals', 'beginner'),
('Water _____ if you heat it to 100°C.', 'boil', 'boils', 'boiled', 'will boil', 'B', 'In zero conditional for scientific facts, use present simple.', 'Conditionals', 'beginner'),

-- 가정법 (Conditionals) - Intermediate
('If I _____ rich, I would travel the world.', 'am', 'was', 'were', 'will be', 'C', 'Use "were" in hypothetical conditional sentences (second conditional).', 'Conditionals', 'intermediate'),
('If she studied harder, she _____ pass the exam.', 'will', 'would', 'can', 'must', 'B', 'In second conditional, use "would" in the main clause.', 'Conditionals', 'intermediate'),
('If they _____ the train, they would arrive on time.', 'catch', 'caught', 'will catch', 'have caught', 'B', 'In second conditional, use past simple in the if-clause.', 'Conditionals', 'intermediate'),

-- 가정법 (Conditionals) - Advanced  
('Had I known about the meeting, I _____ attended.', 'will have', 'would have', 'should have', 'must have', 'B', 'Third conditional with inverted structure uses "would have" + past participle.', 'Conditionals', 'advanced'),
('If you _____ harder last year, you would have passed.', 'studied', 'had studied', 'study', 'have studied', 'B', 'Third conditional requires past perfect in the if-clause.', 'Conditionals', 'advanced'),
('_____ you told me earlier, I could have helped.', 'If', 'Had', 'Should', 'Would', 'B', 'Inverted third conditional starts with "Had".', 'Conditionals', 'advanced'),

-- 조동사 (Modal Verbs) - Beginner
('You _____ wear a helmet when riding a bike.', 'should', 'would', 'could', 'might', 'A', 'Use "should" for advice and recommendations.', 'Modal Verbs', 'beginner'),
('_____ I borrow your pen?', 'Should', 'May', 'Must', 'Will', 'B', 'Use "May" for polite permission requests.', 'Modal Verbs', 'beginner'),
('She _____ swim very well when she was young.', 'can', 'could', 'may', 'might', 'B', 'Use "could" for past ability.', 'Modal Verbs', 'beginner'),
('You _____ not smoke in this building.', 'can', 'may', 'must', 'should', 'C', 'Use "must not" for prohibition.', 'Modal Verbs', 'beginner'),

-- 조동사 (Modal Verbs) - Intermediate
('She _____ speak three languages fluently.', 'can', 'should', 'must', 'will', 'A', 'Use "can" to express ability.', 'Modal Verbs', 'intermediate'),
('You _____ have called me yesterday.', 'should', 'would', 'could', 'might', 'A', 'Use "should have" for past advice or regret.', 'Modal Verbs', 'intermediate'),
('It _____ rain later, so take an umbrella.', 'can', 'should', 'might', 'will', 'C', 'Use "might" for possibility.', 'Modal Verbs', 'intermediate'),

-- 조동사 (Modal Verbs) - Advanced
('You _____ have seen his face when he heard the news!', 'should', 'would', 'could', 'might', 'A', 'Use "should have" for emphasis about past situations.', 'Modal Verbs', 'advanced'),
('He _____ be working late again tonight.', 'can', 'may', 'must', 'will', 'C', 'Use "must" for logical deduction.', 'Modal Verbs', 'advanced'),

-- 수동태 (Passive Voice) - Beginner
('The letters _____ delivered every morning.', 'is', 'are', 'was', 'were', 'B', 'Use "are" for plural subjects in present simple passive.', 'Passive Voice', 'beginner'),
('This cake _____ made by my grandmother.', 'is', 'are', 'was', 'were', 'C', 'Use "was" for singular past passive voice.', 'Passive Voice', 'beginner'),
('The windows _____ cleaned yesterday.', 'is', 'are', 'was', 'were', 'D', 'Use "were" for plural past passive voice.', 'Passive Voice', 'beginner'),

-- 수동태 (Passive Voice) - Intermediate
('The report _____ completed by tomorrow.', 'will be', 'will', 'is', 'was', 'A', 'Use "will be" + past participle for future passive.', 'Passive Voice', 'intermediate'),
('The book _____ by millions of people.', 'read', 'reads', 'was read', 'reading', 'C', 'Use passive voice "was read" for past actions done to the subject.', 'Passive Voice', 'intermediate'),
('The house _____ being painted right now.', 'is', 'was', 'has', 'had', 'A', 'Use "is being" for present continuous passive.', 'Passive Voice', 'intermediate'),

-- 수동태 (Passive Voice) - Advanced
('The building _____ constructed in 1995.', 'is', 'was', 'has been', 'had been', 'B', 'Use simple past passive for completed actions in the past.', 'Passive Voice', 'advanced'),
('By next month, the project _____ completed.', 'will be', 'will have been', 'is', 'was', 'B', 'Use future perfect passive "will have been" for actions completed by a future time.', 'Passive Voice', 'advanced'),

-- 현재 시제 (Present Simple) - Beginner  
('She _____ to the store every morning.', 'go', 'goes', 'going', 'gone', 'B', 'Use "goes" for third person singular in present simple tense.', 'Present Simple', 'beginner'),
('They _____ football every weekend.', 'play', 'plays', 'playing', 'played', 'A', 'Use base form for plural subjects in present simple.', 'Present Simple', 'beginner'),
('The sun _____ in the east.', 'rise', 'rises', 'rising', 'rose', 'B', 'Use present simple for universal truths.', 'Present Simple', 'beginner'),

-- 현재 시제 (Present Simple) - Intermediate
('He rarely _____ to work late.', 'stay', 'stays', 'stayed', 'staying', 'B', 'Use present simple with frequency adverbs.', 'Present Simple', 'intermediate'),
('Water _____ at 100 degrees Celsius.', 'boil', 'boils', 'boiling', 'boiled', 'B', 'Use present simple for scientific facts.', 'Present Simple', 'intermediate'),

-- 현재 완료 (Present Perfect) - Intermediate
('I have _____ finished my homework.', 'already', 'yet', 'still', 'never', 'A', '"Already" is used in positive statements to show completion.', 'Present Perfect', 'intermediate'),
('She _____ lived here for five years.', 'have', 'has', 'had', 'having', 'B', 'Use "has" with third person singular in present perfect.', 'Present Perfect', 'intermediate'),
('We _____ never been to Japan.', 'have', 'has', 'had', 'having', 'A', 'Use "have" with plural subjects in present perfect.', 'Present Perfect', 'intermediate'),

-- 현재 완료 (Present Perfect) - Advanced
('_____ you ever climbed a mountain?', 'Do', 'Did', 'Have', 'Had', 'C', 'Use "Have" for present perfect questions about life experience.', 'Present Perfect', 'advanced'),
('The company _____ just announced new policies.', 'have', 'has', 'had', 'having', 'B', 'Use "has" with singular subjects and "just" for recent completion.', 'Present Perfect', 'advanced');
