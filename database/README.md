# Database README

This folder contains MySQL scripts for SE104 PC Store.

## Files

- `init.sql`: creates the `se104_pc_store` database only.
- `schema.sql`: drops and recreates all project tables.
- `seed.sql`: resets demo data with `DELETE FROM`, resets auto increments, and inserts users, products, serials, and other seed data.

## Import With phpMyAdmin

1. Open phpMyAdmin.
2. Select the SQL tab.
3. Run `schema.sql`.
4. Run `seed.sql`.

## Import With MySQL CLI

From project root:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

## Reset Database

Run the same two files again:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

`seed.sql` is designed to be safely re-run and does not use `TRUNCATE`.

## Demo Accounts

All demo accounts use password `123456`:

- `customer@example.com`
- `sales@example.com`
- `technician@example.com`
- `admin@example.com`

Passwords are stored as bcrypt hashes. Do not use these demo passwords or seed data in production.

## Notes

- Products are not hard deleted in the application; use `status = inactive`.
- Serialized products use `serial_numbers`.
- Revenue reports count only completed orders.
- Warranty lookup is based on sold Serial Numbers linked to completed orders.
