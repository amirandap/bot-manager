// Test script for the new sendToPhone endpoint
const http = require("http");
const FormData = require("form-data");

async function testSendToPhone() {
  const data = JSON.stringify({
    phoneNumber: "+18496665555", // Test phone number
    message: "Test message from migrated controller",
  });

  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/send-to-phone",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.log("Status Code:", res.statusCode);
        console.log("Response:", responseData);
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });

    req.on("error", (error) => {
      console.error("Request error:", error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testUnifiedAPI() {
  const data = JSON.stringify({
    phoneNumber: "+18496665555", // Test phone number
    message: "Test message from unified API",
  });

  const options = {
    hostname: "localhost",
    port: 3000,
    path: "/api/send-to-phone",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.log("\n=== UNIFIED API TEST ===");
        console.log("Status Code:", res.statusCode);
        console.log("Response:", responseData);
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });

    req.on("error", (error) => {
      console.error("Request error:", error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run tests
console.log("Testing migrated sendToPhone endpoint...");
testSendToPhone()
  .then(() => testUnifiedAPI())
  .then(() => console.log("\nAll tests completed!"))
  .catch((error) => console.error("Test failed:", error));
