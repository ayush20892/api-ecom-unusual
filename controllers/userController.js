const User = require("../models/userModel");
const Product = require("../models/productModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const BigPromise = require("../middlewares/bigPromise");
const cookieToken = require("../utils/cookieToken");
const customError = require("../utils/customError");
const mailHelper = require("../utils/mailHelper");
const crypto = require("crypto");
const { extend } = require("lodash");
const validator = require("validator");

exports.signup = BigPromise(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({
      success: false,
      message: "All fields are required !!",
    });
  }

  if (!validator.isEmail(email))
    return res.json({
      success: false,
      message: "Enter correct email format.",
    });

  const userAlreadyExist = await User.findOne({ email });

  if (userAlreadyExist)
    return res.json({
      success: false,
      message: "Email Already Registered.",
    });

  if (password.length < 6)
    return res.json({
      success: false,
      message: "Password should be of atleast of 6 chars.",
    });

  const user = await User.create(req.body);

  cookieToken(user, res);
});

exports.login = BigPromise(async (req, res) => {
  const { email, password } = req.body;

  // If field not recived from body.
  if (!email || !password)
    return res.json({
      success: false,
      message: "Email and Password both required",
    });

  const user = await User.findOne({ email })
    .select("+password")
    .populate("wishlist.product")
    .populate("cart.product")
    .populate("addresses")
    .populate("orders");

  // If user not present in database.
  if (!user)
    return res.json({
      success: false,
      message: "User Doesn't exists in the database.",
    });

  // If password doesn't match.
  if (!(await user.isPasswordValidated(password)))
    return res.json({
      success: false,
      message: "Incorrect Password !!",
    });

  const userId = user._id;

  const orders = await Order.find({ userId })
    .populate("products.product")
    .populate("address");

  user.orders = orders;

  cookieToken(user, res);
});

exports.logout = BigPromise(async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logout Success",
  });
});

exports.forgotPassword = BigPromise(async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.json({
      success: false,
      message: "Email field is required",
    });

  const user = await User.findOne({ email });

  if (!user)
    return res.json({
      success: false,
      message: "Invalid Email, not registered",
    });

  const forgotCode = user.getForgotPasswordCode();

  await user.save({ validateBeforeSave: false });

  const message = `<div>Copy and paste this Code ||<b> ${forgotCode} </b>|| to verify.</div>`;

  try {
    await mailHelper({
      to: email,
      subject: "LCO Tshirt - Password Reset Mail",
      text: message,
      html: message,
    });

    res.status(200).json({
      success: true,
      message: "Mail sent succefully.",
    });
  } catch (error) {
    user.forgotPasswordCode = undefined;
    user.forgotPasswordExpiry = undefined;

    await user.save({ validateBeforeSave: false });

    return res.json({
      success: false,
      message: "This Email doesn't Exists in gmail.",
      error: error.message,
    });
  }
});

exports.verifyForgotCode = BigPromise(async (req, res) => {
  const { forgotCode } = req.body;

  const encrypToken = crypto
    .createHash("sha256")
    .update(forgotCode)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordCode: encrypToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user)
    res.json({
      success: false,
      message: "Invalid Code or Code Expired.",
    });

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRY * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "none",
    secure: true,
  };

  res.status(200).cookie("userVerify", encrypToken, cookieOptions).json({
    success: true,
    message: "User Verifed",
  });
});

exports.passwordReset = BigPromise(async (req, res) => {
  const user = req.user;

  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword)
    return res.json({
      success: false,
      message: "Both fields are required",
    });

  if (password !== confirmPassword)
    res.json({
      success: false,
      message: "Password and Confirm Password didn't match",
    });

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  res.cookie("userVerify", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  cookieToken(user, res);
});

//User loggedIn Controllers
exports.userDashboard = BigPromise(async (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    user,
  });
});

exports.updatePassword = BigPromise(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select("+password")
    .populate("wishlist.product")
    .populate("cart.product");

  const isPasswordValidated = await user.isPasswordValidated(
    req.body.oldPassword
  );

  if (!isPasswordValidated)
    res.json({
      success: false,
      message: "Enter correct old password.",
    });

  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword)
    return res.json({
      success: false,
      message: "Password and ConfirmPassword both fields are required",
    });

  if (password !== confirmPassword)
    res.json({
      success: false,
      message: "Password and Confirm Password didn't match",
    });

  const userId = user._id;

  const orders = await Order.find({ userId })
    .populate("products.product")
    .populate("address");

  user.orders = orders;

  user.password = password;

  await user.save();

  cookieToken(user, res);
});

exports.updateUser = BigPromise(async (req, res) => {
  const user = req.user;

  if (req.body.email) {
    if (!validator.isEmail(req.body.email))
      return res.json({
        success: false,
        message: "Enter correct email format.",
      });
  }

  const updatedUser = extend(user, req.body);

  await user.save();

  res.status(200).json({
    success: true,
    updatedUser,
  });
});

//Wishlist Controllers
exports.getAllWishlistItems = BigPromise(async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist.product");

  res.status(200).json({
    success: true,
    wishlist: user.wishlist,
  });
});

