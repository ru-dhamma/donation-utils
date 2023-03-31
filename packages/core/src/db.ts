export * as Db from "./db";
import mysql, { Pool } from "mysql2/promise";
import {Config} from "sst/node/config";

export function now() {
  return new Date().toISOString();
}

var pool: Pool;
export function connection() {
  if (pool) {
    return pool;
  }

  const database = Config.DATABASE_NAME;
  const host = Config.DATABASE_HOST;
  const user = Config.DATABASE_USER;
  const password = Config.DATABASE_PASSWORD;

  pool = mysql.createPool({ database, user, host, password });
  return pool;
}
