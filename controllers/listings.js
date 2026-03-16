const Listing = require("../models/listing");

// ✅ Mapbox Geocoding
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAPBOX_TOKEN; 
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  const { search } = req.query;
  let filter = {};
  let searchQuery = "";

  if (search) {
    searchQuery = search.trim();
    filter = {
      $or: [
        { title: new RegExp(searchQuery, "i") },
        { location: new RegExp(searchQuery, "i") },
      ],
    };
  }

  const allListings = await Listing.find(filter);
  res.render("listings/index.ejs", { allListings, searchQuery });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;

  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested for does not exists!!");
    return res.redirect("/listings");
  }

  // ✅ mapToken frontend ko pass
  res.render("listings/show.ejs", { listing, mapToken: process.env.MAPBOX_TOKEN });
};

module.exports.createListing = async (req, res) => {
  // ✅ location -> coordinates
  const geoResponse = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  let url = req.file.path;
  let filename = req.file.filename;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  // ✅ geometry save
  newListing.geometry = geoResponse.body.features[0]?.geometry;

  await newListing.save();
  req.flash("success", "New Listing Created!!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested for does not exists!!");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  // ✅ Update basic fields
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

  // ✅ If location changed, update geometry also
  if (req.body.listing.location) {
    const geoResponse = await geocodingClient
      .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
      })
      .send();

    listing.geometry = geoResponse.body.features[0]?.geometry;
  }

  // ✅ If image updated
  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
  }

  await listing.save();
  req.flash("success", "Listing Updated!!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing Deleted!!");
  res.redirect("/listings");
};