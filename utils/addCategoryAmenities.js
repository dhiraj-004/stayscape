require("dotenv").config();
const mongoose = require("mongoose");
const Listing = require("../models/listing");

const DB_URL =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  "mongodb://127.0.0.1:27017/StayScape";

const categoryAmenitiesMap = {
  Beach: ["Wifi", "Pool", "Breakfast"],
  Mountains: ["Wifi", "Parking", "Kitchen"],
  Rooms: ["Wifi", "AC", "TV"],
  Cities: ["Wifi", "AC", "Kitchen"],
  Camping: ["Parking", "Pet Friendly", "Breakfast"],
  Farms: ["Parking", "Pet Friendly", "Breakfast"],
  Trending: ["Wifi", "AC", "Pool"],
};

async function main() {
  await mongoose.connect(DB_URL);
  console.log("DB connected");

  const listings = await Listing.find({});

  let updatedCount = 0;

  for (let listing of listings) {
    const hasAmenities = listing.amenities && listing.amenities.length > 0;

    if (!hasAmenities) {
      const category = listing.category;
      const matchedAmenities = categoryAmenitiesMap[category] || ["Wifi", "Parking"];

      listing.amenities = matchedAmenities;
      await listing.save();
      updatedCount++;

      console.log(`Updated: ${listing.title} -> ${matchedAmenities.join(", ")}`);
    }
  }

  console.log(`Done. Total updated listings: ${updatedCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  mongoose.disconnect();
});