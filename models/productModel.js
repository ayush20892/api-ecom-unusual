const mongoose = require("mongoose");

const productSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name of the Product Required."],
    trim: true,
    maxLength: [50, "Product name should not be more than 50 character,"],
  },
  price: {
    type: Number,
    required: [true, "Price of the Product Required."],
    maxLength: [6, "Product price should be less than 6 digits."],
  },
  priceBeforeDiscount: {
    type: String,
    required: [true, "Price before discount of the Product Required."],
  },
  image: {
    type: String,
    required: true,
  },
  inStock: {
    type: Boolean,
    require: true,
  },
  fastDelivery: {
    type: Boolean,
    require: true,
  },
  trending: {
    type: Boolean,
    require: true,
  },
  category: {
    type: String,
    required: [true, "Category of the Product Required."],
    enum: {
      values: ["men", "women", "gadgets"],
      message: "Please select the category",
    },
  },
  productType: {
    type: String,
    required: [true, "Type of the Product Required."],
  },
  // stock: {
  //   type: Number,
  // },
  // ratings: {
  //   type: Number,
  //   default: 0,
  // },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
