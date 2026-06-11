const fs = require("fs");
const csv = require("csv-parser");

const transformedProducts = [];
const seenSkus = new Set();

function cleanPrice(price) {
  if (!price) return null;

  const cleaned = price.replace(/[^0-9.]/g, "");

  return cleaned ? Number(cleaned) : null;
}

function splitSizes(sizeField) {
  if (!sizeField) return [];

  return sizeField
    .split(/[\/,]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

fs.createReadStream("data/legacy_catalog.csv")
  .pipe(csv())
  .on("data", (row) => {

    const sku = row.sku?.trim();
    const productName = row["Product Name"]?.trim();
    const price = cleanPrice(row.price);

    if (!sku) return;
    if (!productName) return;
    if (!price) return;

    if (seenSkus.has(sku)) return;
    seenSkus.add(sku);

    if (!isValidUrl(row.image_url)) return;

    transformedProducts.push({
      sku,
      name: productName,
      price,
      sizes: splitSizes(row.size),
      image_url: row.image_url
    });

  })
  .on("end", () => {

    fs.writeFileSync(
      "reports/transformed_products.json",
      JSON.stringify(transformedProducts, null, 2)
    );

    console.log(
      `Transformed ${transformedProducts.length} products`
    );
  });