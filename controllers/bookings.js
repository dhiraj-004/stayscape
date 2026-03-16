const Booking = require("../models/booking");
const Listing = require("../models/listing");
const PDFDocument = require("pdfkit");

module.exports.monthlyReport = async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const bookings = await Booking.find({
    createdAt: { $gte: startDate, $lt: endDate },
  }).populate("listing");

  const totalBookings = bookings.length;

  const confirmedBookings = bookings.filter(
    (b) => b.status === "Confirmed" || !b.status
  );

  const cancelledBookings = bookings.filter(
    (b) => b.status === "Cancelled"
  ).length;

  const totalRevenue = confirmedBookings.reduce(
    (sum, b) => sum + (b.totalPrice || 0),
    0
  );

  const activeListings = await Listing.countDocuments({});

  const listingMap = {};

  confirmedBookings.forEach((booking) => {
    if (booking.listing && booking.listing.title) {
      const title = booking.listing.title;
      listingMap[title] = (listingMap[title] || 0) + 1;
    }
  });

  const topListings = Object.entries(listingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const monthName = new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
  });

  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=StayScape-Report-${monthName}-${year}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  // Colors
  const primary = "#14b8a6";
  const dark = "#0f172a";
  const muted = "#64748b";
  const lightBox = "#f1f5f9";
  const border = "#dbe4ee";

  // Header
  doc
    .roundedRect(40, 35, 515, 80, 16)
    .fillAndStroke(primary, primary);

  doc
    .fillColor("white")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("StayScape Monthly Booking Report", 60, 58, {
      align: "center",
      width: 475,
    });

  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`${monthName} ${year}`, 60, 88, {
      align: "center",
      width: 475,
    });

  // Section title
  doc
    .fillColor(dark)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Monthly Summary", 50, 140);

  // Summary boxes
  const cards = [
    { label: "Total Bookings", value: totalBookings },
    { label: "Confirmed", value: confirmedBookings.length },
    { label: "Cancelled", value: cancelledBookings },
    { label: "Revenue", value: `₹ ${totalRevenue.toLocaleString("en-IN")}` },
    { label: "Active Listings", value: activeListings },
  ];

  let x = 50;
  let y = 170;
  let cardWidth = 155;
  let cardHeight = 70;
  let gap = 15;

  cards.forEach((card, index) => {
    if (index === 3) {
      x = 50;
      y = 255;
    }

    doc
      .roundedRect(x, y, cardWidth, cardHeight, 12)
      .fillAndStroke(lightBox, border);

    doc
      .fillColor(muted)
      .fontSize(10)
      .font("Helvetica")
      .text(card.label, x + 14, y + 14);

    doc
      .fillColor(dark)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(String(card.value), x + 14, y + 34);

    x += cardWidth + gap;
  });

  // Top booked listings section
  doc
    .fillColor(dark)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Top Booked Listings", 50, 355);

  doc
    .moveTo(50, 378)
    .lineTo(210, 378)
    .strokeColor(primary)
    .lineWidth(2)
    .stroke();

  let listY = 395;

  if (topListings.length > 0) {
    topListings.forEach((item, index) => {
      doc
        .roundedRect(50, listY, 495, 38, 10)
        .fillAndStroke("#ffffff", border);

      doc
        .fillColor(primary)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`${index + 1}.`, 65, listY + 12);

      doc
        .fillColor(dark)
        .fontSize(12)
        .font("Helvetica")
        .text(item[0], 90, listY + 12, { width: 320 });

      doc
        .fillColor(muted)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`${item[1]} bookings`, 430, listY + 12);

      listY += 50;
    });
  } else {
    doc
      .fillColor(muted)
      .fontSize(12)
      .font("Helvetica")
      .text("No bookings found for this month.", 50, listY);
  }

  // Footer
  doc
    .strokeColor(border)
    .moveTo(50, 730)
    .lineTo(545, 730)
    .stroke();

  doc
    .fillColor(muted)
    .fontSize(10)
    .font("Helvetica")
    .text(`Generated on: ${new Date().toLocaleString()}`, 50, 742);

  doc
    .text("StayScape Analytics Report", 380, 742, {
      width: 165,
      align: "right",
    });

  doc.end();
};