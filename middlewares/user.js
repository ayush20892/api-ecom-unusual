const BigPromise = require("./bigPromise");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const customError = require("../utils/customError");
const jwt = require("jsonwebtoken");

exports.isLoggedIn = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token)
    return res.json({ success: false, message: "Please Login First" });

  const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const user = await User.findById(decode.id)
    .populate("wishlist.product")
    .populate("cart.product")
    .populate("addresses")
    .populate("orders");

  const userId = user._id;

  const orders = await Order.find({ userId })
    .populate("products.product")
    .populate("address");

  user.orders = orders;

  req.user = user;

  next();
};

exports.isUserVerified = async (req, res, next) => {
  const code = req.cookies.userVerify;

  if (!code) return res.json({ success: false, message: "Invalid Code !" });

  const user = await User.findOne({
    code,
    forgotPasswordExpiry: { $gt: Date.now() },
  })
    .populate("wishlist.product")
    .populate("cart.product")
    .populate("addresses")
    .populate("orders");

  const userId = user._id;

  const orders = await Order.find({ userId })
    .populate("products.product")
    .populate("address");

  user.orders = orders;

  req.user = user;

  next();
};

exports.isRoleAdmissible = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(400).send("User not admissible for this information.");

    next();
  };
};
