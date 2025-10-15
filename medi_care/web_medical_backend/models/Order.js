import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      ref: "Product",
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    image: String,
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      default: "cod",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: String,
    paidAt: Date,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (value) => value.length > 0,
    },
    shippingAddress: {
      fullName: String,
      phone: String,
      street: String,
      ward: String,
      district: String,
      city: String,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "shipping", "completed", "cancelled"],
      default: "pending",
    },
    payment: {
      type: paymentSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export const Order = mongoose.model("Order", orderSchema);
