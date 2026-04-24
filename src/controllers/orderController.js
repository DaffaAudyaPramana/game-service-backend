import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createOrder = async (req, res) => {
  try {
    const order = await prisma.order.create({
      data: {
        orderId: "ORD-" + Date.now(),
        productId: 1, // sementara hardcode dulu
        totalPrice: 25000,
        status: "pending",
      },
    });

    res.json({
      message: "Order berhasil dibuat",
      data: order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Gagal create order",
    });
  }
};