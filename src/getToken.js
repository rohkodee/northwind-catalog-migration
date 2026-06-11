const axios = require("axios");
require("dotenv").config();

async function getToken() {
  try {
    const credentials = Buffer.from(
      `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
    ).toString("base64");

    const response = await axios.post(
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

    console.log("SUCCESS");
    console.log(response.data);
  } catch (error) {
    console.error("ERROR");
    console.error(error.response?.data || error.message);
  }
}

getToken();