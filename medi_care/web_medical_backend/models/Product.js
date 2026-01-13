import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
    brand: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    gallery: {
      type: [String],
      default: [],
    },
    usage: {
      type: String,
      default: "",
    },
    ingredients: {
      type: String,
      default: "",
    },
    warnings: {
      type: String,
      default: "",
    },
    prescriptionRequired: {
      type: String,
      default: "",
    },
    createDate: {
      type: Date,
    },
    expiredDate: {
      type: Date,
    },
    categoryId: {
      type: String,
      required: true,
      index: true,
    },
    activeIngredientIds: {
      type: [String],
      default: [],
    },
    herbIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index({ name: "text", brand: "text", ingredients: "text", description: "text" });
productSchema.index({ categoryId: 1, price: 1 });
productSchema.index({ country: 1 });

export const Product = mongoose.model("Product", productSchema);
