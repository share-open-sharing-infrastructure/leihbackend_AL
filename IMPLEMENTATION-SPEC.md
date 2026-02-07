# Booking API — Implementation Spec for Management App

This document describes the backend API surface for the `booking` collection. Use it to build the management UI in the frontend app.

## Authentication

All booking endpoints require **superuser auth**. No public access.

```
POST /api/collections/_superusers/auth-with-password
Content-Type: application/json

{ "identity": "<email>", "password": "<password>" }
```

Response includes a `token` field. Pass it as a header on all subsequent requests:

```
Authorization: <token>
```

Tokens expire. The PocketBase JS SDK (`pocketbase`) handles refresh automatically — use `pb.collection('_superusers').authWithPassword(email, password)` and the SDK manages the rest.

## CRUD Endpoints

Standard PocketBase record API on the `booking` collection.

| Action | Method | URL |
| ------ | ------ | --- |
| List   | GET    | `/api/collections/booking/records` |
| View   | GET    | `/api/collections/booking/records/:id` |
| Create | POST   | `/api/collections/booking/records` |
| Update | PATCH  | `/api/collections/booking/records/:id` |
| Delete | DELETE | `/api/collections/booking/records/:id` |

### Create Booking

```
POST /api/collections/booking/records
Content-Type: application/json

{
  "item": "<item_record_id>",
  "customer": "<customer_record_id>",   // optional
  "customer_name": "Max Mustermann",     // required always
  "customer_phone": "+491234567890",     // optional
  "customer_email": "max@example.com",   // optional
  "start_date": "2026-03-10 00:00:00.000Z",
  "end_date": "2026-03-14 00:00:00.000Z",
  "status": "reserved",
  "notes": "Called Monday, confirmed pickup"  // optional
}
```

**Successful response:** `200` with the created record (all fields + `id`, `created`, `updated`).

### Update Booking

Send only the fields you want to change:

```
PATCH /api/collections/booking/records/:id
Content-Type: application/json

{ "status": "active" }
```

### Expand Relations

To include the full `item` and/or `customer` records in responses, use the `expand` query param:

```
GET /api/collections/booking/records?expand=item,customer
GET /api/collections/booking/records/:id?expand=item
```

The expanded records appear in an `expand` object in the response.

## Fields Reference

| Field            | Type     | Required | Default | Notes |
| ---------------- | -------- | -------- | ------- | ----- |
| `item`           | relation | yes      |         | Single relation to `item`. Must be a protected item (`is_protected = true`). |
| `customer`       | relation | no       |         | Relation to `customer`. Optional — bookings can come from unregistered callers. |
| `customer_name`  | text     | yes      |         | Always required. Fill from customer record or enter manually for walk-ins. |
| `customer_phone` | text     | no       |         | |
| `customer_email` | email    | no       |         | |
| `start_date`     | date     | yes      |         | Pickup day. Must not be in the past (for new bookings). |
| `end_date`       | date     | yes      |         | Return day. Must be >= `start_date`. |
| `status`         | select   | yes      |         | One of: `reserved`, `active`, `returned`, `overdue`. |
| `notes`          | text     | no       |         | Free-form staff notes. |

## Validation Rules

The backend runs these checks on **create** and on **update** (when status is `reserved` or `active`). Violations return `400 Bad Request` with an error message.

### 1. Date Validation

- `end_date` must be >= `start_date`. Error: `"end_date must be >= start_date"`
- `start_date` must not be in the past for **new** bookings. Existing bookings can be updated without this check. Error: `"start_date must not be in the past"`

### 2. Protected Item Check

- The referenced `item` must have `is_protected = true`. Error: `"Only protected items can be booked"`

### 3. Overlap Prevention

This is the most important constraint. Before saving, the backend counts existing bookings for the same item where:

```
item = <same item>
AND (status = "reserved" OR status = "active")
AND start_date <= <new end_date>
AND end_date >= <new start_date>
AND id != <current record id>   (excluded on update)
```

