const { Pool } = require('pg');
const config = require('./config');

// Cria a conexão com as configurações do config.js
const pool = new Pool({
    user: config.user,
    host: config.host,
    database: config.database,
    password: config.password,
    port: config.port,
    ssl: {
        rejectUnauthorized: false // Obrigatório para conectar no Render
    }
});

// Teste de conexão (opcional, mostra no terminal se conectou)
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar no banco:', err.stack);
    }
    console.log('Conexão com PostgreSQL realizada com sucesso!');
    release();
});

module.exports = pool;