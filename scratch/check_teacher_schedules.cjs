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
    await connection.query('USE edutrackacademicdb;');
    
    // Find classes of teacher Nguyễn Văn D
    const teacherId = 'c50ed6b7-1e73-4bab-90df-09cc592d7199';
    const [classes] = await connection.query(
      'SELECT * FROM studyclass WHERE TeacherId = ?;',
      [teacherId]
    );
    
    if (classes.length === 0) return;

    const classIds = classes.map(c => c.Id);

    const [schedules] = await connection.query(
      "SELECT Id, Title, Date, CAST(Date AS CHAR) AS DateStr, StartTime, EndTime, RoomName FROM schedule WHERE ClassId IN (?) AND Date >= '2026-06-25' AND Date <= '2026-07-08';",
      [classIds]
    );

    console.log('Schedules around July 4th with raw strings:');
    console.log(schedules);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
