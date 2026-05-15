import { PrismaClient } from "@prisma/client";
import generateOrderId from "../utils/generateOrderId.js";
import { fileTypeFromFile } from "file-type";
import fs from "fs";
import nodemailer from "nodemailer";
import client from "../lib/discord.Bot.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";

console.log(process.env.EMAIL_USER);

const prisma = new PrismaClient();

const serviceLabels = {
  money: "Money Service",
  rank: "Rank Boost",
  unlock: "Unlock Service",
  paket: "Paket GTA V",
};

const createDiscordTicket = async (order, tx) => {
  try {
      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);

      const ticketName = `ticket-ord-${(order.name || "customer")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}-${order.id}`;

      const channel = await guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        // ini yang membuat channel masuk ke category ACTIVE TICKETS
        parent: process.env.DISCORD_ACTIVE_TICKET_CATEGORY_ID,
        reason: `New order ticket ${order.orderId}`,
      
              permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [
            PermissionFlagsBits.ViewChannel,
          ],
        },
        {
          id: process.env.DISCORD_OWNER_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: process.env.DISCORD_ADMIN_ROLE_ID,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    });

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        discordChannelId: channel.id,
      },
    });

    const ownerRoleId = process.env.DISCORD_OWNER_ROLE_ID;
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
    const mentionRoles = [ownerRoleId, adminRoleId].filter(Boolean);

    await channel.send({
      content: mentionRoles.map((roleId) => `<@&${roleId}>`).join(" "),

      allowedMentions: {
        roles: mentionRoles,
      },

      embeds: [
        {
          title: "🛒 ORDER BARU",
          color: 5763719,

          fields: [
            {
              name: "Order ID",
              value: order.orderId,
              inline: true,
            },
            {
              name: "Nama",
              value: order.name || "-",
              inline: true,
            },
            {
              name: "Service",
              value: order.service || "-",
              inline: true,
            },
            {
              name: "Item",
              value: order.item || "-",
              inline: false,
            },
            {
              name: "Harga",
              value: `Rp ${order.totalPrice.toLocaleString("id-ID")}`,
              inline: true,
            },
            {
              name: "Metode",
              value: order.method || "-",
              inline: true,
            },
            {
              name: "Platform",
              value: order.platform || "-",
              inline: true,
            },
            {
              name: "Versi",
              value: order.version || "-",
              inline: true,
            },
            {
              name: "Rockstar ID",
              value: order.gameUserId || "-",
              inline: false,
            },
            {
              name: "Notes",
              value: order.notes || "-",
              inline: false,
            },
          ],

          footer: {
            text: "HyperIndoStore",
          },

          timestamp: new Date(),
        },
      ],
    });

  } catch (err) {
    console.error("Discord ticket gagal:", err);
  }
};

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

    if (!name || !gameUserId) {
      return res.status(400).json({
        error: "Nama dan Rockstar ID wajib diisi",
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

        include: {
          product: true,
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
        await sendEmail(
            user.email,
            result.order.orderId,
            result.order.name,
            serviceLabels[result.order.product.category] || result.order.product.category,
            result.order.product.name,
            result.order.totalPrice
          );
      } catch (err) {
        console.error("Email gagal:", err.message);
      }
    }

    await createDiscordTicket({
      ...result.order,
      service: serviceLabels[result.order.product.category] || result.order.product.category,
      item: result.order.product.name,
    },
    
    prisma
  );

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

    if (order.discordChannelId) {
      try {
        const channel = await client.channels.fetch(
          order.discordChannelId
        );

        if (channel) {
          await channel.send({
            content:
              "📥 Bukti transfer berhasil diupload customer",

            files: [
              {
                attachment: filePath,
                name: req.file.filename,
              },
            ],
          });
        }
      } catch (err) {
        console.error(
          "Gagal kirim bukti transfer ke Discord:",
          err
        );
      }
    }

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

const escapeHtml = (value) => {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const sendEmail = async (
  to,
  orderId,
  name,
  service,
  item,
  totalPrice
) => {
  const safeOrderId = escapeHtml(orderId);
  const safeName = escapeHtml(name);
  const safeService = escapeHtml(service);
  const safeItem = escapeHtml(item);
  const formattedPrice = Number(totalPrice || 0).toLocaleString("id-ID");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    to,
    subject: `Order Berhasil - ${safeOrderId}`,
    text: `Terima kasih telah order jasa GTA V di HyperIndoStore. Order ID: ${orderId} - ${name}`,
    html: `
      <div style="margin:0;padding:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
        <div style="max-width:600px;margin:0 auto;padding:32px 18px;">
          <div style="background:#111111;border:1px solid #262626;border-radius:20px;overflow:hidden;">
            
            <div style="background:linear-gradient(135deg,#a3e635,#65a30d);padding:26px;text-align:center;color:#000000;">
              <div style="font-size:13px;font-weight:800;letter-spacing:1px;">
                HYPERINDOSTORE
              </div>

              <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">
                Order Berhasil Dibuat
              </h1>

              <p style="margin:8px 0 0;font-size:14px;">
                Terima kasih sudah order jasa GTA V di HyperIndoStore.
              </p>
            </div>

            <div style="padding:26px;">
              <p style="margin:0 0 18px;color:#d4d4d8;font-size:15px;line-height:1.7;">
                Halo <strong style="color:#ffffff;">${safeName}</strong>, order kamu sudah masuk ke sistem kami.
                Silakan lanjutkan pembayaran dan upload bukti transfer melalui halaman checkout.
              </p>

              <div style="background:#050505;border:1px solid #262626;border-radius:16px;padding:18px;margin-bottom:18px;">
                <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:.8px;">
                  Detail Order
                </p>

                <div style="margin-bottom:14px;">
                  <p style="margin:0;color:#71717a;font-size:13px;">Order ID</p>
                  <p style="margin:4px 0 0;color:#a3e635;font-size:19px;font-weight:800;">
                    ${safeOrderId} - ${safeName}
                  </p>
                </div>

                <div style="border-top:1px solid #262626;padding-top:14px;">
                  <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;">
                    <strong>Service:</strong> ${safeService}
                  </p>

                  <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;">
                    <strong>Item:</strong> ${safeItem}
                  </p>

                  <p style="margin:0;color:#e5e7eb;font-size:14px;">
                    <strong>Total:</strong> Rp ${formattedPrice}
                  </p>
                </div>
              </div>

              <div style="background:#0b0b0b;border-left:4px solid #a3e635;border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.7;">
                  Setelah pembayaran selesai, upload bukti transfer agar admin dapat segera memproses order kamu.
                </p>
              </div>

              <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;text-align:center;">
                Email ini dikirim otomatis oleh HyperIndoStore.<br/>
                Mohon jangan membalas email ini.
              </p>
            </div>
          </div>

          <p style="text-align:center;margin-top:16px;color:#52525b;font-size:12px;">
            © HyperIndoStore
          </p>
        </div>
      </div>
    `,
  });
};