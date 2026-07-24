import { prisma } from "./server/src/db.js"; async function main() { console.log(await prisma.post.findMany()); } main().catch(console.error);
