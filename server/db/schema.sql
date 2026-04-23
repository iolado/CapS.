-- This deletes the progress table if it already exists.
-- We delete child tables first because they depend on parent tables.
DROP TABLE IF EXISTS user_skill_progress;

-- This deletes the prerequisite table if it already exists.
DROP TABLE IF EXISTS skill_prerequisites;

-- This deletes the skills table if it already exists.
DROP TABLE IF EXISTS skills;

-- This deletes the skill_trees table if it already exists.
DROP TABLE IF EXISTS skill_trees;

-- This deletes the users table if it already exists.
DROP TABLE IF EXISTS users;

-- This creates the users table.
CREATE TABLE users (
  -- This is the primary key id for each user.
  id SERIAL PRIMARY KEY,

  -- This stores the user's name.
  name VARCHAR(100) NOT NULL,

  -- This stores the user's email and makes sure it is unique.
  email VARCHAR(255) UNIQUE NOT NULL,

  -- This stores the user's password value.
  password_hash TEXT NOT NULL,

  -- This stores the timestamp when the row was created.
  created_at TIMESTAMP DEFAULT NOW()
);

-- This creates the skill_trees table.
CREATE TABLE skill_trees (
  -- This is the primary key id for each tree.
  id SERIAL PRIMARY KEY,

  -- This connects the tree to a user in the users table.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- This stores the tree title.
  title VARCHAR(150) NOT NULL,

  -- This stores the tree description.
  description TEXT,

  -- This stores whether the tree is public or private.
  is_public BOOLEAN DEFAULT FALSE,

  -- This stores the timestamp when the row was created.
  created_at TIMESTAMP DEFAULT NOW()
);

-- This creates the skills table.
CREATE TABLE skills (
  -- This is the primary key id for each skill.
  id SERIAL PRIMARY KEY,

  -- This connects the skill to one tree.
  tree_id INTEGER NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,

  -- This stores the skill title.
  title VARCHAR(150) NOT NULL,

  -- This stores the skill description.
  description TEXT,

  -- This stores the skill difficulty.
  difficulty VARCHAR(50),

  -- This stores the x position for the visual map.
  position_x INTEGER DEFAULT 0,

  -- This stores the y position for the visual map.
  position_y INTEGER DEFAULT 0,

  -- This stores the timestamp when the row was created.
  created_at TIMESTAMP DEFAULT NOW()
);

-- This creates the skill_prerequisites table.
CREATE TABLE skill_prerequisites (
  -- This is the primary key id for each prerequisite row.
  id SERIAL PRIMARY KEY,

  -- This stores the skill that is being blocked.
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  -- This stores the skill that must be completed first.
  prerequisite_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  -- This prevents the exact same relationship from being saved twice.
  UNIQUE (skill_id, prerequisite_skill_id)
);

-- This creates the user_skill_progress table.
CREATE TABLE user_skill_progress (
  -- This is the primary key id for each progress row.
  id SERIAL PRIMARY KEY,

  -- This connects the progress row to one user.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- This connects the progress row to one skill.
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,

  -- This stores the current progress state.
  status VARCHAR(20) NOT NULL DEFAULT 'locked',

  -- This stores when the skill was completed.
  completed_at TIMESTAMP,

  -- This makes sure one user only has one progress row per skill.
  UNIQUE (user_id, skill_id)
);
