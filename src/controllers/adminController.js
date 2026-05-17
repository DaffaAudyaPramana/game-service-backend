import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllUsersWithOrders = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,

        orders: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            product: true,
            payment: true,
            gtaOrder: true,
          },
        },
      },
    });

    return res.json({
      message: "Berhasil ambil semua user",
      data: users,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil data user",
    });
  }
};