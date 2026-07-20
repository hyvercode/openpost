import { prisma } from './server/src/db.ts';
async function run() {
  const token = 'test-token' + Date.now();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  try {
    const ws = await prisma.workspace.create({
        data: {
            name: 'test',
            ownerId: '123'
        }
    });

    const inv = await prisma.invitation.create({
      data: {
        workspaceId: ws.id,
        email: 'test2@test.com',
        role: 'MEMBER',
        token,
        expiresAt
      }
    });
    console.log("Success:", inv);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
