const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");

const healthRoutes = require("./routes/health.routes");
const devRoutes = require("./routes/dev.routes");
const categoryRoutes = require("./routes/category.routes");
const brandRoutes = require("./routes/brand.routes");
const productRoutes = require("./routes/product.routes");
const warrantyRoutes = require("./routes/warranty.routes");
const authRoutes = require("./routes/auth.routes");
const accountRoutes = require("./routes/account.routes");
const orderRoutes = require("./routes/order.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const adminProductRoutes = require("./routes/adminProduct.routes");
const adminBrandRoutes = require("./routes/adminBrand.routes");
const adminCategoryRoutes = require("./routes/adminCategory.routes");
const adminInventoryRoutes = require("./routes/adminInventory.routes");
const adminDashboardRoutes = require("./routes/adminDashboard.routes");
const adminOrderRoutes = require("./routes/adminOrder.routes");
const adminWarrantyRoutes = require("./routes/adminWarranty.routes");
const adminReportRoutes = require("./routes/adminReport.routes");
const adminImportRoutes = require("./routes/adminImport.routes");
const adminReviewRoutes = require("./routes/adminReview.routes");
const adminAuditRoutes = require("./routes/adminAudit.routes");
const adminUserRoutes = require("./routes/adminUser.routes");
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();
const frontendPath = path.join(__dirname, "../../frontend");
const isProduction = process.env.NODE_ENV === "production";
const DEFAULT_DEVELOPMENT_ORIGINS = [
  "http://localhost:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];
const TRYCLOUDFLARE_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i;

function parseAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map(function (origin) {
      return origin.trim();
    })
    .filter(Boolean);
}

function getConfiguredCorsOrigins() {
  const configuredOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

  if (isProduction) {
    return configuredOrigins;
  }

  return Array.from(new Set(configuredOrigins.concat(DEFAULT_DEVELOPMENT_ORIGINS)));
}

function shouldAllowTunnelOrigins() {
  if (isProduction) {
    return false;
  }

  return String(process.env.CORS_ALLOW_TUNNELS || "true").toLowerCase() !== "false";
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowedCorsOrigins.includes(origin)) {
    return true;
  }

  if (allowTunnelOrigins && TRYCLOUDFLARE_ORIGIN_PATTERN.test(origin)) {
    return true;
  }

  return false;
}

const allowedCorsOrigins = getConfiguredCorsOrigins();
const allowTunnelOrigins = shouldAllowTunnelOrigins();
if (allowTunnelOrigins) {
  console.info("[cors] Development/demo allows https://*.trycloudflare.com origins. Production still requires explicit CORS_ORIGIN.");
} else if (isProduction && String(process.env.CORS_ALLOW_TUNNELS || "").toLowerCase() === "true") {
  console.warn("[cors] Ignoring CORS_ALLOW_TUNNELS=true because NODE_ENV=production. Use explicit CORS_ORIGIN entries instead.");
}

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("Nguồn truy cập không được CORS cho phép.");
    error.statusCode = 403;
    callback(error);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau."
  }
});

const importRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn upload import quá nhiều lần. Vui lòng thử lại sau."
  }
});

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(morgan("dev"));

app.use("/api/health", healthRoutes);
if (process.env.NODE_ENV !== "production") {
  app.use("/api/dev", devRoutes);
}
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/warranty", warrantyRoutes);
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/register", authRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/brands", adminBrandRoutes);
app.use("/api/admin/categories", adminCategoryRoutes);
app.use("/api/admin/inventory", adminInventoryRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/warranty-tickets", adminWarrantyRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin/import", importRateLimiter, adminImportRoutes);
app.use("/api/admin/reviews", adminReviewRoutes);
app.use("/api/admin/audit-logs", adminAuditRoutes);
app.use("/api/admin/users", adminUserRoutes);

app.use(express.static(frontendPath));
app.get("/", function (req, res) {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
