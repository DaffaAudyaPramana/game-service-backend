import { PrismaClient } from "@prisma/client";
import generateOrderId from "../utils/generateOrderId.js";
import { fileTypeFromFile } from "file-type";
import fs from "fs";
import { sendEmail } from "../utils/mailer.js";
import client from "../lib/discord.Bot.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";

console.log(process.env.EMAIL_USER);

const prisma = new PrismaClient();

const POINT_RATE = 10000;
const BONUS_POINT_MIN_PRICE = 200000;
const BONUS_POINTS = 3;

const calculateOrderPoints = (totalPrice) => {
  const price = Number(totalPrice || 0);

  const basePoints = Math.floor(price / POINT_RATE);

  const bonusPoints = price > BONUS_POINT_MIN_PRICE ? BONUS_POINTS : 0;

  return basePoints + bonusPoints;
};

const serviceLabels = {
  money: "Money Service",
  rank: "Rank Boost",
  unlock: "Unlock Service",
  paket: "Paket GTA V",
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        product: true,
        payment: true,
        gtaOrder: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      message: "Berhasil ambil order customer",
      data: orders,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil order customer",
    });
  }
};

    const getOrderItems = (order) => {
      if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
        return order.orderItems.map((item) => ({
          service: getServiceLabel(item.productType),
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        }));
      }

      return [
        {
          service: getServiceLabel(order.product?.type || order.product?.category),
          name: order.product?.name || order.item || "-",
          price: order.totalPrice,
          quantity: 1,
          subtotal: order.totalPrice,
        },
      ];
    };

    const getOrderServiceName = (items) => {
      const services = [...new Set(items.map((item) => item.service))];

      if (services.length === 1) return services[0];

      return "Custom Order";
    };

    const buildOrderItemsText = (items) => {
      return items
        .map((item, index) => {
          const qtyText = item.quantity > 1 ? ` x${item.quantity}` : "";
          const priceText = Number(item.subtotal || 0).toLocaleString("id-ID");

          return `${index + 1}. ${item.name}${qtyText} — Rp ${priceText}`;
        })
        .join("\n");
    };

const createDiscordTicket = async (order, tx) => {
  let channel = null;

  const mentionRoles = [
    process.env.DISCORD_OWNER_ROLE_ID,
    process.env.DISCORD_ADMIN_ROLE_ID,
  ].filter(Boolean);

  const orderId = order.orderId || `ORD-${order.id}`;
  const name = order.name || "Customer";
  const to = order.email || order.user?.email;

  const orderItems = getOrderItems(order);
  const serviceName = serviceLabels[serviceKey] || serviceKey || "-";
  const itemsText = buildOrderItemsText(orderItems);

  const safeOrderId = escapeHtml(orderId);
  const safeName = escapeHtml(name);
  const safeService = escapeHtml(serviceName);
  const safeItem = escapeHtml(itemName);
  const safeWhatsapp = escapeHtml(order.whatsapp || "-");
  const safeDiscordUsername = escapeHtml(order.discordUsername || "-");
  const formattedPrice = Number(order.totalPrice || 0).toLocaleString("id-ID");

  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);

    const ticketName = `ticket-ord-${name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")}-${order.id}`;

    channel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: process.env.DISCORD_ACTIVE_TICKET_CATEGORY_ID,
      reason: `New order ticket ${orderId}`,

      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
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
  } catch (err) {
    console.error("Discord channel gagal dibuat:", err?.message || err);
  }

    if (!channel) {
      console.error("Discord message dilewati: channel tidak tersedia");
      return;
    }

    channel
      .send({
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
                value: order.orderId || "-",
                inline: true,
              },
              {
                name: "Nama",
                value: order.name || "-",
                inline: true,
              },
              {
                name: "Service",
                value: serviceName,
                inline: true,
              },
              {
                name: "Item",
                value: itemsText || "-",
                inline: false,
              },
              {
                name: "Harga Total",
                value: `Rp ${Number(order.totalPrice || 0).toLocaleString("id-ID")}`,
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
                name: "WhatsApp",
                value: order.whatsapp || "-",
                inline: true,
              },
              {
                name: "Rockstar ID",
                value: order.gameUserId || "-",
                inline: false,
              },
              {
                name: "User Discord",
                value: order.discordUsername || "-",
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

            timestamp: new Date().toISOString(),
          },
        ],
      })
      .catch((err) => {
        console.error("Discord message gagal:", err?.message || err);
      });

      return channel;
  };

    const ownerRoleId = process.env.DISCORD_OWNER_ROLE_ID;
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
    const mentionRoles = [ownerRoleId, adminRoleId].filter(Boolean);

    const normalize = (value = "") =>
      String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const toNumber = (value) => {
      if (typeof value === "number") return value;

      return Number(String(value || "").replace(/\D/g, ""));
    };

    const findProductFromOrderItem = async (tx, rawItem) => {
      const numericProductId = rawItem.productId ? Number(rawItem.productId) : null;
      const numericPrice = rawItem.price
        ? toNumber(rawItem.price)
        : toNumber(rawItem.totalPrice);

      const itemName = rawItem.name || rawItem.item || rawItem.label || "";
      const service = rawItem.service || rawItem.type || rawItem.category || "";

      if (numericProductId && !Number.isNaN(numericProductId)) {
        const product = await tx.product.findUnique({
          where: {
            id: numericProductId,
          },
        });

        if (product) return product;
      }

      const candidates = await tx.product.findMany({
        where: {
          ...(numericPrice
            ? {
                price: numericPrice,
              }
            : {}),
          ...(service
            ? {
                OR: [
                  {
                    type: service,
                  },
                  {
                    category: service,
                  },
                ],
              }
            : {}),
        },
        orderBy: {
          id: "asc",
        },
      });

      return (
        candidates.find(
          (candidate) => normalize(candidate.name) === normalize(itemName)
        ) ||
        candidates[0] ||
        null
      );
    };

    const getServiceLabel = (typeOrCategory) => {
      return serviceLabels[typeOrCategory] || typeOrCategory || "-";
    };

