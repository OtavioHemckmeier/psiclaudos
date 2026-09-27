import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const result = await prisma.$runCommandRaw({
    update: 'Evaluation',
    updates: [
      {
        q: { updatedAt: null, createdAt: { $type: 'date' } },
        u: [{ $set: { updatedAt: '$createdAt' } }],
        multi: true,
      },
    ],
  });
  console.log(`Avaliações antigas atualizadas: ${result.nModified ?? 0}`);
} finally {
  await prisma.$disconnect();
}
