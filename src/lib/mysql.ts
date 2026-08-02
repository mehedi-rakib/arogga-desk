import mysql from 'mysql2/promise'

declare global {
  // eslint-disable-next-line no-var
  var _mysqlPool: mysql.Pool | undefined
}

export function getPool(): mysql.Pool {
  if (global._mysqlPool) return global._mysqlPool

  global._mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 20,
    decimalNumbers: true,
  })

  return global._mysqlPool
}
