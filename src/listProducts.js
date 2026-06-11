const axios = require("axios");
require("dotenv").config();

async function listProducts() {
  try {
    const credentials = Buffer.from(
      `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
    ).toString("base64");

    const tokenResponse = await axios.post(
      `https://api.fynd.com/service/panel/authentication/v1.0/company/${process.env.COMPANY_ID}/oauth/token`,
      {
        grant_type: "client_credentials"
      },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const response = await axios.get(
      `https://api.fynd.com/service/platform/catalog/v2.0/company/${process.env.COMPANY_ID}/products/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error(
      error.response?.data || error.message
    );
  }
}

listProducts();