const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const User = require("../models/user");

// Index + Create
router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// New route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Wishlist page route
router.get("/wishlist", isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id).populate("wishlist");
  res.render("listings/wishlist.ejs", { listings: user.wishlist });
});
router.get("/host/dashboard", isLoggedIn, async (req, res) => {
  const myListings = await User.findById(req.user._id)
    .populate({
      path: "wishlist"
    });

  const listings = await require("../models/listing")
    .find({ owner: req.user._id })
    .populate("bookings");

  const totalListings = listings.length;
  const totalBookings = listings.reduce((sum, listing) => sum + listing.bookings.length, 0);
  const totalRevenue = listings.reduce((sum, listing) => {
    let listingRevenue = 0;
    for (let booking of listing.bookings) {
      if (booking.totalPrice) listingRevenue += booking.totalPrice;
    }
    return sum + listingRevenue;
  }, 0);

  res.render("listings/host-dashboard.ejs", {
    listings,
    totalListings,
    totalBookings,
    totalRevenue
  });
});

const Listing = require("../models/listing");
const Booking = require("../models/booking");

router.get("/host/dashboard", isLoggedIn, async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id }).populate("bookings");

  const totalListings = listings.length;
  const totalBookings = listings.reduce((sum, listing) => sum + listing.bookings.length, 0);

  const totalRevenue = listings.reduce((sum, listing) => {
    let revenue = 0;
    for (let booking of listing.bookings) {
      if (booking.status === "Confirmed" && booking.totalPrice) {
        revenue += booking.totalPrice;
      }
    }
    return sum + revenue;
  }, 0);

  res.render("listings/host-dashboard.ejs", {
    listings,
    totalListings,
    totalBookings,
    totalRevenue
  });
});
// Add / Remove wishlist route
router.post("/:id/wishlist", isLoggedIn, async (req, res) => {
  let { id } = req.params;

  const user = await User.findById(req.user._id);

  const alreadySaved = user.wishlist.some(
    (item) => item.toString() === id.toString()
  );

  if (alreadySaved) {
    user.wishlist.pull(id);
    req.flash("success", "Removed from wishlist!");
  } else {
    user.wishlist.push(id);
    req.flash("success", "Added to wishlist!");
  }

  await user.save();

  const redirectUrl = req.body.redirectUrl || `/listings/${id}`;
  res.redirect(redirectUrl);
});

// Edit route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

// Show + Update + Delete
router
  .route("/:id")
  .get(wrapAsync(listingController.showListing))
  .put(
    isLoggedIn,
    isOwner,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing)
  )
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

module.exports = router;