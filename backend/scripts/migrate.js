const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
          id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          filename    VARCHAR(255) NOT NULL UNIQUE,
          applied_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [applied_rows] = await connection.query('SELECT filename FROM _migrations ORDER BY filename');
    const applied_set = new Set(applied_rows.map((r) => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pending = files.filter((f) => !applied_set.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):`);

    for (const filename of pending) {
      const file_path = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(file_path, 'utf-8').trim();

      console.log(`  Applying: ${filename}...`);

      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [filename]);
        await connection.commit();
        console.log(`  Applied:  ${filename}`);
      } catch (error) {
        await connection.rollback();
        console.error(`  FAILED:   ${filename} -- ${error.message}`);
        throw error;
      }
    }

    console.log('All migrations applied successfully.');
  } finally {
    await connection.end();
  }
}

runMigrations().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exit(1);
});
