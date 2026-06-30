const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'edutrack-database.mysql.database.azure.com',
    user: 'edutrack_database_server7777',
    password: 'Edutrack7007@',
    port: 3306,
    database: 'edutrackfinancedb',
    ssl: {
      rejectUnauthorized: false
    }
  });

  const centerId = 'fd0911e8-c6e7-41b2-8518-1b08c0adf14b';
  const subId = '38a40c97-76f8-45ae-bba5-c8ca5f328e64';

  try {
    console.log('--- Querying payment_transactions ---');
    const [txs] = await connection.query(
      'SELECT * FROM payment_transactions WHERE business_id = ? OR business_id = ?;',
      [centerId, subId]
    );
    console.log(JSON.stringify(txs, null, 2));

    console.log('\n--- Querying subscription_histories ---');
    const [hist] = await connection.query(
      'SELECT * FROM subscription_histories WHERE subscription_id = ?;',
      [subId]
    );
    console.log(JSON.stringify(hist, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

main();
