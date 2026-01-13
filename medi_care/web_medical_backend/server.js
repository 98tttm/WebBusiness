import cors from "cors";
import express from "express";
import asyncHandler from "express-async-handler";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { protect } from "./middleware/authMiddleware.js";
import { User } from "./models/User.js";

dotenv.config();

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const corsOptions = allowedOrigins.length
  ? { origin: allowedOrigins, credentials: true }
  : { origin: true };

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

app.get(
  "/api/account",
  protect,
  (req, res) => {
    res.json({ data: req.user });
  }
);

app.put(
  "/api/account",
  protect,
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const updates = {};
    if (typeof name === "string") {
      updates.name = name.trim();
    }
    if (typeof email === "string") {
      updates.email = email.trim();
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-otpCodeHash -otpExpires");
    res.json({ data: user });
  })
);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

connectDB(uri)
  .then(() => {
    app.listen(port, () => {
      console.log(`MediCare backend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

export default app;
