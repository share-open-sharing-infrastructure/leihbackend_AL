/// <reference path="../pb_data/types.d.ts" />

/*
 Booking hooks for protected items.
 Bookings are date-range-based and have strict overlap prevention.
 Unlike reservations, bookings are managed exclusively by staff (superuser).
*/

// Request hooks
// ----- //

onRecordCreateRequest((e) => {
    const { validate } = require(`${__hooks}/services/booking.js`)

    validate(e.record, e.app)

    e.next()

    e.app.logger().info(`Created booking ${e.record.id} for item ${e.record.getString('item')}`)
}, 'booking')

onRecordUpdateRequest((e) => {
    const { validate, validateStatusTransition } = require(`${__hooks}/services/booking.js`)

    const status = e.record.getString('status')
    const oldRecord = e.app.findRecordById('booking', e.record.id)
    const oldStatus = oldRecord.getString('status')

    // only validate dates/overlap if dates or item changed, or if status is being set to reserved/active
    if (status === 'reserved' || status === 'active') {
        validate(e.record, e.app)
    }

    // prevent invalid status transitions
    validateStatusTransition(oldStatus, status)

    e.next()

    e.app.logger().info(`Updated booking ${e.record.id} (${oldStatus} -> ${status})`)
}, 'booking')

// Scheduled jobs
// ----- //

// note: cron dates are UTC
cronAdd('mark_overdue_bookings', "0 22 * * *", () => {
    const { markOverdueBookings } = require(`${__hooks}/jobs/booking.js`)
    markOverdueBookings()
})
