// This imports the shared database client from client.js.
// This file uses that client to send SQL queries to PostgreSQL.
import db from "./client.js";

// This function gets all prerequisite rows for one skill.
export async function getPrerequisitesBySkillId(skillId) {
  // This runs a query that joins skill_prerequisites with skills.
  // The join lets us get the title of the prerequisite skill.
  const { rows } = await db.query(
    `SELECT skill_prerequisites.id,
            skill_prerequisites.skill_id,
            skill_prerequisites.prerequisite_skill_id,
            skills.title AS prerequisite_title
     FROM skill_prerequisites
     JOIN skills ON skills.id = skill_prerequisites.prerequisite_skill_id
     WHERE skill_prerequisites.skill_id = $1
     ORDER BY skill_prerequisites.id;`,
    [skillId]
  );

  // This returns the list of prerequisite rows for that skill.
  return rows;
}

// This function creates one prerequisite relationship.
export async function createPrerequisite(skillId, prerequisiteSkillId) {
  // This runs an INSERT query that connects one skill to another skill.
  const {
    // This takes the inserted row that PostgreSQL returns and stores it in a variable called prerequisite.
    rows: [prerequisite],
  } = await db.query(
    `INSERT INTO skill_prerequisites (skill_id, prerequisite_skill_id)
     VALUES ($1, $2)
     RETURNING *;`,
    [skillId, prerequisiteSkillId]
  );

  // This returns the new prerequisite row.
  return prerequisite;
}

// This function deletes one prerequisite relationship.
export async function deletePrerequisite(prerequisiteId) {
  // This runs a DELETE query that removes the selected prerequisite row.
  await db.query("DELETE FROM skill_prerequisites WHERE id = $1;", [prerequisiteId]);
}

// This function counts how many prerequisites one skill has.
export async function countPrerequisitesForSkill(skillId) {
  // This runs a COUNT query and returns the number as an integer.
  const {
    // This takes the first returned row and stores it in a variable called result.
    rows: [result],
  } = await db.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM skill_prerequisites
     WHERE skill_id = $1;`,
    [skillId]
  );

  // This returns the count number from the result row.
  return result.count;
}

// This function creates the skill_prerequisites table if it does not already exist.
export async function createSkillPrerequisitesTable() {
  // This sends a CREATE TABLE query to PostgreSQL.
  await db.query(`
    CREATE TABLE IF NOT EXISTS skill_prerequisites (
      id SERIAL PRIMARY KEY,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      prerequisite_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE (skill_id, prerequisite_skill_id)
    );
  `);
}