exports.addToWishlist = BigPromise(async (req, res) => {
  const user = req.user;

  if (
    user.wishlist.find(
      (item) => item.product._id.toString() === req.body.productId
    )
  )
    return res.json({
      success: false,
    });

  user.wishlist.push({ product: req.body.productId });

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

exports.deleteFromWishlist = BigPromise(async (req, res) => {
  const user = req.user;

  const newWishlist = user.wishlist.filter(
    (prod) => prod.product._id.toString() !== req.body.productId
  );

  await user.updateOne({ wishlist: newWishlist });

  res.status(200).json({
    success: true,
    user,
  });
});

//Cart Controllers
exports.getAllCartItems = BigPromise(async (req, res) => {
  const user = await User.findById(req.user._id).populate("cart.product");

  res.status(200).json({
    success: true,
    cart: user.cart,
  });
});

exports.addToCart = BigPromise(async (req, res) => {
  const user = req.user;

  if (
    user.cart.find((item) => item.product._id.toString() === req.body.productId)
  )
    return res.json({
      success: false,
    });

  user.cart.push({ product: req.body.productId, quantity: req.body.quantity });

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

exports.deleteFromCart = BigPromise(async (req, res) => {
  const user = req.user;

  const newCart = user.cart.filter(
    (prod) => prod.product._id.toString() !== req.body.productId
  );

  await user.updateOne({ cart: newCart });

  res.status(200).json({
    success: true,
    user,
  });
});

exports.emptyCart = BigPromise(async (req, res) => {
  const user = req.user;

  user.cart = [];

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

exports.updateCartQuantity = BigPromise(async (req, res) => {
  const user = req.user;
  const newCart = user.cart.map((prod) => {
    if (prod.product._id.toString() === req.body.productId) {
      prod.quantity = req.body.quantity;
    }
    return prod;
  });

  extend(user, { cart: newCart });

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

// Address Controllers
exports.addAddress = BigPromise(async (req, res) => {
  const user = req.user;
  const { name, addressLine, city, state, country, pinCode, mobileNo } =
    req.body;

  if (!name | !addressLine | !city | !state | !country | !pinCode | !mobileNo) {
    return res.json({
      success: false,
      message: "All fields are required !!",
    });
  }

  const addressObject = {
    name,
    addressLine,
    city,
    state,
    country,
    pinCode,
    mobileNo,
    user: user._id,
  };
  const address = await Address.create(addressObject);

  user.addresses.push(address);

  await user.save();

  res.status(200).json({
    success: true,
    address,
  });
});

exports.editAddress = BigPromise(async (req, res) => {
  const address = await Address.findById(req.params.addressId);

  const updatedAddress = extend(address, req.body);

  await address.save();

  res.status(200).json({
    success: true,
    updatedAddress,
  });
});

exports.deleteAddress = BigPromise(async (req, res) => {
  const user = req.user;
  const address = await Address.findById(req.params.addressId);

  await address.delete();

  const updatedAddress = user.addresses.filter(
    (addr) => addr._id.toString() !== req.params.addressId
  );

  await user.updateOne({ addresses: updatedAddress });

  res.status(200).json({
    success: true,
    updatedAddress,
  });
});

// Orders
exports.createOrder = BigPromise(async (req, res) => {
  const user = req.user;
  const {
    addressId,
    products,
    paymentInfoId,
    totalAmount,
    discountAmount,
    orderAmount,
  } = req.body;

  const orderObject = {
    address: addressId,
    products,
    paymentInfoId,
    totalAmount,
    discountAmount,
    orderAmount,
    user: user._id,
  };

  if (!addressId) {
    return res.json({
      success: false,
      message: "Select a address",
    });
  }

  const order = await Order.create(orderObject);

  order.populate("products.product");
  order.populate("address");

  user.orders.push(order);

  await user.save();

  res.status(200).json({
    success: true,
    order,
  });
});

exports.cancelOrder = BigPromise(async (req, res) => {
  const user = req.user;
  const order = await Order.findById(req.body.orderId);

  await order.delete();

  const updatedOrders = user.orders.filter(
    (order) => order._id.toString() !== req.body.orderId
  );

  await user.updateOne({ orders: updatedOrders });

  res.status(200).json({
    success: true,
    updatedOrders,
  });
});

// Admin Controllers
exports.adminUsers = BigPromise(async (req, res) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users,
  });
});

exports.adminGetUser = BigPromise(async (req, res) => {
  const user = await User.findById(req.params.id);

  res.status(200).json({
    success: true,
    user,
  });
});

exports.adminUpdateUser = BigPromise(async (req, res) => {
  const user = await User.findById(req.params.id);

  const updatedUser = extend(user, req.body);

  await user.save();

  res.status(200).json({
    success: true,
    updatedUser,
  });
});

exports.adminDeleteUser = BigPromise(async (req, res) => {
  const user = await User.findById(req.params.id);

  await user.delete();

  res.status(200).json({
    success: true,
    user,
  });
});
