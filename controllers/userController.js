const User = require("../models/userModel");
const Product = require("../models/productModel");
const BigPromise = require("../middlewares/bigPromise");
const cookieToken = require("../utils/cookieToken");
const customError = require("../utils/customError");
const mailHelper = require("../utils/mailHelper");
const crypto = require("crypto");
const { extend } = require("lodash");

exports.signup = BigPromise(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).send("Name, Email and Password all fields are required.");
  }

  const user = await User.create(req.body);

  cookieToken(user, res);
});

exports.login = BigPromise(async (req, res) => {
  const { email, password } = req.body;

  // If field not recived from body.
  if (!email || !password)
    return res.status(400).send("Email and Password both required");

  const user = await User.findOne({ email }).select("+password");

  // If user not present in database.
  if (!user) return res.status(400).send("User Doesn't exists in the databse.");

  // If password doesn't match.
  if (!(await user.isPasswordValidated(password)))
    return res.status(400).send("Incorrect Password !!");

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

  if (!email) return next(new customError("Email field is required", 400));

  const user = await User.findOne({ email });

  if (!user) return res.status(400).send("Invalid Email, not registered");

  const forgotCode = user.getForgotPasswordCode();

  await user.save({ validateBeforeSave: false });

  const message = `Copy and paste this Code ${forgotCode} to verify.`;

  try {
    await mailHelper({
      to: email,
      subject: "LCO Tshirt - Password Reset Mail",
      text: message,
    });

    res.status(200).json({
      success: true,
      message: "Mail sent succefully.",
    });
  } catch (error) {
    user.forgotPasswordCode = undefined;
    user.forgotPasswordExpiry = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new customError(error.message, 500));
  }
});

exports.verifyForgotCode = BigPromise(async (req, res) => {
  const { forgotCode } = req.body;

  const encrypToken = crypto
    .createHash("sha256")
    .update(forgotCode)
    .digest("hex");

  const user = await User.findOne({
    encrypToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) res.status(400).send("Invalid Code or Code Expired.");

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRY * 60 * 60 * 1000),
    httpOnly: true,
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
    return next(
      new customError(
        "Password and ConfirmPassword both fields are required",
        400
      )
    );

  if (password !== confirmPassword)
    res.status(400).send("Password and Confirm Password didn't match");

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpiry = undefined;

  await user.save();

  res.cookie("userVerify", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
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
  const user = await User.findById(req.user.id).select("+password");

  const isPasswordValidated = await user.isPasswordValidated(
    req.body.oldPassword
  );

  if (!isPasswordValidated) res.status(400).send("Enter correct old password.");

  user.password = req.body.password;

  await user.save();

  cookieToken(user, res);
});

exports.updateUser = BigPromise(async (req, res) => {
  const user = req.user;

  const updatedUser = extend(user, req.body);

  await user.save();

  // const user = await User.findByIdAndUpdate(req.user.id, updatedObject, {
  //   new: true,
  //   runValidators: true,
  //   useFindAndModify: false,
  // });

  res.status(200).json({
    success: true,
    updatedUser,
  });
});

//Wishlist Controllers
exports.getAllWishlistItems = BigPromise(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "wishlist.product",
    "name price"
  );

  res.status(200).json({
    success: true,
    wishlist: user.wishlist,
  });
});

exports.addToWishlist = BigPromise(async (req, res) => {
  const user = req.user;

  const product = await Product.findById(req.body.productId);

  user.wishlist.push({ product: product._id });

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

exports.deleteFromWishlist = BigPromise(async (req, res) => {
  const user = req.user;

  const product = await Product.findById(req.body.productId);

  user.wishlist = user.wishlist.filter((prod) => prod.product === product._id);

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

//Cart Controllers
exports.getAllCartItems = BigPromise(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "cart.product",
    "name price"
  );

  res.status(200).json({
    success: true,
    cart: user.cart,
  });
});

exports.addToCart = BigPromise(async (req, res) => {
  const user = req.user;

  const product = await Product.findById(req.body.productId);

  user.cart.push({ product: product._id, quantity: req.body.quantity });

  await user.save();

  res.status(200).json({
    success: true,
    user,
  });
});

exports.deleteFromCart = BigPromise(async (req, res) => {
  const user = req.user;

  const product = await Product.findById(req.body.productId);

  user.cart = user.cart.filter((prod) => prod.product === product._id);

  await user.save();

  res.status(200).json({
    success: true,
    user,
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
