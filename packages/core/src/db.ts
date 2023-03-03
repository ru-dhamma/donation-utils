export * as Db from "./db";
import mysql, {Pool} from 'mysql2/promise'


export function now() {
  return new Date().toISOString();
}

var pool: Pool;
export function connection () {
    if (pool) {
      return pool;
    }


  pool = mysql.createPool({ database, user, host, password  });
  return pool;
}
