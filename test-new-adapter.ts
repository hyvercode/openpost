import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const databaseUrl = 'file:./dev.db';

let adapter = new PrismaBetterSqlite3({ url: databaseUrl });
let prisma = new PrismaClient({ adapter });
console.log('sqlite init successful');

const pgAdapter = new PrismaPg('postgresql://localhost/db');
console.log('pg init successful');

const mariadbAdapter = new PrismaMariaDb('mysql://localhost/db');
console.log('mariadb init successful');