export const createOrder = async (req, res) => {
  try {
    const {
      productId,
      service,
      item,
      totalPrice,

      items,

      name,
      method,
      platform,
      version,
      gameUserId,
      whatsapp,
      discordUsername,
      notes,
    } = req.body;

    const customerName = String(name || "").trim();
    const rockstarId = String(gameUserId || "").trim();
    const cleanWhatsapp = String(whatsapp || "").trim();
    const cleanDiscordUsername = String(discordUsername || "").trim();

    if (!customerName || !rockstarId) {
      return res.status(400).json({
        error: "Nama dan Rockstar ID wajib diisi",
      });
    }

    if (!cleanWhatsapp || !cleanDiscordUsername) {
      return res.status(400).json({
        error: "WhatsApp dan Username Discord wajib diisi",
      });
    }

    const rawItems =
      Array.isArray(items) && items.length > 0
        ? items
        : productId || item || totalPrice
        ? [
            {
              productId,
              service,
              item,
              name: item,
              price: totalPrice,
              totalPrice,
              quantity: 1,
            },
          ]
        : [];

    if (!rawItems.length) {
      return res.status(400).json({
        error: "Keranjang masih kosong atau item checkout tidak valid",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const resolvedItems = [];

      for (const rawItem of rawItems) {
        const product = await findProductFromOrderItem(tx, rawItem);

        if (!product) {
          throw new Error(
            `Produk tidak ditemukan: ${
              rawItem.name || rawItem.item || rawItem.service || "-"
            }`
          );
        }

        const quantity = Math.max(1, Number(rawItem.quantity || 1));
        const subtotal = product.price * quantity;

        resolvedItems.push({
          product,
          quantity,
          subtotal,
        });
      }

      const totalOrderPrice = resolvedItems.reduce(
        (total, currentItem) => total + currentItem.subtotal,
        0
      );

      const firstProduct = resolvedItems[0].product;

      const order = await tx.order.create({
        data: {
          orderId: generateOrderId(),

          userId: req.user.id,
          productId: firstProduct.id,

          totalPrice: totalOrderPrice,
          status: "pending",

          name: customerName,
          method,
          platform,
          version,
          gameUserId: rockstarId,
          whatsapp: cleanWhatsapp,
          discordUsername: cleanDiscordUsername,
          notes,
        },
      });

      await tx.orderItem.createMany({
        data: resolvedItems.map((currentItem) => ({
          orderId: order.id,
          productId: currentItem.product.id,

          productName: currentItem.product.name,
          productCategory: currentItem.product.category,
          productType: currentItem.product.type,

          price: currentItem.product.price,
          quantity: currentItem.quantity,
          subtotal: currentItem.subtotal,
        })),
      });

      const gtaOrder = await tx.gTAOrder.create({
        data: {
          orderId: order.id,
          serviceType: "gta-v",
          targetAccount: rockstarId,
          progress: 0,
        },
      });

      const fullOrder = await tx.order.findUnique({
        where: {
          id: order.id,
        },
        include: {
          product: true,
          user: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      return {
        order: fullOrder,
        gtaOrder,
      };
    });

    await createDiscordTicket(result.order, prisma);

    return res.status(201).json({
      message: "Order berhasil dibuat",
      data: result,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message || "Gagal membuat order",
    });
  }
};

// KIRIM EMAIL
if (user?.email) {
  try {
    const orderId = result.order.orderId;
    const name = result.order.name;
    const service =
      serviceLabels[result.order.product.category] ||
      result.order.product.category;
    const item = result.order.product.name;
    const totalPrice = result.order.totalPrice;
    const formattedPrice = Number(totalPrice || 0).toLocaleString("id-ID");

    await sendEmail({
      to: user.email,
      subject: `Order Berhasil - ${orderId}`,
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
                  Halo <strong style="color:#ffffff;">${name}</strong>, order kamu sudah masuk ke sistem kami.
                  Silakan lanjutkan pembayaran dan upload bukti transfer melalui halaman checkout.
                </p>

                <div style="background:#050505;border:1px solid #262626;border-radius:16px;padding:18px;margin-bottom:18px;">
                  <p style="margin:0 0 8px;color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:.8px;">
                    Detail Order
                  </p>

                  <div style="margin-bottom:14px;">
                    <p style="margin:0;color:#71717a;font-size:13px;">Order ID</p>
                    <p style="margin:4px 0 0;color:#a3e635;font-size:19px;font-weight:800;">
                      ${orderId} - ${name}
                    </p>
                  </div>

                  <div style="border-top:1px solid #262626;padding-top:14px;">
                    <p style="margin:0 0 8px;color:#e5e7eb;font-size:14px;">
                      <strong>Service:</strong> ${service}
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
  } catch (err) {
    console.error("Email gagal:", err?.message || err);
  }
}

export const getOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: {
        orderId,
      },
      include: {
        product: true,
        payment: true,
        gtaOrder: true,
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order tidak ditemukan",
      });
    }

    return res.json({
      message: "Berhasil ambil order",
      data: order,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
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
        product: true,
        payment: true,
        gtaOrder: true,
        orderItems: {
          include: {
            product: true,
          },
        },
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
      include: {
        payment: true,
        user: true,
        pointLedger: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        error: "Order tidak ditemukan",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.upsert({
        where: {
          orderId: order.id,
        },
        update: {
          status,
        },
        create: {
          orderId: order.id,
          status,
          method: order.paymentMethod ?? order.method ?? "manual",
        },
      });

      const updatedOrder = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: status === "approved" ? "completed" : "rejected",
        },
      });

      let earnedPoints = 0;

      if (status === "approved" && order.userId) {
        const existingPointLedger = await tx.pointLedger.findUnique({
          where: {
            orderId: order.id,
          },
        });

        if (!existingPointLedger) {
          earnedPoints = calculateOrderPoints(order.totalPrice);

          const updatedUser = await tx.user.update({
            where: {
              id: order.userId,
            },
            data: {
              points: {
                increment: earnedPoints,
              },
            },
            select: {
              points: true,
            },
          });

          await tx.pointLedger.create({
            data: {
              userId: order.userId,
              orderId: order.id,
              type: "EARN",
              points: earnedPoints,
              description: `Poin dari order ${order.orderId}`,
              balanceAfter: updatedUser.points,
            },
          });
        }
      }

      return {
        payment,
        order: updatedOrder,
        earnedPoints,
      };
    });

    return res.json({
      message:
        status === "approved"
          ? `Pembayaran berhasil diapprove. Customer mendapatkan ${result.earnedPoints} poin.`
          : "Pembayaran berhasil ditolak",
      data: result,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
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