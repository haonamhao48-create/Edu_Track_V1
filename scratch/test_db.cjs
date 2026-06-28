const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Connecting to Azure MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: 'edutrack-database.mysql.database.azure.com',
      user: 'edutrack_database_server7777',
      password: 'Edutrack7007@',
      port: 3306,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('Connection succeeded!');
    await connection.end();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();
