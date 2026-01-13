import { Router } from "express";
import asyncHandler from "express-async-handler";
import { Product } from "../models/Product.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      q,
      categoryId,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 20,
      origin,
    } = req.query;

    const filters = {};
    if (categoryId) {
      if (Array.isArray(categoryId)) {
        filters.categoryId = { $in: categoryId };
      } else {
        filters.categoryId = categoryId;
      }
    }
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }
    if (origin) {
      if (Array.isArray(origin)) {
        filters.country = { $in: origin };
      } else {
        filters.country = origin;
      }
    }

    const query = Product.find(filters);

    if (q) {
      query.find({ $text: { $search: q } });
    }

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const sortOptions = {
      newest: { createdAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      discount: { discount: -1 },
      popular: { sold: -1 },
    };
    const sortKey = sortOptions[sort] ? sort : "newest";
    query.sort(sortOptions[sortKey]);

    const totalPromise = Product.countDocuments(query.getFilter());
    const docsPromise = query
      .skip((numericPage - 1) * numericLimit)
      .limit(numericLimit)
      .lean();

    const [total, products] = await Promise.all([totalPromise, docsPromise]);

    res.json({
      data: products,
      pagination: {
        total,
        page: numericPage,
        pages: Math.ceil(total / numericLimit) || 1,
        limit: numericLimit,
      },
    });
  })
);

router.get(
  "/featured",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20);
    const products = await Product.find({ discount: { $gte: 10 } })
      .sort({ discount: -1 })
      .limit(limit)
      .lean();
    res.json({ data: products });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id).lean();
    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }
    res.json({ data: product });
  })
);

router.get(
  "/:id/related",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const source = await Product.findById(id).lean();
    if (!source) {
      res.status(404);
      throw new Error("Product not found");
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 12);
    const related = await Product.find({
      categoryId: source.categoryId,
      _id: { $ne: source._id },
    })
      .sort({ discount: -1, price: 1 })
      .limit(limit)
      .lean();
    res.json({ data: related });
  })
);

export default router;
