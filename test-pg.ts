const { PrismaClient } = require('@prisma/client');
try {
  console.log(new PrismaClient({}));
} catch (e) {
  console.error(e);
}
