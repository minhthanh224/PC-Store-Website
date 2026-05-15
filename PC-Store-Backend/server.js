const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to AeroTech PC Store Backend API' });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
