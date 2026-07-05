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
    await connection.query('USE edutrackassessmentdb;');
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('Tables in edutrackassessmentdb:', tables.map(t => Object.values(t)[0]));

    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const [columns] = await connection.query(`DESCRIBE ${tableName};`);
      console.log(`Columns in ${tableName}:`, columns.map(c => `${c.Field} (${c.Type})`));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
