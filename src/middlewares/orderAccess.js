import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const orderOwnerOrAdmin = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: {
        orderId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order tidak ditemukan",
      });
    }

    if (req.user.role !== "admin" && order.userId !== req.user.id) {
      return res.status(403).json({
        error: "Tidak punya akses ke order ini",
      });
    }

    req.orderAccess = order;

    next();
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal validasi akses order",
    });
  }
};