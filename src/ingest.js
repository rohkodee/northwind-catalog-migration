const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

async function getToken() {
  const credentials = Buffer.from(
    `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
  ).toString("base64");

  const response = await axios.post(
    `https://api.fynd.com/service/panel/authentication/v1.0/company/${process.env.COMPANY_ID}/oauth/token`,
    { grant_type: "client_credentials" },
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.access_token;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ingest() {
  const products = JSON.parse(
    fs.readFileSync("reports/transformed_products.json", "utf8")
  );

  console.log(`\n🚀 Starting ingestion of ${products.length} products...`);

  const token = await getToken();
  console.log("✅ Access token obtained\n");

  const results = { success: [], failed: [] };
  const COMPANY_ID = process.env.COMPANY_ID;
  const DELAY_MS = 700;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];

    for (const size of product.sizes) {
      const itemCode = `${product.sku}-${size}`;
      console.log(`[${i + 1}/${products.length}] Ingesting: ${product.name} / ${size}`);

      const payload = {
        name: product.name,
        slug: `${product.sku}-${size}`.toLowerCase(),
        company_id: parseInt(COMPANY_ID),
        item_type: "standard",
        item_code: itemCode,
        country_of_origin: "India",
        currency: "INR",
        short_description: product.name,
        is_active: true,
        is_dependent: false,
        category_slug: "management",
        departments: [22],
        template_tag: "books",
        highlights: [`Size: ${size}`],
        attributes: {
        size,
        "marketer-name": "Northwind Apparel",
        "marketer-address": "Mumbai, Maharashtra, India",
        "net-quantity": "1 N",
        "essential": "Yes",
        },
        brand_uid: 5989,
        hs_code: "00000001",
        tax_identifier: {
        hsn_code_id: "000000000000000000000001",
        reporting_hsn: "00000001H1",
        hsn_code: "00000001",
        tax_rule_id: "6a290ee36bbeacd197cf8afa"
        },
        sizes: [
          {
            size,
            price: product.price,
            price_effective: product.price,
            price_transfer: 0,
            currency: "INR",
            is_set: false,
            item_weight: 500,
            item_weight_unit_of_measure: "gram",
            item_dimensions_unit_of_measure: "cm",
            item_length: 30,
            item_width: 25,
            item_height: 5,
            identifiers: [
              {
                gtin_type: "sku_code",
                gtin_value: itemCode,
                primary: true,
              },
            ],
            quantity: 10,
            seller_identifier: itemCode,
          },
        ],
        media: [{ url: "https://cdn.fynd.com/v2/falling-surf-7c8bb8/fyprod/wrkr/products/pictures/item/free/original/northwind-placeholder.jpg", type: "image" }],
        trader: [
          {
            name: "Northwind",
            type: "Manufacturer",
            address: ["India"],
          },
        ],
        no_of_boxes: 1,
        multi_size: false,
      };

      try {
        const resp = await axios.post(
          `https://api.fynd.com/service/platform/catalog/v2.0/company/${COMPANY_ID}/products/`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(`  ✅ Success`);
        results.success.push({ name: product.name, size, itemCode });
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.log(`  ❌ Failed: ${msg}`);
        console.log("  🔍 Error:", JSON.stringify(err.response?.data, null, 2));
        results.failed.push({ name: product.name, size, itemCode, error: msg });
      }

      await sleep(DELAY_MS);
    }
  }

  console.log("\n═══════════════════════════════════");
  console.log("   INGESTION SUMMARY");
  console.log("═══════════════════════════════════");
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed:  ${results.failed.length}`);

  fs.writeFileSync(
    "reports/ingestion_results.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\n📄 Results saved to reports/ingestion_results.json");
}

ingest().catch((err) => {
  console.error("💥 Fatal error:", err.message);
});