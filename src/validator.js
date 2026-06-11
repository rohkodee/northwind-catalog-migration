const fs = require("fs");
const csv = require("csv-parser");

const rows = [];
const errors = [];
const seenSkus = new Set();

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function cleanPrice(price) {
  if (!price) return null;

  const cleaned = price.replace(/[^0-9.]/g, "");

  return cleaned ? Number(cleaned) : null;
}

fs.createReadStream("data/legacy_catalog.csv")
  .pipe(csv())
  .on("data", (row) => {

    const sku = row.sku?.trim();
    const productName = row["Product Name"]?.trim();
    const price = cleanPrice(row.price);

    let rowErrors = [];

    // SKU validation
    if (!sku) {
      rowErrors.push("Missing SKU");
    }

    // Product name validation
    if (!productName) {
      rowErrors.push("Missing Product Name");
    }

    // Duplicate SKU
    if (sku && seenSkus.has(sku)) {
      rowErrors.push("Duplicate SKU");
    }

    if (sku) {
      seenSkus.add(sku);
    }

    // Price validation
    if (!price) {
      rowErrors.push("Invalid Price");
    }

    // URL validation
    if (!isValidUrl(row.image_url)) {
      rowErrors.push("Invalid Image URL");
    }

    if (rowErrors.length > 0) {
      errors.push({
        sku,
        errors: rowErrors
      });
    } else {
      rows.push(row);
    }

  })
  .on("end", () => {

    const report = {
      success: rows.length,
      failed: errors.length,
      errors
    };

    fs.writeFileSync(
      "reports/validation_report.json",
      JSON.stringify(report, null, 2)
    );

    console.log("Validation complete");
    console.log(report);
  });