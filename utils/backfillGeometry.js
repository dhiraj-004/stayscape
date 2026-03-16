// utils/backfillGeometry.js
require("dotenv").config();

const mongoose = require("mongoose");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");


const Listing = require("../models/listing");

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  console.error("❌ MAPBOX_TOKEN missing in .env");
  process.exit(1);
}

const geocodingClient = mbxGeocoding({ accessToken: MAPBOX_TOKEN });


const DB_URL =
  process.env.MONGO_URL ||
  process.env.ATLASDB_URL ||
  process.env.DB_URL ||
  "mongodb://127.0.0.1:27017/StayScape";

async function main() {
  await mongoose.connect(DB_URL);
  console.log("✅ Connected DB:", DB_URL);

  const listings = await Listing.find({});
  console.log(`📦 Total listings: ${listings.length}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const l of listings) {
    // Already has coords -> skip
    if (l.geometry?.coordinates?.length === 2) {
      skipped++;
      continue;
    }

    const q = (l.location || "").trim();
    if (!q) {
      console.log(`⚠️ Skip (no location): ${l._id}`);
      skipped++;
      continue;
    }

    try {
      const resp = await geocodingClient
        .forwardGeocode({ query: q, limit: 1 })
        .send();

      const geom = resp.body.features[0]?.geometry;

      if (!geom?.coordinates || geom.coordinates.length !== 2) {
        console.log(`❌ No geometry found for: ${l._id} | location="${q}"`);
        failed++;
        continue;
      }

      l.geometry = geom;
      await l.save();

      updated++;
      console.log(`✅ Updated: ${l._id} | ${q} -> ${geom.coordinates.join(", ")}`);
    } catch (e) {
      failed++;
      console.log(`❌ Failed: ${l._id} | ${q} | ${e.message}`);
    }
  }

  console.log("\nDONE ✅");
  console.log({ updated, skipped, failed });

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("❌ Script crashed:", e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});