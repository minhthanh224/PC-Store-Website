const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const healthRoutes = require("./routes/health.routes");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : undefined));
app.use(morgan("dev"));

app.use("/api/health", healthRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
