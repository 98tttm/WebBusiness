import { Router } from "express";
import asyncHandler from "express-async-handler";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { parentId } = req.query;
    const filter = {};
    if (parentId === "null") {
      filter.parentId = null;
    } else if (parentId) {
      filter.parentId = parentId;
    }
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json({ data: categories });
  })
);

router.get(
  "/tree",
  asyncHandler(async (req, res) => {
    const categories = await Category.find().lean();
    const map = new Map();
    categories.forEach((cat) => map.set(cat._id, { ...cat, children: [] }));
    const roots = [];
    map.forEach((cat) => {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId).children.push(cat);
      } else {
        roots.push(cat);
      }
    });
    roots.forEach((node) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name));
    });
    res.json({ data: roots.sort((a, b) => a.name.localeCompare(b.name)) });
  })
);

router.get(
  "/:id/products",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = 12 } = req.query;
    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
    const categoryIds = await collectDescendantCategoryIds(id);
    const products = await Product.find({ categoryId: { $in: categoryIds } })
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .lean();
    res.json({ data: products });
  })
);

async function collectDescendantCategoryIds(categoryId) {
  const categories = await Category.find().lean();
  const children = [];
  const queue = [categoryId];
  const set = new Set(queue);

  const grouped = categories.reduce((acc, cat) => {
    const parent = cat.parentId || null;
    acc[parent] = acc[parent] || [];
    acc[parent].push(cat);
    return acc;
  }, {});

  while (queue.length) {
    const current = queue.shift();
    children.push(current);
    const nextNodes = grouped[current] || [];
    for (const child of nextNodes) {
      if (!set.has(child._id)) {
        set.add(child._id);
        queue.push(child._id);
      }
    }
  }
  return children;
}

export default router;
