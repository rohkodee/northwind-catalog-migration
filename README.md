# Northwind Catalog Importer
**Fynd Private Extension — Technical Implementation Manager Case Study**

A private Fynd extension that reads a legacy product catalog export, validates and transforms it, and ingests clean products into the Fynd Commerce Platform via the Catalog API.

---

## What This Does

1. **Reads** a messy legacy CSV (`data/legacy_catalog.csv`)
2. **Validates** every row — catches missing fields, duplicate SKUs, invalid prices, bad image URLs
3. **Transforms** data — cleans prices, splits size variants, normalizes fields
4. **Ingests** valid products into Fynd via the Platform Catalog API
5. **Reports** validation results and ingestion summary to JSON files

---

## Setup

### Prerequisites
- Node.js v18+
- Fynd Partners account
- Fynd development company
- OAuth client credentials

### Install dependencies
```bash
npm install
```

### Configure environment
Create a `.env` file:

COMPANY_ID=your_company_id
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret

---

## How to Run

### Step 1 — Validate and Transform
```bash
node src/validator.js
node src/transformer.js
```

### Step 2 — Ingest into Fynd
```bash
node src/ingest.js
```

### Step 3 — Verify on Fynd
```bash
node src/listProducts.js
```

---

## Legacy CSV — Deliberate Mess

The file `data/legacy_catalog.csv` contains real-world data quality issues:

| Row | Issue |
|-----|-------|
| Header | Two name columns: `Product Name` AND `product name` — inconsistent casing |
| SKU002 (row 3) | Duplicate SKU |
| SKU003 (row 4) | Missing product name |
| SKU005 (row 6) | Invalid price (`abc`) |
| SKU006 (row 7) | Invalid image URL (`invalid-url`) |
| Empty row | Missing SKU entirely |
| SKU008 (row 9) | Malformed row — missing price and image |
| Various | Prices with `₹`, `$`, `Rs.` currency symbols |
| Various | Sizes jammed as `S/M/L` or `32,34,36` |

---

## Validation Report

The validator produces a report at `reports/validation_report.json`:

```json
{
  "success": 3,
  "failed": 6,
  "errors": [
    { "sku": "SKU002", "errors": ["Duplicate SKU"] },
    { "sku": "SKU003", "errors": ["Missing Product Name"] },
    { "sku": "SKU005", "errors": ["Invalid Price"] },
    { "sku": "SKU006", "errors": ["Invalid Image URL"] },
    { "sku": "",       "errors": ["Missing SKU"] },
    { "sku": "SKU008", "errors": ["Invalid Price", "Invalid Image URL"] }
  ]
}
```

Invalid rows are **reported clearly, not silently dropped**.

---

## Ingestion Results

3 products × multiple size variants = **8 product variants** successfully ingested:

- Blue T Shirt — sizes S, M, L
- Red Shirt — sizes M, L
- Black Jeans — sizes 32, 34, 36

---

## Assumptions & Known Limitations

1. **Template**: The brief specifies the `Others` category with `Supplementary` template. The dev company did not have a fashion/apparel department configured, so the `books` template with `management` category was used as a functional equivalent. All API fields, validation logic, and ingestion flow remain identical — only the template/category mapping differs. In a production setup, the correct apparel template would be configured first.
2. **Brand**: Used existing `Generic` brand (uid: 5989) from the dev company. In production, a `Northwind` brand would be created first.
3. **HSN Code**: Used dummy HSN code `00000001` available on the dev company. In production, the correct apparel HSN (e.g. `62052000`) would be registered.
4. **Image URLs**: Legacy CSV image URLs were placeholder CDN URLs. Fynd's media CDN URL was used as a placeholder for ingestion.
5. **Rate limiting**: Requests spaced 700ms apart to stay safely under the 100 req/min API limit.
6. **Idempotency**: Running the script twice creates duplicate products. A production version would check for existing item codes before creating.

---

## Extension Details

- **Extension Name**: northwind-catalog-migration
- **Type**: Private (not published to marketplace)
- **Launch Type**: Company
- **Company ID**: 15671
- **Registered on**: Fynd Partners (Organization: ROHX)

---

## Evidence of Successful Ingestion

Screenshots are available in the `/screenshots` folder:

| Screenshot | Description |
|---|---|
| `01_products_list.png` | All 3 Northwind products live on Fynd Commerce Panel |
| `02_product_detail_blue_tshirt.png` | Blue T Shirt product detail — SKU001-S, category, brand |
| `03_ingestion_results.png` | Terminal showing 8 variants successfully ingested |
| `04_validation_report.png` | Validation report showing 6 invalid rows caught with reasons |
| `05_private_extension.png` | northwind-catalog-migration registered as Private extension |
