DROP TABLE IF EXISTS user_skill_progress;
DROP TABLE IF EXISTS skill_prerequisites;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS skill_trees;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skill_trees (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  tree_id INTEGER NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skill_prerequisites (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  prerequisite_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  UNIQUE (skill_id, prerequisite_skill_id)
);

CREATE TABLE user_skill_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'locked',
  completed_at TIMESTAMP,
  UNIQUE (user_id, skill_id)
);
