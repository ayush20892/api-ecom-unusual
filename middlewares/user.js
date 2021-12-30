const BigPromise = require("./bigPromise");
const User = require("../models/userModel");
const customError = require("../utils/customError");
const jwt = require("jsonwebtoken");

exports.isLoggedIn = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).send("Please Login First");

  const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await User.findById(decode.id);

  next();
};

exports.isUserVerified = async (req, res, next) => {
  const code = req.cookies.userVerify;

  if (!code) return res.status(401).send("Invalid Code !");

  const user = await User.findOne({
    code,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

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
