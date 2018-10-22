DROP DATABASE IF EXISTS "jobbotron";
CREATE DATABASE "jobbotron";
\c "jobbotron"
CREATE TABLE companies
(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  logo TEXT
  -- employees ARRAY DEFAULT [],
  -- jobs ARRAY DEFAULT []
);
INSERT INTO companies
  (name, email, logo, handle, password)
values
  ('MomCorp', 'mom@mom.com', 'https://res.cloudinary.com/teepublic/image/private/s--AHL2aAiC--/t_Preview/b_rgb:d3ddd8,c_limit,f_jpg,h_630,q_90,w_630/v1446232468/production/designs/236811_1.jpg', 'mom', 'pass'),
  ('Acme', 'acme@acme.com', 'https://i.pinimg.com/originals/82/be/7c/82be7c713e89b94d2a6f6a8c16bacf03.png', 'ac-atac', 'pass'),
  ('Stark Industries', 'stark@stark.com', 'https://images-na.ssl-images-amazon.com/images/I/510lvzoYXrL._SL1000_.jpg', 'stark', 'pass'),
  ('Nakatomi Trading Corp.', 'nak@nak.com', 'https://ih1.redbubble.net/image.506058298.5768/flat,550x550,075,f.u8.jpg', 'nktm', 'pass'),
  ('Spacely Space Sprockets', 'spacely@spacely.com', 'http://images.assettype.com/tgdaily%2F2016-09%2F236a5bd9-d358-4ba7-84d2-2cdb0fa5b6d6%2F20110421b_feature_image.jpg?fit=crop&crop=faces,top,right&w=1040', 'sss', 'pass');

CREATE TABLE users
(
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  photo TEXT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  current_company TEXT REFERENCES companies (handle) ON DELETE SET NULL
  -- applied_to ARRAY DEFAULT []
);
INSERT INTO users (first_name, last_name, email, username, password) VALUES
('Bobson', 'Dugnutt', 'bd@email.com', 'bdug', 'pass'),
('Hermione', 'Granger', 'hermione@hogwarts.com', 'hermione', '1234'),
('Sleve', 'McDichael', 'smd@email.com', 'slevey', 'pass');

CREATE TABLE jobs
(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT REFERENCES companies (handle) ON DELETE CASCADE,
  salary INTEGER NOT NULL,
  equity FLOAT
);
INSERT INTO jobs
  (title, salary, equity, company)
VALUES
  ('pencil pusher', 30000, 5, 'ac-atac'),
  ('code monkey', 80000, 4, 'ac-atac'),
  ('well-compensated narcissist', 100000, 99, 'stark'),
  ('brown-noser', 23000, 0, 'stark'),
  ('nose-browner', 46000, 2, 'nktm'),
  ('golden parachutist', 300000, 9999999, 'nktm'),
  ('son of the founder', 200000, 23456, 'nktm');
CREATE TABLE jobs_users
(
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE
);
