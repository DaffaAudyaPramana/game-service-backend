import { PrismaClient } from "@prisma/client";
import generateOrderId from "../utils/generateOrderId.js";
import { fileTypeFromFile } from "file-type";
import fs from "fs";
import nodemailer from "nodemailer";

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

          userId: req.user.id,

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

    // 🔥 AMBIL USER
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // 🔥 KIRIM EMAIL
    if (user?.email) {
      try {
        await sendEmail(user.email, order.orderId);
      } catch (err) {
        console.error("Email gagal:", err.message);
      }
    }

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

export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        payment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      message: "List orders",
      data: orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal ambil orders" });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // "approved" | "rejected"

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Status tidak valid",
      });
    }

    const order = await prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order tidak ditemukan",
      });
    }

    // update payment
    const payment = await prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status,
      },
    });

    // update order juga
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: status === "approved" ? "completed" : "rejected",
      },
    });

    res.json({
      message: "Status berhasil diupdate",
      data: payment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Gagal update status",
    });
  }
};

const sendEmail = async (to, orderId) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    to,
    subject: "Order Berhasil",
    text: `Terima kasih telah order ${orderId}`,
  });
};