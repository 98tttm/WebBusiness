import { Router } from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

const router = Router();

router.use(protect);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ data: orders });
  })
);

router.get(
  "/:orderId",
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id }).lean();
    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }
    res.json({ data: order });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { shippingAddress, paymentMethod = "cod", items: payloadItems } = req.body || {};
    let cartItems = payloadItems;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      const user = await User.findById(req.user._id).lean();
      cartItems = user?.cart || [];
    }
    if (!cartItems.length) {
      res.status(400);
      throw new Error("No items provided for order");
    }

    const productIds = cartItems.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((product) => [product._id, product]));

    const orderItems = [];
    let subtotal = 0;
    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const quantity = Math.max(parseInt(item.quantity, 10) || 1, 1);
      const price = product.price;
      subtotal += price * quantity;
      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity,
        image: product.image,
      });
    }

    if (!orderItems.length) {
      res.status(400);
      throw new Error("Unable to build order from provided items");
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      subtotal,
      discount: 0,
      total: subtotal,
      payment: {
        method: paymentMethod,
        status: paymentMethod === "cod" ? "pending" : "pending",
      },
    });

    await User.updateOne({ _id: req.user._id }, { $set: { cart: [] } });

    res.status(201).json({ data: order });
  })
);

export default router;
