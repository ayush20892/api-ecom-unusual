const express = require("express");
require("dotenv").config();
var cors = require("cors");

const app = express();

const cookieParser = require("cookie-parser");

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
const homeRoute = require("./routes/homeRoute");
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");

app.use("/api/v1", homeRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", productRoute);

module.exports = app;
