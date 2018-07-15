const { Client } = require('pg');
const dbName = process.env.NODE_ENV === 'test' ? 'jobbotron_test' : 'jobbotron';

const client = new Client({
  connectionString:
    process.env.DATABASE_URL || `postgresql://localhost/${dbName}`
});

client.connect();

module.exports = client;
