require("dotenv").config({ quiet: true });

const app = require("./app");

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required. Please create backend/.env from .env.example.");
}

app.listen(PORT, function () {
  console.log(`AeroTech API is running on http://localhost:${PORT}`);
});
