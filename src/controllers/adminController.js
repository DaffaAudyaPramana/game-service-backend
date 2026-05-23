import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getRewardRedemptions = async (req, res) => {
  try {
    const redemptions = await prisma.rewardRedemption.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            points: true,
          },
        },
        reward: true,
        pointLedger: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      message: "Berhasil ambil data redeem reward",
      data: redemptions,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil data redeem reward",
    });
  }
};

export const updateRewardRedemptionStatus = async (req, res) => {
  try {
    const redemptionId = Number(req.params.redemptionId);
    const { status } = req.body;

    const allowedStatus = ["approved", "rejected", "completed"];

    if (!redemptionId) {
      return res.status(400).json({
        error: "ID redeem tidak valid",
      });
    }

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        error: "Status tidak valid",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const redemption = await tx.rewardRedemption.findUnique({
        where: {
          id: redemptionId,
        },
        include: {
          user: true,
          reward: true,
        },
      });

      if (!redemption) {
        const error = new Error("Data redeem tidak ditemukan");
        error.status = 404;
        throw error;
      }

      if (redemption.status === "completed") {
        const error = new Error("Redeem ini sudah selesai dan tidak bisa diubah");
        error.status = 400;
        throw error;
      }

      if (redemption.status === "rejected") {
        const error = new Error("Redeem ini sudah ditolak dan poin sudah dikembalikan");
        error.status = 400;
        throw error;
      }

      if (status === "completed" && redemption.status !== "approved") {
        const error = new Error("Redeem harus diapprove dulu sebelum diselesaikan");
        error.status = 400;
        throw error;
      }

      let refundedPoints = 0;

      if (status === "rejected") {
        const updatedUser = await tx.user.update({
          where: {
            id: redemption.userId,
          },
          data: {
            points: {
              increment: redemption.pointsCost,
            },
          },
          select: {
            points: true,
          },
        });

        refundedPoints = redemption.pointsCost;

        await tx.pointLedger.create({
          data: {
            userId: redemption.userId,
            type: "ADJUST",
            points: redemption.pointsCost,
            description: `Refund poin dari redeem reward ${redemption.reward.name}`,
            balanceAfter: updatedUser.points,
          },
        });

        if (redemption.reward.stock !== null) {
          await tx.reward.update({
            where: {
              id: redemption.rewardId,
            },
            data: {
              stock: {
                increment: 1,
              },
            },
          });
        }
      }

      const updatedRedemption = await tx.rewardRedemption.update({
        where: {
          id: redemption.id,
        },
        data: {
          status,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              points: true,
            },
          },
          reward: true,
          pointLedger: true,
        },
      });

      return {
        redemption: updatedRedemption,
        refundedPoints,
      };
    });

    return res.json({
      message:
        status === "approved"
          ? "Reward berhasil diapprove"
          : status === "completed"
          ? "Reward berhasil diselesaikan"
          : `Reward berhasil ditolak. ${result.refundedPoints} poin dikembalikan ke customer.`,
      data: result,
    });
  } catch (err) {
    console.error(err);

    return res.status(err.status || 500).json({
      error: err.message || "Gagal update status redeem reward",
    });
  }
};

export const getAllUsersWithOrders = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,

        orders: {
          orderBy: {
            createdAt: "desc",
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
        },
      },
    });

    return res.json({
      message: "Berhasil ambil semua user",
      data: users,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil data user",
    });
  }
};

export const getManualRevenues = async (req, res) => {
  try {
    const data = await prisma.manualRevenue.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      message: "Berhasil ambil revenue manual",
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal ambil revenue manual",
    });
  }
};

export const createManualRevenue = async (req, res) => {
  try {
    const { amount, description } = req.body;

    const numericAmount = Number(amount);

    if (!numericAmount || Number.isNaN(numericAmount)) {
      return res.status(400).json({
        error: "Nominal revenue wajib diisi dan tidak boleh 0",
      });
    }

    const data = await prisma.manualRevenue.create({
      data: {
        amount: numericAmount,
        description: description || null,
        createdById: req.user?.id || null,
      },
    });

    return res.status(201).json({
      message: "Revenue manual berhasil ditambahkan",
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal tambah revenue manual",
    });
  }
};

export const updateManualRevenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const numericId = Number(id);
    const numericAmount = Number(amount);

    if (!numericId || Number.isNaN(numericId)) {
      return res.status(400).json({
        error: "ID revenue tidak valid",
      });
    }

    if (!numericAmount || Number.isNaN(numericAmount)) {
      return res.status(400).json({
        error: "Nominal revenue wajib diisi dan tidak boleh 0",
      });
    }

    const data = await prisma.manualRevenue.update({
      where: {
        id: numericId,
      },
      data: {
        amount: numericAmount,
        description: description || null,
      },
    });

    return res.json({
      message: "Revenue manual berhasil diupdate",
      data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal update revenue manual",
    });
  }
};

export const deleteManualRevenue = async (req, res) => {
  try {
    const { id } = req.params;

    const numericId = Number(id);

    if (!numericId || Number.isNaN(numericId)) {
      return res.status(400).json({
        error: "ID revenue tidak valid",
      });
    }

    await prisma.manualRevenue.delete({
      where: {
        id: numericId,
      },
    });

    return res.json({
      message: "Revenue manual berhasil dihapus",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal hapus revenue manual",
    });
  }
};