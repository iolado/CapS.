// This imports the shared database client from client.js.
// This file uses that client to send SQL queries to PostgreSQL.
import db from "./client.js";

// This function gets every tree in the skill_trees table.
export async function getTrees() {
  // This stores the SQL query in a variable.
  const SQL = "SELECT * FROM skill_trees ORDER BY id;";

  // This runs the SQL query through the shared database client.
  const { rows } = await db.query(SQL);

  // This returns the list of trees.
  return rows;
}

// This function gets every tree that belongs to one user.
export async function getTreesByUserId(userId) {
  // This stores the SQL query in a variable.
  const SQL = "SELECT * FROM skill_trees WHERE user_id = $1 ORDER BY id;";

  // This runs the SQL query and sends the userId into the $1 placeholder.
  const { rows } = await db.query(SQL, [userId]);

  // This returns the list of trees for that user.
  return rows;
}

// This function gets one tree by id.
export async function getTreeById(id) {
  // This runs a query that looks for one tree with the matching id.
  const {
    // This takes the first matching row and stores it in a variable called tree.
    rows: [tree],
  } = await db.query("SELECT * FROM skill_trees WHERE id = $1;", [id]);

  // This returns the matching tree row, or undefined if it was not found.
  return tree;
}

// This function creates a new tree.
export async function createTree(userId, title, description, isPublic) {
  // This runs an INSERT query that adds one new tree row.
  const {
    // This takes the inserted row that PostgreSQL returns and stores it in a variable called tree.
    rows: [tree],
  } = await db.query(
    // This SQL inserts the new tree values into the correct columns.
    `INSERT INTO skill_trees (user_id, title, description, is_public)
     VALUES ($1, $2, $3, $4)
     RETURNING *;`,
    // These values replace the SQL placeholders.
    [userId, title, description, isPublic]
  );

  // This returns the newly created tree row.
  return tree;
}

// This function updates one tree.
export async function updateTree(treeId, title, description, isPublic) {
  // This runs an UPDATE query that changes the selected tree row.
  const {
    // This takes the updated row that PostgreSQL returns and stores it in a variable called tree.
    rows: [tree],
  } = await db.query(
    // This SQL updates the title, description, and is_public values.
    `UPDATE skill_trees
     SET title = $2,
         description = $3,
         is_public = $4
     WHERE id = $1
     RETURNING *;`,
    // These values replace the SQL placeholders.
    [treeId, title, description, isPublic]
  );

  // This returns the updated tree row.
  return tree;
}

// This function deletes one tree.
export async function deleteTree(treeId) {
  // This runs a DELETE query that removes the selected tree row.
  await db.query("DELETE FROM skill_trees WHERE id = $1;", [treeId]);
}

// This function creates the skill_trees table if it does not already exist.
export async function createTreesTable() {
  // This sends a CREATE TABLE query to PostgreSQL.
  await db.query(`
    CREATE TABLE IF NOT EXISTS skill_trees (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
