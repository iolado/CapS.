// This imports the database client from client.js.
import db from "./client.js";

// This function gets all progress rows for one user and one tree.
export async function getProgressByTreeId(userId, treeId) {
  // This gets progress for every skill in the selected tree.
  const { rows } = await db.query(
    `SELECT skills.id AS skill_id,
            skills.title,
            COALESCE(user_skill_progress.status, 'locked') AS status,
            user_skill_progress.completed_at
     FROM skills
     LEFT JOIN user_skill_progress
       ON user_skill_progress.skill_id = skills.id
      AND user_skill_progress.user_id = $1
     WHERE skills.tree_id = $2
     ORDER BY skills.id;`,
    [userId, treeId]
  );

  // This returns the progress rows.
  return rows;
}

// This function gets one progress row by user and skill.
export async function getProgressByUserAndSkill(userId, skillId) {
  // This finds one progress record.
  const {
    rows: [progress],
  } = await db.query(
    `SELECT * FROM user_skill_progress
     WHERE user_id = $1 AND skill_id = $2;`,
    [userId, skillId]
  );

  // This returns the progress record if it exists.
  return progress;
}

// This function checks whether all prerequisites are completed.
export async function prerequisitesAreCompleted(userId, skillId) {
  // This counts prerequisites that are not completed by the user.
  const {
    rows: [result],
  } = await db.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM skill_prerequisites
     LEFT JOIN user_skill_progress
       ON user_skill_progress.skill_id = skill_prerequisites.prerequisite_skill_id
      AND user_skill_progress.user_id = $1
     WHERE skill_prerequisites.skill_id = $2
       AND COALESCE(user_skill_progress.status, 'locked') <> 'completed';`,
    [userId, skillId]
  );

  // This returns true when nothing is blocking the skill.
  return result.count === 0;
}

// This function creates or updates one progress row.
export async function upsertProgress(userId, skillId, status) {
  // This picks a completed date only when the skill is completed.
  const completedAt = status === "completed" ? new Date() : null;

  // This inserts a new row or updates the existing row.
  const {
    rows: [progress],
  } = await db.query(
    `INSERT INTO user_skill_progress (user_id, skill_id, status, completed_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, skill_id)
     DO UPDATE
       SET status = EXCLUDED.status,
           completed_at = EXCLUDED.completed_at
     RETURNING *;`,
    [userId, skillId, status, completedAt]
  );

  // This returns the saved row.
  return progress;
}

// This function creates the user_skill_progress table.
export async function createUserSkillProgressTable() {
  // This creates the table if it does not already exist.
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_skill_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'locked',
      completed_at TIMESTAMP,
      UNIQUE (user_id, skill_id)
    );
  `);
}
