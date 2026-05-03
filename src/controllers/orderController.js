import { PrismaClient } from "@prisma/client";
import generateOrderId from "../utils/generateOrderId.js";

const prisma = new PrismaClient();

export const createOrder = async (req, res) => {
  try {
    const {
      productId,
      totalPrice,
      name,
      method,
      platform,
      version,
      gameUserId,
      notes,
    } = req.body;

    if (!productId || !totalPrice) {
      return res.status(400).json({
        error: "productId dan totalPrice wajib",
      });
    }

    // 🔥 TRANSACTION
    const result = await prisma.$transaction(async (tx) => {

      // 1. CREATE ORDER
      const order = await tx.order.create({
        data: {
          orderId: generateOrderId(),
          productId,
          totalPrice,
          status: "pending",

          name,
          method,
          platform,
          version,
          gameUserId,
          notes,
        },
      });

      // 2. CREATE GTA ORDER
      const gtaOrder = await tx.gTAOrder.create({
        data: {
          orderId: order.id, // 🔥 FK ke Order.id
          serviceType: "gta-v",
          targetAccount: gameUserId,
          progress: 0,
        },
      });

      return { order, gtaOrder };
    });

    res.status(200).json({
      message: "Order + GTAOrder berhasil dibuat",
      data: result,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message,
    });
  }
};