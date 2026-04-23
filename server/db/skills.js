// shared database client from client.js.
// This file uses that client to send SQL queries to PostgreSQL.
import db from "./client.js";

// This function gets every skill for one tree.
export async function getSkillsByTreeId(treeId) {
  // This runs a SELECT query that finds all skills for the selected tree.
  const { rows } = await db.query(
    `SELECT * FROM skills
     WHERE tree_id = $1
     ORDER BY id;`,
    [treeId]
  );

  // This returns the list of skills.
  return rows;
}

// This function gets one skill by id.
export async function getSkillById(skillId) {
  // This runs a query that looks for one skill row.
  const {
    // This takes the first matching row and stores it in a variable called skill.
    rows: [skill],
  } = await db.query("SELECT * FROM skills WHERE id = $1;", [skillId]);

  // This returns the matching skill row, or undefined if it was not found.
  return skill;
}

// This function creates one skill.
export async function createSkill(treeId, title, description, difficulty) {
  // This runs an INSERT query that adds one skill row.
  const {
    // This takes the inserted row that PostgreSQL returns and stores it in a variable called skill.
    rows: [skill],
  } = await db.query(
    // This SQL inserts the skill values into the correct columns.
    `INSERT INTO skills (tree_id, title, description, difficulty)
     VALUES ($1, $2, $3, $4)
     RETURNING *;`,
    // These values replace the SQL placeholders.
    [treeId, title, description, difficulty]
  );

  // This returns the newly created skill row.
  return skill;
}

// This function updates one skill.
export async function updateSkill(skillId, title, description, difficulty) {
  // This runs an UPDATE query that changes the selected skill row.
  const {
    // This takes the updated row that PostgreSQL returns and stores it in a variable called skill.
    rows: [skill],
  } = await db.query(
    // This SQL updates the title, description, and difficulty values.
    `UPDATE skills
     SET title = $2,
         description = $3,
         difficulty = $4
     WHERE id = $1
     RETURNING *;`,
    // These values replace the SQL placeholders.
    [skillId, title, description, difficulty]
  );

  // This returns the updated skill row.
  return skill;
}

// This function deletes one skill.
export async function deleteSkill(skillId) {
  // This runs a DELETE query that removes the selected skill row.
  await db.query("DELETE FROM skills WHERE id = $1;", [skillId]);
}

// This function creates the skills table if it does not already exist.
export async function createSkillsTable() {
  // This sends a CREATE TABLE query to PostgreSQL.
  await db.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      tree_id INTEGER NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      difficulty VARCHAR(50),
      position_x INTEGER DEFAULT 0,
      position_y INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
