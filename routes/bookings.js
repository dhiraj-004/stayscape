const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware");
const bookingController = require("../controllers/bookings");

const Booking = require("../models/booking");
const Listing = require("../models/listing");
const User = require("../models/user");

// Create booking
router.post("/:id/book", isLoggedIn, wrapAsync(async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut, guests } = req.body;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (end <= start) {
    req.flash("error", "Check-out must be after check-in");
    return res.redirect(`/listings/${id}`);
  }

  const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const totalPrice = nights * listing.price;

  const booking = new Booking({
    listing: listing._id,
    user: req.user._id,
    checkIn: start,
    checkOut: end,
    guests,
    totalPrice,
  });

  await booking.save();

  listing.bookings.push(booking._id);
  await listing.save();

  const user = await User.findById(req.user._id);
  user.bookings.push(booking._id);
  await user.save();

  req.flash("success", "Booking confirmed!");
  res.redirect("/bookings/my");
}));

// My bookings page
router.get("/my", isLoggedIn, wrapAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });

  res.render("bookings/my.ejs", { bookings });
}));

// Cancel booking
router.post("/:bookingId/cancel", isLoggedIn, wrapAsync(async (req, res) => {
  const { bookingId } = req.params;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    req.flash("error", "Booking not found");
    return res.redirect("/bookings/my");
  }

  if (booking.user.toString() !== req.user._id.toString()) {
    req.flash("error", "Not authorized");
    return res.redirect("/bookings/my");
  }

  booking.status = "Cancelled";
  await booking.save();

  req.flash("success", "Booking cancelled");
  res.redirect("/bookings/my");
}));
router.get("/report/monthly", isLoggedIn, bookingController.monthlyReport);

module.exports = router;