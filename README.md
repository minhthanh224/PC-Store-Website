# AeroTech PC Store

AeroTech PC Store is a fullstack PC Store / Computer Store website for selling PC builds, laptops, components, monitors, peripherals, accessories, and technical services.

The project is built with plain HTML/CSS/JavaScript, Node.js + Express, and MySQL. It intentionally does not use React, PHP, Prisma, Sequelize, TypeScript, or a frontend framework.

## Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MySQL
- Auth: bcryptjs password hashing, JWT bearer tokens
- Runtime packages: express, mysql2, cors, dotenv, morgan, bcryptjs, jsonwebtoken
- Dev package: nodemon

## Folder Structure

```text
se104-pc-store/
|-- frontend/          Plain HTML/CSS/JS storefront and admin pages
|-- backend/           Express API and static frontend server
|-- database/          MySQL schema and seed scripts
|-- docs/              Project documentation and test plans
|-- .gitignore
|-- package.json       Local root start scripts
`-- README.md
```

## Prerequisites

- Node.js 18 or newer
- MySQL 8 or compatible MariaDB/MySQL server
- phpMyAdmin or MySQL CLI

## Setup

1. Install dependencies from the project root:

   ```bash
   npm install
   ```

2. Create `backend/.env` from `backend/.env.example` and update local database credentials if needed.

3. Import database scripts in this order:

   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

   In phpMyAdmin, run `schema.sql` first, then `seed.sql`.

4. Start the backend:

   ```bash
   npm start
   ```

   For backend-only development:

   ```bash
   cd backend
   npm run dev
   ```

## Local URLs

- Storefront: `http://localhost:5000`
- Admin dashboard: `http://localhost:5000/admin/dashboard.html`
- API health: `http://localhost:5000/api/health`
- DB test: `http://localhost:5000/api/db-test`
- DB summary: `http://localhost:5000/api/dev/db-summary`

## Demo Accounts

All demo accounts use password `123456`.

- Customer: `customer@example.com`
- Sales: `sales@example.com`
- Technician: `technician@example.com`
- Admin: `admin@example.com`

Demo passwords are for local development only and must not be used in production.

## Main Features

- Public storefront catalog with search, filters, product detail, and featured products
- Customer register/login/profile/address basics
- LocalStorage cart and checkout
- Customer order history and order detail with assigned Serial
- Admin product, brand, category, inventory, Serial management
- Admin order approval, status workflow, and Serial assignment
- Public warranty lookup by Serial
- Admin/technician warranty ticket workflow
- Admin/sales dashboard and reports
- Customer wishlist and pending product reviews
- Static policy/contact/store pages

## Test Workflow

1. Customer logs in, browses products, adds to cart, and checks out.
2. Sales logs in and approves the pending order.
3. Technician assigns Serial to serialized order items.
4. Sales ships and completes the order.
5. Customer opens order detail and uses the Serial warranty lookup link.
6. Technician creates a warranty ticket for the sold Serial.
7. Technician updates warranty status through `received -> repairing -> done -> returned`.
8. Admin views dashboard and reports.

## Deployment Notes

This repository is currently configured for local development only. The Express backend serves the plain frontend from `frontend/`, so the local app runs at `http://localhost:5000`.

For temporary sharing later, the local app can be exposed with Cloudflare Tunnel. No tunnel, hosting, or cloud deployment config files are included in this repository.

For any real production deployment later, use HTTPS, a strong `JWT_SECRET`, restricted CORS, secure backups, proper database users, real domain configuration, and non-demo passwords.
