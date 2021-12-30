const express = require("express");
const router = express.Router();
const {
  adminAddProduct,
  getAllProducts,
  getOneProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { isLoggedIn, isRoleAdmissible } = require("../middlewares/user");

// Any user Routes.
router.route("/getAllProducts").get(getAllProducts);
router.route("/getOneProduct/:id").get(getOneProduct);

// Admin Routes
router.route("/admin/addProduct").post(isLoggedIn, adminAddProduct);
router
  .route("/admin/product/:id")
  .post(isLoggedIn, isRoleAdmissible("admin"), updateProduct)
  .delete(isLoggedIn, isRoleAdmissible("admin"), deleteProduct);

module.exports = router;
