import { PrismaClient } from "@prisma/client";
import { ChannelType } from "discord.js";
import client from "../lib/discord.Bot.js";

const prisma = new PrismaClient();

const makeSafeChannelName = (name) => {
  const safeName = String(name || "customer")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);

  return safeName || "customer";
};

export const createFeedback = async (req, res) => {
  try {
    const { name, email, category, rating, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({
        error: "Nama dan pesan wajib diisi",
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        name: String(name).trim(),
        email: email ? String(email).trim() : null,
        category: category || "saran",
        rating: Number(rating || 5),
        message: String(message).trim(),
      },
    });

    let discordChannelId = null;

    try {
      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);

      const safeName = makeSafeChannelName(feedback.name);

      const channel = await guild.channels.create({
        name: `kritik-saran-${safeName}-${feedback.id}`,
        type: ChannelType.GuildText,
        parent: process.env.DISCORD_FEEDBACK_CATEGORY_ID,
        reason: `Feedback baru dari ${feedback.name}`,
      });

      discordChannelId = channel.id;

      await prisma.feedback.update({
        where: {
          id: feedback.id,
        },
        data: {
          discordChannelId,
        },
      });

      const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;

      await channel.send({
        content: adminRoleId ? `<@&${adminRoleId}>` : undefined,

        allowedMentions: adminRoleId
          ? {
              roles: [adminRoleId],
            }
          : undefined,

        embeds: [
          {
            title: "📝 Kritik & Saran Baru",
            color: 5763719,

            fields: [
              {
                name: "Nama",
                value: feedback.name || "-",
                inline: true,
              },
              {
                name: "Email",
                value: feedback.email || "-",
                inline: true,
              },
              {
                name: "Kategori",
                value: feedback.category || "-",
                inline: true,
              },
              {
                name: "Rating",
                value: `${feedback.rating}/5`,
                inline: true,
              },
              {
                name: "Pesan",
                value: feedback.message || "-",
                inline: false,
              },
            ],

            footer: {
              text: "HyperIndoStore Feedback",
            },

            timestamp: new Date(),
          },
        ],
      });
    } catch (discordError) {
      console.error("Gagal membuat channel feedback Discord:", discordError);
    }

    return res.status(201).json({
      message: "Kritik dan saran berhasil dikirim",
      data: {
        ...feedback,
        discordChannelId,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal mengirim kritik dan saran",
    });
  }
};