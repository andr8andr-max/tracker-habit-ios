const { Client } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
  const client = new Client({
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'club',
  });
  await client.connect();
  const hash = bcrypt.hashSync('owner12345', 10);
  const res = await client.query('UPDATE users SET password_hash = $1 WHERE email = $2', [
    hash,
    'owner@club.local',
  ]);
  console.log('updated rows:', res.rowCount);
  const users = await client.query('SELECT email, role FROM users ORDER BY created_at');
  console.log(users.rows);
  await client.end();
})().catch((error) => {
  console.error('ERR', error.message);
  process.exit(1);
});
