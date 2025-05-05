// run-migrations.mjs
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Running database migrations...');
    const migrationPath = path.join(__dirname, 'migrations', '0000_fine_ben_grimm.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSql);
    console.log('Migrations applied successfully');
  } catch (error) {
    console.error('Error applying migrations:', error);
  } finally {
    await pool.end();
  }
}

runMigrations();