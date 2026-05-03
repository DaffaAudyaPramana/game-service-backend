import { PrismaClient } from "@prisma/client";
import generateOrderId from "../utils/generateOrderId.js";
import { fileTypeFromFile } from "file-type";
import fs from "fs";

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

    const result = await prisma.$transaction(async (tx) => {
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

      const gtaOrder = await tx.gTAOrder.create({
        data: {
          orderId: order.id,
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

export const getOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order tidak ditemukan",
      });
    }

    res.json({
      message: "Berhasil ambil order",
      data: order,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Gagal ambil order",
    });
  }
};

// Function controller upload 
export const uploadPaymentProof = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        error: "File wajib diupload",
      });
    }

    // 🔥 VALIDASI ISI FILE (REAL CHECK)
    const filePath = req.file.path;
    const fileType = await fileTypeFromFile(filePath);

    const allowedMime = ["image/jpeg", "image/png"];

    if (!fileType || !allowedMime.includes(fileType.mime)) {
      fs.unlinkSync(filePath); // delete file
      return res.status(400).json({
        error: "File bukan gambar valid",
      });
    }

    // cari order
    const order = await prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      fs.unlinkSync(filePath);
      return res.status(404).json({
        error: "Order tidak ditemukan",
      });
    }

    // upsert payment
    const payment = await prisma.payment.upsert({
      where: {
        orderId: order.id,
      },
      update: {
        proof: req.file.filename,
        status: "pending",
      },
      create: {
        orderId: order.id,
        method: "manual",
        status: "pending",
        proof: req.file.filename,
      },
    });

    res.json({
      message: "Upload berhasil",
      data: payment,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Gagal upload",
    });
  }
};

