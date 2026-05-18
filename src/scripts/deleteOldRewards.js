import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const main = async () => {
  const oldRewardIds = [1, 2, 3, 4, 5, 6];

  const deleted = await prisma.reward.deleteMany({
    where: {
      id: {
        in: oldRewardIds,
      },
    },
  });

  console.log(`Berhasil menghapus ${deleted.count} reward lama`);
};

main()
  .catch((err) => {
    console.error("Gagal menghapus reward lama:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });