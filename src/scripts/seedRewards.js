import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rewards = [
  {
    name: "5x Heist",
    description: "Redeem 5x run heist untuk layanan Money Heist GTA V.",
    category: "money",
    pointsCost: 25,
    sortOrder: 1,
    stock: null,
    active: true,
  },
  {
    name: "10x Heist",
    description: "Redeem 10x run heist untuk layanan Money Heist GTA V.",
    category: "money",
    pointsCost: 50,
    sortOrder: 2,
    stock: null,
    active: true,
  },
  {
    name: "15x Heist",
    description: "Redeem 15x run heist untuk layanan Money Heist GTA V.",
    category: "money",
    pointsCost: 75,
    sortOrder: 3,
    stock: null,
    active: true,
  },
  {
    name: "10 Kendaraan",
    description: "Redeem pemasangan 10 kendaraan untuk akun GTA V kamu.",
    category: "vehicle",
    pointsCost: 50,
    sortOrder: 4,
    stock: null,
    active: true,
  },
  {
    name: "Pilih & Pasang 1 Set Outfit",
    description: "Redeem 1 set outfit pilihan kamu untuk akun GTA V.",
    category: "outfit",
    pointsCost: 100,
    sortOrder: 5,
    stock: null,
    active: true,
  },
  {
    name: "SPESIAL - Bebas Pilih Layanan",
    description:
      "Bebas pilih layanan dari daftar harga HyperIndoStore. Konfirmasi detail reward dengan admin.",
    category: "special",
    pointsCost: 260,
    sortOrder: 6,
    stock: null,
    active: true,
  },
];

const main = async () => {
  // Nonaktifkan reward lama supaya tidak muncul di frontend
  await prisma.reward.updateMany({
    data: {
      active: false,
    },
  });

  // Tambahkan / update reward baru
  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: {
        name: reward.name,
      },
      update: reward,
      create: reward,
    });
  }

  console.log("Reward berhasil diperbarui");
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });