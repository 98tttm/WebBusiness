import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { User } from "../models/User.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token) {
    res.status(401);
    throw new Error("Not authorised, token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-otpCodeHash -otpExpires");
    if (!req.user) {
      res.status(401);
      throw new Error("User associated with token no longer exists");
    }
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorised, token invalid");
  }
});