If the count of conflicting bookings >= `item.copies`, the request is rejected.

Error: `"Booking conflicts with N existing booking(s) for this item (M copy/copies available)"`

**Implication for the UI:** To show availability on a calendar, query existing bookings for the item and check against the copy count client-side. The server is the source of truth, but client-side pre-checking avoids unnecessary round-trips.

### 4. Status Transition Validation (update only)

The backend enforces a strict status lifecycle:

```
reserved  →  active  →  returned
                     →  overdue  →  returned
reserved  →  returned   (cancelled before pickup)
```

Allowed transitions:

| From       | Allowed To              |
| ---------- | ----------------------- |
| `reserved` | `active`, `returned`    |
| `active`   | `returned`, `overdue`   |
| `overdue`  | `returned`              |
| `returned` | *(none — terminal state)* |

Any other transition returns `400`: `"Invalid status transition from '<from>' to '<to>'"`

**Note:** The `active → overdue` transition is also done automatically by a nightly cron job (see below), but staff can set it manually too.

## Filtering & Sorting

PocketBase supports filter expressions as query params. Useful queries for the management UI:

### Active bookings for a specific item (calendar view)

```
GET /api/collections/booking/records?filter=(item='<ITEM_ID>' && (status='reserved' || status='active'))&sort=start_date&expand=customer
```

### All overdue bookings (dashboard alert)

```
GET /api/collections/booking/records?filter=(status='overdue')&sort=end_date&expand=item,customer
```

### Bookings for a date range (week/month view)

```
GET /api/collections/booking/records?filter=(start_date<='2026-03-31' && end_date>='2026-03-01' && status!='returned')&sort=start_date&expand=item,customer
```

### Bookings for a specific customer

```
GET /api/collections/booking/records?filter=(customer='<CUSTOMER_ID>')&sort=-start_date
```

### All protected items (for the item picker)

```
GET /api/collections/item/records?filter=(is_protected=true && status!='deleted')&sort=name
```

## Automated Behavior

### Overdue Detection Cron

Runs daily at **22:00 UTC**. Finds all bookings where `status = "active"` and `end_date < today`, then sets their status to `overdue`.

**Overdue bookings are never auto-deleted.** They require manual staff action because they block subsequent bookings.

### What the backend does NOT do

- No auto-fill of customer data from the `customer` relation. The management app should look up the customer and populate `customer_name` / `customer_phone` / `customer_email` before sending the create request.
- No email notifications for bookings. This is a staff-only workflow managed by phone/in-person.
- No item status changes. Unlike reservations (which set items to `reserved`/`instock`), bookings don't modify the item's `status` field. Overlap prevention is handled entirely within the booking collection.

## Error Response Format

PocketBase returns errors as:

```json
{
  "code": 400,
  "message": "Failed to create record.",
  "data": {
    "customer_name": { "code": "validation_required", "message": "Missing required value." }
  }
}
```

For hook-level validation errors (overlap, status transition, etc.):

```json
{
  "code": 400,
  "message": "Booking conflicts with 1 existing booking(s) for this item (1 copy/copies available)",
  "data": {}
}
```

## Indexes

The following indexes exist to support fast queries. No special action needed from the frontend, but they explain which queries are cheap:

1. `(item, status, start_date, end_date)` — overlap detection and calendar queries
2. `(status)` — filtering by status (overdue dashboard, etc.)
3. `(end_date, status)` — cron job and "ending soon" queries

## Related Collections

The management app will likely also need to read from these:

| Collection    | Purpose | Access |
| ------------- | ------- | ------ |
| `item`        | Item catalog. Filter by `is_protected = true` to get bookable items. | Superuser: full CRUD. Public: read-only via `item_public` view. |
| `customer`    | Customer records. Look up by `iid` (member number) or search by name/email. | Superuser only. |
| `reservation` | Existing reservation system (single-day, queue-based). Not used for protected items. | Superuser: full CRUD. Public: create only. |
| `rental`      | Active loans. A booking becomes a rental when the item is physically lent out. | Superuser only. |
