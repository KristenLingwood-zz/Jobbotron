DROP DATABASE IF EXISTS "jobbotron";

CREATE DATABASE "jobbotron";

\c "jobbotron"

CREATE TABLE companies (id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
logo TEXT,
handle TEXT UNIQUE NOT NULL,
password TEXT NOT NULL);

INSERT INTO companies (name, logo, handle, password) values
('MomCorp', 'https://res.cloudinary.com/teepublic/image/private/s--AHL2aAiC--/t_Preview/b_rgb:d3ddd8,c_limit,f_jpg,h_630,q_90,w_630/v1446232468/production/designs/236811_1.jpg', 'mom', 'pass'),
('Acme', 'https://i.pinimg.com/originals/82/be/7c/82be7c713e89b94d2a6f6a8c16bacf03.png', 'ac-atac', 'pass'),
('Stark Industries', 'https://images-na.ssl-images-amazon.com/images/I/510lvzoYXrL._SL1000_.jpg', 'strak', 'pass'),
('Nakatomi Trading Corp.', 'https://ih1.redbubble.net/image.506058298.5768/flat,550x550,075,f.u8.jpg', 'nktm', 'pass'),
('Spacely Space Sprockets', 'http://images.assettype.com/tgdaily%2F2016-09%2F236a5bd9-d358-4ba7-84d2-2cdb0fa5b6d6%2F20110421b_feature_image.jpg?fit=crop&crop=faces,top,right&w=1040', 'sss', 'pass');


CREATE TABLE users (id SERIAL PRIMARY KEY,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
email TEXT NOT NULL,
photo TEXT,
username TEXT UNIQUE NOT NULL,
password TEXT NOT NULL,
company_id INTEGER REFERENCES companies (id) ON DELETE CASCADE);



CREATE TABLE jobs (id SERIAL PRIMARY KEY,
title TEXT NOT NULL,
salary INTEGER NOT NULL,
equity FLOAT,
company_id INTEGER REFERENCES companies (id) ON DELETE CASCADE);

INSERT INTO jobs (title, salary, equity, company_id) VALUES
('pencil pusher', 30000, 5, 2),
('code monkey', 80000, 4, 2),
('well-compensated narcissist', 100000, 99, 3),
('brown-noser', 23000, 0, 3),
('nose-browner', 46000, 2, 4),
('golden parachutist', 300000, 9999999, 4),
('son of the founder', 200000, 23456, 4);

CREATE TABLE jobs_users (id SERIAL PRIMARY KEY,
job_id INTEGER REFERENCES jobs (id) ON DELETE CASCADE,
user_id INTEGER REFERENCES users (id) ON DELETE CASCADE);