const express = require("express");
const cors = require("cors");
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
const notFoundMiddleware = require("./middlewares/notFound.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();
const frontendPath = path.join(__dirname, "../../frontend");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN } : undefined));
app.use(morgan("dev"));

app.use("/api/health", healthRoutes);
app.use("/api/dev", devRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/warranty", warrantyRoutes);
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

app.use(express.static(frontendPath));
app.get("/", function (req, res) {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
