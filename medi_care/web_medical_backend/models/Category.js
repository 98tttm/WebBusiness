import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
      alias: "id",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    parentId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

categorySchema.index({ slug: 1 });
categorySchema.index({ parentId: 1, slug: 1 });

export const Category = mongoose.model("Category", categorySchema);
