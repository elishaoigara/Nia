-- Review draft. Set app.nia_seed_author_id to an explicitly enrolled test profile
-- in the same transaction. These examples are labeled and never impersonate users.
-- No existing data is deleted by this script.
begin;
do $$
declare author_id uuid; item record;
begin
 author_id := nullif(current_setting('app.nia_seed_author_id', true), '')::uuid;
 if author_id is null or not exists (select 1 from public.test_profiles where user_id=author_id) then
   raise exception 'An enrolled Nia demo author is required';
 end if;
 for item in select * from (values
 (1,'What is one small change that would make your campus more welcoming?', 'ask','english','education'),
 (2,'What is a book, song, or film from your community you would recommend?', 'ask','english','culture'),
 (3,'Share one study habit that has helped you understand a difficult topic.', 'ask','english','education'),
 (4,'Ni ujuzi gani ungependa kujifunza mwaka huu?', 'ask','swahili','education'),
 (5,'What problem in your neighbourhood would you like technology to help solve?', 'ask','english','tech'),
 (6,'Which local artist should more people discover?', 'ask','english','music'),
 (7,'What is your favourite affordable meal to make at home?', 'ask','english','culture'),
 (8,'What advice would you give someone building their first portfolio?', 'ask','english','tech'),
 (9,'A useful way to begin a project: write the problem in one sentence, then ask who experiences it.', 'offer','english','tech'),
 (10,'For group study, try explaining a topic in your own words before checking your notes.', 'offer','english','education'),
 (11,'When preparing for an interview, practise describing a challenge, what you did, and what you learned.', 'offer','english','education'),
 (12,'Jaribu kugawa kazi kubwa katika hatua ndogo zinazoweza kufanyika kila siku.', 'offer','swahili','education'),
 (13,'A good photograph can begin with a simple background and natural light.', 'offer','english','culture'),
 (14,'Before sharing a link, check the source and date. Small checks help everyone.', 'offer','english','education'),
 (15,'A simple budget starts with writing down what comes in and what goes out.', 'offer','english','education'),
 (16,'Try testing a design with someone who has never seen it before. Ask them to think aloud.', 'offer','english','tech'),
 (17,'Today is a good day to revisit a goal and choose one achievable next step.', 'reflection','english','culture'),
 (18,'Learning is not a race. Progress can be quiet and still matter.', 'reflection','english','education'),
 (19,'Ubunifu unakua tunaposhirikishana mawazo na kusikilizana.', 'reflection','swahili','culture'),
 (20,'Communities grow when people share both their questions and what they have learned.', 'reflection','english','culture'),
 (21,'A useful project can start with listening before writing any code.', 'reflection','english','tech'),
 (22,'What is something you are proud of learning recently?', 'ask','english','education'),
 (23,'Which sport or game brings people together where you live?', 'ask','english','sports'),
 (24,'What would make a local creative event feel inclusive and welcoming?', 'ask','english','culture'),
 (25,'A reminder for creators: save a copy of your work and credit collaborators.', 'offer','english','culture'),
 (26,'What is one question you wish more people asked about your field?', 'ask','english','education'),
 (27,'Je, ni ushauri gani ungependa kumpa mwanafunzi anayeanza chuo?', 'ask','swahili','education'),
 (28,'What open-source project or learning resource helped you get started?', 'ask','english','tech'),
 (29,'A weekly reflection can be as simple as: what worked, what did not, and what comes next?', 'offer','english','education'),
 (30,'What does a supportive online community look like to you?', 'ask','english','culture')
 ) as p(n,body,mode,lang,category) loop
  insert into public.posts(id,user_id,content,contribution_mode,language,category,audience)
  values (md5('nia-demo-v2-text-' || item.n::text)::uuid,author_id,'[Nia demo] ' || item.body || ' #nia_demo_v2',item.mode,item.lang,item.category,'public')
  on conflict (id) do nothing;
 end loop;
end $$;
commit;
