const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require("path");
const sqlite3 = require('sqlite3').verbose();
const serveStatic = require("serve-static");
const { readFileSync } = require('fs');
const { setupFdk } = require("@gofynd/fdk-extension-javascript/express");
const { SQLiteStorage } = require("@gofynd/fdk-extension-javascript/express/storage");
const sqliteInstance = new sqlite3.Database('session_storage.db');
const productRouter = express.Router();


const fdkExtension = setupFdk({
    api_key: process.env.EXTENSION_API_KEY,
    api_secret: process.env.EXTENSION_API_SECRET,
    base_url: process.env.EXTENSION_BASE_URL,
    cluster: process.env.FP_API_DOMAIN,
    callbacks: {
        auth: async (req) => {
            // Write you code here to return initial launch url after auth process complete
            if (req.query.application_id)
                return `${req.extension.base_url}/company/${req.query['company_id']}/application/${req.query.application_id}`;
            else
                return `${req.extension.base_url}/company/${req.query['company_id']}`;
        },
        
        uninstall: async (req) => {
            // Write your code here to cleanup data related to extension
            // If task is time taking then process it async on other process.
        }
    },
    storage: new SQLiteStorage(sqliteInstance,"exapmple-fynd-platform-extension"), // add your prefix
    access_mode: "online",
    webhook_config: {
        api_path: "/api/webhook-events",
        notification_email: "useremail@example.com",
        event_map: {
            "company/product/delete": {
                "handler": (eventName) => {  console.log(eventName)},
                "version": '1'
            }
        }
    },
});

const STATIC_PATH = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'frontend', 'public' , 'dist')
    : path.join(process.cwd(), 'frontend');
    
const app = express();
const platformApiRoutes = fdkExtension.platformApiRoutes;

// Middleware to parse cookies with a secret key
app.use(cookieParser("ext.session"));

// Middleware to parse JSON bodies with a size limit of 2mb
app.use(bodyParser.json({
    limit: '2mb'
}));

// Serve static files from the React dist directory
app.use(serveStatic(STATIC_PATH, { index: false }));

// FDK extension handler and API routes (extension launch routes)
app.use("/", fdkExtension.fdkHandler);

// Route to handle webhook events and process it.
app.post('/api/webhook-events', async function(req, res) {
    try {
      console.log(`Webhook Event: ${req.body.event} received`)
      await fdkExtension.webhookRegistry.processWebhook(req);
      return res.status(200).json({"success": true});
    } catch(err) {
      console.log(`Error Processing ${req.body.event} Webhook`);
      return res.status(500).json({"success": false});
    }
})

// Get all applications in company
productRouter.get('/applications', async function(req, res) {
    try {
        const { platformClient } = req;

        const data = await platformClient.configuration.getApplications();

        return res.json(data);
    } catch(err) {
        return res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
});

// Health check
productRouter.get('/ping', async function(req, res) {
    return res.json({
        success: true
    });
});

// Get company products
productRouter.get('/', async function(req, res, next) {
    try {
        const { platformClient } = req;

        const data = await platformClient.catalog.getProducts();

        return res.json(data);
    } catch(err) {
        next(err);
    }
});

// Get products for a specific application
productRouter.get('/application/:application_id', async function(req, res, next) {
    try {
        const { platformClient } = req;
        const { application_id } = req.params;

        const data = await platformClient
            .application(application_id)
            .catalog
            .getApplicationProducts();

        return res.json(data);
    } catch(err) {
        return res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
});

productRouter.get('/catalog-debug', async function(req, res) {
    try {
        const methods = Object.getOwnPropertyNames(
            Object.getPrototypeOf(req.platformClient.catalog)
        );

        return res.json(methods);
    } catch(err) {
        return res.json(err);
    }
});

// Test product creation via browser
productRouter.get('/test-create', async function(req, res) {
    try {
        const { platformClient } = req;

        console.log("Attempting product creation...");

        const response = await platformClient.catalog.createProduct({
            body: {
                name: "Northwind Test Book",
                slug: `northwind-test-${Date.now()}`,
                brand_uid: 5989,
                category_uid: 2371,
                departments: [22],
                item_type: "standard",
                template_tag: "books",
                country_of_origin: "India",
                item_code: `TEST-${Date.now()}`,
                hs_code: "00000001",
                short_description: "Created via SDK",
                description: "<p>Created via SDK</p>",
                media: [],
                net_quantity: {
                    value: 1,
                    unit: "g"
                }
            }
        });

        console.log("SUCCESS:", response);

        return res.json(response);

    } catch(err) {
        console.error("CREATE PRODUCT ERROR:");
        console.error(err);

        return res.status(500).json({
            message: err.message,
            error: err
        });
    }
});

// Optional POST version
productRouter.post('/test-create', async function(req, res) {
    try {
        const { platformClient } = req;

        const response = await platformClient.catalog.createProduct({
            body: {
                name: "Northwind Test Book",
                slug: `northwind-test-${Date.now()}`,
                brand_uid: 5989,
                category_uid: 2371,
                departments: [22],
                item_type: "standard",
                template_tag: "books",
                country_of_origin: "India",
                item_code: `TEST-${Date.now()}`,
                hs_code: "00000001",
                short_description: "Created via SDK",
                description: "<p>Created via SDK</p>",
                media: [],
                net_quantity: {
                    value: 1,
                    unit: "g"
                }
            }
        });

        return res.json(response);

    } catch(err) {
        console.error(err);

        return res.status(500).json({
            message: err.message,
            error: err
        });
    }
});

// FDK extension api route which has auth middleware and FDK client instance attached to it.
platformApiRoutes.use('/products', productRouter);

// remember to also add a proxy rule for them in /frontend/vite.config.js
app.use('/api', platformApiRoutes);

// Serve the React app for all other routes
app.get('*', (req, res) => {
    return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(path.join(STATIC_PATH, "index.html")));
});

module.exports = app;
