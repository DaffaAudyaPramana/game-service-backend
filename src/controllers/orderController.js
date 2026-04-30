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

    // VALIDASI
    if (!productId || !totalPrice) {
      return res.status(400).json({
        error: "productId dan totalPrice wajib",
      });
    }

    const order = await prisma.order.create({
      data: {
        orderId: generateOrderId(),
        productId,
        totalPrice,
        status: "pending",

        //SIMPAN SEMUA
        name,
        method,
        platform,
        version,
        gameUserId,
        notes,
      },
    });

    res.status(200).json({
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