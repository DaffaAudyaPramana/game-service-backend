import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer.js";

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === "production";

const cookieOptionsWithoutDomain = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const baseCookieOptions = {
  ...cookieOptionsWithoutDomain,
  ...(isProduction
    ? {
        domain: process.env.COOKIE_DOMAIN || ".hypeid.store",
      }
    : {}),
};

const loginCookieOptions = {
  ...baseCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const createResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return {
    rawToken,
    hashedToken,
  };
};

const createJwtToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET belum diatur");
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  createdAt: true,
};

const sendResetPasswordEmail = async (to, resetUrl) => {
  await sendEmail({
    to,
    subject: "Reset Password HyperIndoStore",
    text: `Klik link berikut untuk reset password: ${resetUrl}`,
    html: `
      <div style="margin:0;padding:0;background:#0b0b0b;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
        <div style="max-width:560px;margin:0 auto;padding:32px 18px;">
          <div style="background:#111111;border:1px solid #262626;border-radius:20px;overflow:hidden;">
            
            <div style="background:linear-gradient(135deg,#a3e635,#65a30d);padding:26px;text-align:center;color:#000000;">
              <div style="font-size:13px;font-weight:800;letter-spacing:1px;">
                HYPERINDOSTORE
              </div>

              <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">
                Reset Password
              </h1>

              <p style="margin:8px 0 0;font-size:14px;">
                Permintaan reset password akun kamu.
              </p>
            </div>

            <div style="padding:26px;">
              <p style="margin:0 0 18px;color:#d4d4d8;font-size:15px;line-height:1.7;">
                Klik tombol di bawah ini untuk membuat password baru.
                Link ini hanya berlaku selama 15 menit.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a
                  href="${resetUrl}"
                  style="display:inline-block;background:#a3e635;color:#000000;text-decoration:none;font-weight:800;padding:14px 24px;border-radius:999px;"
                >
                  Reset Password
                </a>
              </div>

              <div style="background:#0b0b0b;border-left:4px solid #a3e635;border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.7;">
                  Jika kamu tidak meminta reset password, abaikan email ini.
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

// CEK USER LOGIN
export const me = async (req, res) => {
  return res.json({
    user: req.user,
  });
};

// REGISTER
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: "Nama, email, dan password wajib diisi",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "Email sudah terdaftar",
      });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashed,
      },
      select: safeUserSelect,
    });

    const token = createJwtToken(user);

    res.cookie("token", token, loginCookieOptions);

    return res.status(201).json({
      message: "Register sukses",
      user,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "JWT_SECRET belum diatur") {
      return res.status(500).json({
        error: "JWT_SECRET belum diatur",
      });
    }

    return res.status(500).json({
      error: "Register gagal",
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email dan password wajib diisi",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: "Email atau password salah",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: "Email atau password salah",
      });
    }

    const token = createJwtToken(user);

    res.cookie("token", token, loginCookieOptions);

    return res.json({
      message: "Login sukses",
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.message === "JWT_SECRET belum diatur") {
      return res.status(500).json({
        error: "JWT_SECRET belum diatur",
      });
    }

    return res.status(500).json({
      error: "Login gagal",
    });
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email wajib diisi",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.json({
        message: "Link reset password telah dikirim.",
      });
    }

    const { rawToken, hashedToken } = createResetToken();

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await sendResetPasswordEmail(user.email, resetUrl);

    return res.json({
      message: "Link reset password telah dikirim.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal mengirim reset password",
    });
  }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: "Token dan password wajib diisi",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password minimal 8 karakter",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        error: "Link reset password tidak valid atau sudah expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: hashedPassword,
        },
      }),

      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return res.json({
      message: "Password berhasil direset. Silakan login kembali.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Gagal reset password",
    });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  try {
    // Hapus cookie domain production: .hypeid.store
    res.clearCookie("token", baseCookieOptions);

    // Hapus juga cookie host-only lama, jika sebelumnya pernah dibuat tanpa domain.
    res.clearCookie("token", cookieOptionsWithoutDomain);

    return res.json({
      message: "Logout berhasil",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Logout gagal",
    });
  }
};
