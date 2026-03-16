const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");

const { saveRedirectUrl, isLoggedIn } = require("../middleware.js");

const User = require("../models/user.js");
const Listing = require("../models/listing.js");
const Booking = require("../models/booking.js");

const userController = require("../controllers/users.js");

// Signup
router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(wrapAsync(userController.signup));

// Login
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

// Logout
router.get("/logout", userController.logout);

// Profile
router.get(
  "/profile",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate("wishlist");

    const totalWishlist = user.wishlist ? user.wishlist.length : 0;
    const totalBookings = await Booking.countDocuments({ user: req.user._id });
    const totalListings = await Listing.countDocuments({ owner: req.user._id });

    res.render("users/profile.ejs", {
      user,
      totalWishlist,
      totalBookings,
      totalListings,
    });
  })
);

module.exports = router;