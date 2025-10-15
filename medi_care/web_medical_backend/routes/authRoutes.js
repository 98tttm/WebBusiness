import { Router } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { dispatchOtp } from "../services/otpService.js";

const router = Router();

function generateToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function sanitizePhone(phone) {
  return (phone || "").replace(/\D/g, "");
}

router.post(
  "/request-otp",
  asyncHandler(async (req, res) => {
    const phone = sanitizePhone(req.body.phone);
    if (!phone || phone.length < 9) {
      res.status(400);
      throw new Error("Invalid phone number");
    }

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({ phone });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await user.setOtpCode(code);
    await user.save();

    const delivery = await dispatchOtp(phone, code);

    res.json({
      message: "OTP generated successfully",
      delivery,
      debugCode: process.env.NODE_ENV === "production" ? undefined : code,
    });
  })
);

router.post(
  "/verify-otp",
  asyncHandler(async (req, res) => {
    const phone = sanitizePhone(req.body.phone);
    const code = (req.body.code || "").trim();
    if (!phone || !code) {
      res.status(400);
      throw new Error("Missing phone or OTP code");
    }

    const user = await User.findOne({ phone });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    if (!user.otpExpires || user.otpExpires < new Date()) {
      res.status(410);
      throw new Error("OTP expired, please request a new one");
    }

    const isValid = await user.verifyOtpCode(code);
    if (!isValid) {
      res.status(401);
      throw new Error("OTP code is incorrect");
    }

    user.otpCodeHash = undefined;
    user.otpExpires = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);
    res.json({
      data: {
        token,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  })
);

router.post(
  "/otp-webhook",
  asyncHandler(async (req, res) => {
    const secret = process.env.OTP_WEBHOOK_SECRET;
    if (secret && req.headers["x-otp-secret"] !== secret) {
      res.status(401);
      throw new Error("Unauthorized webhook call");
    }
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      res.status(400);
      throw new Error("Missing phone or code");
    }
    const user = await User.findOne({ phone: sanitizePhone(phone) });
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    await user.setOtpCode(String(code));
    await user.save();
    res.json({ message: "OTP registered" });
  })
);

router.get(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    res.json({ data: req.user });
  })
);

export { generateToken };
export default router;
