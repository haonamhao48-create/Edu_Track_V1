const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'edutrack-database.mysql.database.azure.com',
    user: 'edutrack_database_server7777',
    password: 'Edutrack7007@',
    port: 3306,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('--- Show Databases ---');
    const [dbs] = await connection.query('SHOW DATABASES;');
    console.log(dbs);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
