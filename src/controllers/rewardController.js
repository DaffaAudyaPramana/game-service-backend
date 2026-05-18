import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getRewards = async (req, res) => {
  try {
    const rewards = await prisma.reward.findMany({
      where: {
        active: true,
      },
      orderBy: [
      {
        sortOrder: "asc",
      },
      {
        pointsCost: "asc",
      },
     ],
    });

    return res.json({
      message: "Berhasil ambil reward",
      data: rewards,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil reward",
    });
  }
};

export const getMyPoints = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        points: true,
      },
    });

    const ledgers = await prisma.pointLedger.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        order: {
          select: {
            orderId: true,
            totalPrice: true,
            status: true,
          },
        },
        redemption: {
          include: {
            reward: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    });

    const redemptions = await prisma.rewardRedemption.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        reward: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      message: "Berhasil ambil poin user",
      data: {
        user,
        points: user?.points || 0,
        ledgers,
        redemptions,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil data poin",
    });
  }
};

export const redeemReward = async (req, res) => {
  try {
    const rewardId = Number(req.params.rewardId);
    const { notes } = req.body;

    if (!rewardId) {
      return res.status(400).json({
        error: "Reward tidak valid",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: req.user.id,
        },
      });

      if (!user) {
        const error = new Error("User tidak ditemukan");
        error.status = 404;
        throw error;
      }

      const reward = await tx.reward.findUnique({
        where: {
          id: rewardId,
        },
      });

      if (!reward || !reward.active) {
        const error = new Error("Reward tidak tersedia");
        error.status = 404;
        throw error;
      }

      if (reward.stock !== null && reward.stock <= 0) {
        const error = new Error("Stock reward habis");
        error.status = 400;
        throw error;
      }

      if (user.points < reward.pointsCost) {
        const error = new Error("Poin kamu belum cukup");
        error.status = 400;
        throw error;
      }

      const updatedUser = await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          points: {
            decrement: reward.pointsCost,
          },
        },
        select: {
          points: true,
        },
      });

      const redemption = await tx.rewardRedemption.create({
        data: {
          userId: user.id,
          rewardId: reward.id,
          pointsCost: reward.pointsCost,
          status: "pending",
          notes: notes || null,
        },
        include: {
          reward: true,
        },
      });

      await tx.pointLedger.create({
        data: {
          userId: user.id,
          redemptionId: redemption.id,
          type: "REDEEM",
          points: -reward.pointsCost,
          description: `Redeem reward ${reward.name}`,
          balanceAfter: updatedUser.points,
        },
      });

      if (reward.stock !== null) {
        await tx.reward.update({
          where: {
            id: reward.id,
          },
          data: {
            stock: {
              decrement: 1,
            },
          },
        });
      }

      return {
        redemption,
        remainingPoints: updatedUser.points,
      };
    });

    return res.status(201).json({
      message: "Redeem reward berhasil. Menunggu diproses admin.",
      data: result,
    });
  } catch (err) {
    console.error(err);

    return res.status(err.status || 500).json({
      error: err.message || "Gagal redeem reward",
    });
  }
};