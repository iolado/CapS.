// This imports the shared database client from client.js.
// This file uses that client to send SQL queries to PostgreSQL.
import db from "./client.js";

// This function gets every user in the users table.
export async function getUsers() {
  // This stores the SQL query in a variable.
  const SQL = "SELECT * FROM users ORDER BY id;";

  // This sends the SQL query to PostgreSQL using the shared db client.
  const { rows } = await db.query(SQL);

  // This returns the list of users back to the file that called this function.
  return rows;
}

// This function gets one user by email.
export async function getUserByEmail(email) {
  // This sends a query that looks for a row where the email matches the value passed in.
  const {
    // This takes the first matching row and stores it in a variable called user.
    rows: [user],
  } = await db.query("SELECT * FROM users WHERE email = $1;", [email]);

  // This returns the matching user row, or undefined if no user was found.
  return user;
}

// This function gets one user by id.
export async function getUserById(id) {
  // This sends a query that looks for a row where the id matches the value passed in.
  const {
    // This takes the first matching row and stores it in a variable called user.
    rows: [user],
  } = await db.query("SELECT * FROM users WHERE id = $1;", [id]);

  // This returns the matching user row, or undefined if no user was found.
  return user;
}

// This function creates a new user.
export async function createUser(name, email, passwordHash) {
  // This runs an INSERT query that adds a new row into the users table.
  const {
    // This takes the inserted row that PostgreSQL returns and stores it in a variable called user.
    rows: [user],
  } = await db.query(
    // This SQL inserts the three values into the correct columns.
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *;`,
    // These values replace $1, $2, and $3 in the SQL query above.
    [name, email, passwordHash]
  );

  // This returns the newly created user row.
  return user;
}

// This function creates the users table if it does not already exist.
export async function createUsersTable() {
  // This sends a CREATE TABLE query to PostgreSQL.
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
