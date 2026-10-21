import { prisma } from '../server/src/db';
import jwt from 'jsonwebtoken';
const u = await prisma.user.findUnique({where:{uid:'c23dcc9c-52cc-4877-8367-d5e01f2c72f2'}});
const token = jwt.sign({uid:u!.uid, tv:(u as any).tokenVersion}, 'dev-insecure-jwt_secret-do-not-use-in-production');
const fs = require('fs');
fs.writeFileSync('/tmp/dev_token.txt', token);
console.log('ok');
process.exit(0);
