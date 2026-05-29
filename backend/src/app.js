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
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();
const frontendPath = path.join(__dirname, "../../frontend");
const isProduction = process.env.NODE_ENV === "production";

function parseAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map(function (origin) {
      return origin.trim();
    })
    .filter(Boolean);
}

const allowedCorsOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);
const corsOptions = allowedCorsOrigins.length
  ? {
      origin: function (origin, callback) {
        if (!origin || allowedCorsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        const error = new Error("Nguồn truy cập không được CORS cho phép.");
        error.statusCode = 403;
        callback(error);
      }
    }
  : isProduction
    ? {
        origin: false
      }
    : undefined;

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

app.use(express.static(frontendPath));
app.get("/", function (req, res) {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
