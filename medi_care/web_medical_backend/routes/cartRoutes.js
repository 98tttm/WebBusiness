import { Router } from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";

const router = Router();

router.use(protect);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await buildCartResponse(req.user);
    res.json({ data: items });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
      res.status(400);
      throw new Error("productId is required");
    }
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    const qty = Math.max(parseInt(quantity, 10) || 1, 1);
    const user = await User.findById(req.user._id);
    const existing = user.cart.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity = existing.quantity + qty;
    } else {
      user.cart.push({ productId, quantity: qty });
    }
    await user.save();
    const items = await buildCartResponse(user);
    res.status(201).json({ data: items });
  })
);

router.patch(
  "/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    const qty = Math.max(parseInt(quantity, 10) || 0, 0);
    const user = await User.findById(req.user._id);
    const item = user.cart.find((entry) => entry.productId === productId);
    if (!item) {
      res.status(404);
      throw new Error("Item not found in cart");
    }
    if (qty === 0) {
      user.cart = user.cart.filter((entry) => entry.productId !== productId);
    } else {
      item.quantity = qty;
    }
    await user.save();
    const items = await buildCartResponse(user);
    res.json({ data: items });
  })
);

router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter((entry) => entry.productId !== productId);
    await user.save();
    const items = await buildCartResponse(user);
    res.json({ data: items });
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();
    res.status(204).end();
  })
);

async function buildCartResponse(userDoc) {
  const user = userDoc.cart ? userDoc : await User.findById(userDoc._id);
  const productIds = user.cart.map((item) => item.productId);
  const productMap = new Map();
  if (productIds.length) {
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    products.forEach((product) => productMap.set(product._id, product));
  }
  return user.cart
    .filter((item) => productMap.has(item.productId))
    .map((item) => {
      const product = productMap.get(item.productId);
      const lineTotal = product.price * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        lineTotal,
      };
    });
}

export default router;
