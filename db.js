const mysql = require("mysql2/promise")

const pool = mysql.createPool(process.env.MYSQL_URL)

module.exports = pool

pool.getConnection()
  .then(conn => {
    console.log("✅ MySQL conectado via MYSQL_URL")
    conn.release()
  })
  .catch(err => {
    console.error("❌ Erro MySQL:", err)
  })
