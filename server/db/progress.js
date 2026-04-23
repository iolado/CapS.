// This imports the shared database client from client.js.
// This file uses that client to send SQL queries to PostgreSQL.
import db from "./client.js";

// This function gets all progress rows for one user and one tree.
export async function getProgressByTreeId(userId, treeId) {
  // This runs a query that starts from the skills table.
  // It then LEFT JOINs the progress table so every skill still appears even if progress has not been saved yet.
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

  // This returns the progress rows for that tree.
  return rows;
}

// This function gets one progress row by user and skill.
export async function getProgressByUserAndSkill(userId, skillId) {
  // This runs a query that looks for one progress row.
  const {
    // This takes the first matching row and stores it in a variable called progress.
    rows: [progress],
  } = await db.query(
    `SELECT * FROM user_skill_progress
     WHERE user_id = $1 AND skill_id = $2;`,
    [userId, skillId]
  );

  // This returns the matching progress row, or undefined if it was not found.
  return progress;
}

// This function checks whether all prerequisites are completed for one skill.
export async function prerequisitesAreCompleted(userId, skillId) {
  // This runs a COUNT query that looks for prerequisite skills that are still not completed.
  const {
    // This takes the first returned row and stores it in a variable called result.
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

  // This returns true only when the number of unfinished prerequisites is 0.
  return result.count === 0;
}

// This function creates or updates one progress row.
export async function upsertProgress(userId, skillId, status) {
  // This stores a completed date only when the status is completed.
  const completedAt = status === "completed" ? new Date() : null;

  // This runs an INSERT query with ON CONFLICT.
  // That means it inserts a new row first, but updates the existing row if that user and skill already have progress saved.
  const {
    // This takes the saved row that PostgreSQL returns and stores it in a variable called progress.
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

  // This returns the saved progress row.
  return progress;
}

// This function creates the user_skill_progress table if it does not already exist.
export async function createUserSkillProgressTable() {
  // This sends a CREATE TABLE query to PostgreSQL.
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
