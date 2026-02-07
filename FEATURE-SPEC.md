# Booking Collection - PocketBase Implementation Spec

## Context

The LeihLokal system has "protected items" — large, bulky items that cannot be reserved through the normal reservation flow. These items are currently managed via an Excel spreadsheet calendar. This spec defines a new `booking` collection to replace that spreadsheet.

**Key difference from `reservation`:** Reservations are single-day, queue-based, and auto-cleaned by cron. Bookings are date-range-based, calendar-style, and have strict return dates because the next person's booking depends on timely return.

## Collection: `booking`

### Fields

| Field            | Type      | Required | Default    | Notes                                                        |
| ---------------- | --------- | -------- | ---------- | ------------------------------------------------------------ |
| `item`           | relation  | yes      |            | Single relation to `item` collection. Only one item per booking (not an array). |
| `customer`       | relation  | no       |            | Relation to `customer` collection. Optional because bookings may come from unregistered callers. |
| `customer_name`  | text      | yes      |            | Always required — filled from customer record or manually for walk-ins. |
| `customer_phone` | text      | no       |            |                                                              |
| `customer_email` | email     | no       |            |                                                              |
| `start_date`     | date      | yes      |            | First day the item is with the customer (pickup day).        |
| `end_date`       | date      | yes      |            | Day the item must be returned. Strict — the next booking may start the following day. |
| `status`         | select    | yes      | `reserved` | Values: `reserved`, `active`, `returned`, `overdue`          |
| `notes`          | text      | no       |            | Free-form notes (e.g. "called on Mon, confirmed pickup Thu") |

### Status Lifecycle

```
reserved  →  active  →  returned
                    →  overdue  →  returned
```

- **reserved**: Booking created (phone/email came in, staff entered it).
- **active**: Customer picked up the item.
- **returned**: Item returned.
- **overdue**: Past `end_date` and not yet returned. This is critical — unlike regular rentals, overdue protected items block the next booking.

### Validation Rules

**Overlap prevention** is the most important constraint. Before creating or updating a booking, the system must verify:

> For the given `item`, the number of bookings overlapping the requested `[start_date, end_date]` range (where status is `reserved` or `active`) must not exceed `item.copies`.

Two bookings overlap when: `existing.start_date <= new.end_date AND existing.end_date >= new.start_date`

PocketBase filter equivalent for finding conflicting bookings:

```
item = "ITEM_ID" &&
(status = "reserved" || status = "active") &&
start_date <= "NEW_END_DATE" &&
end_date >= "NEW_START_DATE"
```

If the count of results from this query is `>= item.copies`, the booking must be rejected.

**Additional validations:**
- `end_date` must be >= `start_date`
- `item` must have `is_protected = true` (only protected items use this system)
- `start_date` should not be in the past (for new bookings; existing ones naturally age)

### API Rules

Use the same auth pattern as the existing `reservation` collection. Authenticated users (staff) have full CRUD access. No public access.

### Indexes

Create indexes to support the overlap query, which will be the most frequent read operation:

1. **Composite index** on `(item, status, start_date, end_date)` — covers the overlap detection query.
2. **Index** on `(status)` — for finding all overdue bookings (cron/dashboard).
3. **Index** on `(end_date, status)` — for finding bookings ending today or overdue.

### Cron / Scheduled Task

Add a daily check (similar to the existing reservation cleanup cron) that:

1. Finds all bookings where `status = "active" AND end_date < TODAY`.
2. Sets their status to `overdue`.

**Do NOT auto-delete overdue bookings.** Unlike regular reservations, overdue protected items need staff attention because they block subsequent bookings.

## Migration Checklist

1. Create the `booking` collection with the schema above.
2. Add the indexes.
3. Set API rules (match `reservation` collection rules).
4. Add the overdue-detection cron job.
5. Test overlap detection: create two bookings for the same single-copy item with overlapping dates — the second should be rejected.
