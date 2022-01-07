const BigPromise = require("../middlewares/bigPromise");
const Product = require("../models/productModel");
const WhereClause = require("../utils/whereClause");
const { extend } = require("lodash");

exports.getAllProducts = BigPromise(async (req, res) => {
  const products = new WhereClause(Product.find(), req.query)
    .search()
    .filter()
    .pager();

  const productResult = await products.base;

  res.status(200).json({
    success: true,
    productResult,
  });
});

exports.getOneProduct = BigPromise(async (req, res) => {
  const product = await Product.findById(req.params.id);

  res.status(200).json({
    success: true,
    product,
  });
});

// Admin Controllers
exports.adminAddProduct = BigPromise(async (req, res, next) => {
  req.body.user = req.user;

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    product,
  });
});

exports.updateProduct = BigPromise(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  let imageArray = [];

  if (req.files) {
    for (let index = 0; index < product.photos.length; index++) {
      await cloudinary.uploader.destroy(product.photos[index].id);
    }

    for (let index = 0; index < req.files.photos.length; index++) {
      const result = await cloudinary.uploader.upload(
        req.files.photos[index].tempFilePath,
        {
          folder: "products",
        }
      );

      imageArray.push({
        id: result.public_id,
        secure_url: result.secure_url,
      });
    }
    req.body.photos = imageArray;
  }

  const updatedProduct = extend(product, req.body);

  await product.save();

  res.status(200).json({
    success: true,
    updatedProduct,
  });
});

exports.deleteProduct = BigPromise(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  for (let index = 0; index < product.photos.length; index++) {
    await cloudinary.uploader.destroy(product.photos[index].id);
  }

  await product.remove();

  res.status(200).json({
    success: true,
    product,
    message: "Product Deleted succesfully",
  });
});
