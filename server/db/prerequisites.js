// This imports the database client from client.js.
import db from "./client.js";

// This function gets all prerequisite rows for one skill.
export async function getPrerequisitesBySkillId(skillId) {
  // This finds every prerequisite tied to the selected skill.
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

  // This returns the prerequisite list.
  return rows;
}

// This function creates one prerequisite relationship.
export async function createPrerequisite(skillId, prerequisiteSkillId) {
  // This adds one relationship between two skills.
  const {
    rows: [prerequisite],
  } = await db.query(
    `INSERT INTO skill_prerequisites (skill_id, prerequisite_skill_id)
     VALUES ($1, $2)
     RETURNING *;`,
    [skillId, prerequisiteSkillId]
  );

  // This returns the new relationship.
  return prerequisite;
}

// This function deletes one prerequisite relationship.
export async function deletePrerequisite(prerequisiteId) {
  // This removes the relationship from the table.
  await db.query("DELETE FROM skill_prerequisites WHERE id = $1;", [prerequisiteId]);
}

// This function checks whether a skill has prerequisites.
export async function countPrerequisitesForSkill(skillId) {
  // This counts the number of prerequisite rows for the selected skill.
  const {
    rows: [result],
  } = await db.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM skill_prerequisites
     WHERE skill_id = $1;`,
    [skillId]
  );

  // This returns the count.
  return result.count;
}

// This function creates the skill_prerequisites table.
export async function createSkillPrerequisitesTable() {
  // This creates the table if it does not already exist.
  await db.query(`
    CREATE TABLE IF NOT EXISTS skill_prerequisites (
      id SERIAL PRIMARY KEY,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      prerequisite_skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      UNIQUE (skill_id, prerequisite_skill_id)
    );
  `);
}
