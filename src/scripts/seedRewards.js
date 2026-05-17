import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rewards = [
  {
    name: "Uang IC / In Game 20.000",
    description: "Reward money kecil untuk customer aktif.",
    category: "money",
    pointsCost: 150,
    stock: null,
    active: true,
  },
  {
    name: "Uang IC 50.000 + Voucher Dealer 30%",
    description: "Reward money dan voucher diskon.",
    category: "voucher",
    pointsCost: 700,
    stock: null,
    active: true,
  },
  {
    name: "15.000 Uang IC + PDM Motorcycle",
    description: "Reward kendaraan motor PDM + uang IC.",
    category: "vehicle",
    pointsCost: 900,
    stock: null,
    active: true,
  },
  {
    name: "10.000 Uang IC + PDM SUV",
    description: "Reward kendaraan SUV PDM + uang IC.",
    category: "vehicle",
    pointsCost: 1700,
    stock: null,
    active: true,
  },
  {
    name: "Voucher Diskon Donasi 250.000",
    description: "Voucher diskon untuk order atau donasi berikutnya.",
    category: "discount",
    pointsCost: 2200,
    stock: null,
    active: true,
  },
  {
    name: "Mobil Sport Import",
    description: "Reward kendaraan sport import.",
    category: "vehicle",
    pointsCost: 3200,
    stock: null,
    active: true,
  },
];

const main = async () => {
  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: {
        name: reward.name,
      },
      update: reward,
      create: reward,
    });
  }

  console.log("Reward seed berhasil");
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });