# Backend README

Express backend for SE104 PC Store.

## Install

```bash
npm install
```

## Environment

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

Important variables:

- `PORT`: local API/server port, default `5000`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL connection
- `JWT_SECRET`: required for login tokens
- `JWT_EXPIRES_IN`: token lifetime
- `CORS_ORIGIN`: local frontend origin, usually `http://localhost:5000`

## Commands

```bash
npm run dev
npm start
```

## API Base URL

```text
http://localhost:5000/api
```

The same Express app also serves `frontend/` for local testing.

## Important Folders

- `src/routes`: route definitions and role protection
- `src/controllers`: request/response handlers
- `src/services`: business logic and SQL queries
- `src/middlewares`: auth, roles, not found, error handling
- `src/config/database.js`: MySQL pool

## Common Errors

- `JWT_SECRET is required`: create `backend/.env`.
- `ECONNREFUSED` or DB test fails: start MySQL and check DB credentials.
- `Unknown database`: import `database/schema.sql`.
- Login fails after reset: import `database/seed.sql`.

## Role Summary

- `customer`: storefront account, cart checkout, own orders, wishlist, reviews
- `sales`: order status workflow and reports
- `technician`: Serial inventory, Serial assignment, warranty tickets
- `admin`: all admin features
