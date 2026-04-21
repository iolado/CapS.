// This imports the database client from client.js.
import db from "./client.js";

// This function gets every skill for one tree.
export async function getSkillsByTreeId(treeId) {
  // This runs a query that finds all skills for the selected tree.
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
  // This runs a query that finds one skill.
  const {
    rows: [skill],
  } = await db.query("SELECT * FROM skills WHERE id = $1;", [skillId]);

  // This returns the matching skill.
  return skill;
}

// This function creates one skill in the skills table.
export async function createSkill(treeId, title, description, difficulty) {
  // This adds a new skill and returns the created row.
  const {
    rows: [skill],
  } = await db.query(
    `INSERT INTO skills (tree_id, title, description, difficulty)
     VALUES ($1, $2, $3, $4)
     RETURNING *;`,
    [treeId, title, description, difficulty]
  );

  // This returns the new skill.
  return skill;
}

// This function updates one skill.
export async function updateSkill(skillId, title, description, difficulty) {
  // This updates the skill values and returns the changed row.
  const {
    rows: [skill],
  } = await db.query(
    `UPDATE skills
     SET title = $2,
         description = $3,
         difficulty = $4
     WHERE id = $1
     RETURNING *;`,
    [skillId, title, description, difficulty]
  );

  // This returns the updated skill.
  return skill;
}

// This function deletes one skill.
export async function deleteSkill(skillId) {
  // This removes the skill from the table.
  await db.query("DELETE FROM skills WHERE id = $1;", [skillId]);
}

// This function creates the skills table.
export async function createSkillsTable() {
  // This creates the table if it does not already exist.
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
