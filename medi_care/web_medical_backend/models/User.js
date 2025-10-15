import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      ref: "Product",
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "default" },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    ward: { type: String, required: true },
    district: { type: String, required: true },
    city: { type: String, required: true },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    cart: {
      type: [cartItemSchema],
      default: [],
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    lastLoginAt: {
      type: Date,
    },
    otpCodeHash: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ phone: 1 });
userSchema.index({ email: 1 }, { sparse: true });

userSchema.methods.setOtpCode = async function setOtpCode(code) {
  const salt = await bcrypt.genSalt(10);
  this.otpCodeHash = await bcrypt.hash(code, salt);
  this.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
};

userSchema.methods.verifyOtpCode = async function verifyOtpCode(code) {
  if (!this.otpCodeHash) {
    return false;
  }
  return bcrypt.compare(code, this.otpCodeHash);
};

export const User = mongoose.model("User", userSchema);
