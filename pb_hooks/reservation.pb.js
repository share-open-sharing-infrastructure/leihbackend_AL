/// <reference path="../pb_data/types.d.ts" />

/*
 Developer Notes:
 Most hooks are manually wrapped inside a transaction so that everything will be rolled back if one part fails.
 For example, if a new reservation can't be inserted, the according item statuses must not be updated either.
 Vice versa, if updating the item status fails for whatever reason, there shouldn't be a valid reservation present.
 To ensure valid transaction and prevent deadlocks, all write operations within the call MUST use the transaction all (txApp aka. e.app) provided by wrapTransactional.
 Hopefully, there will be a more convenient way to accomplish this in future releases of Pocketbase.
*/

const { handleGetCancel, handleGetReservationsCsv } = require(`${__hooks}/routes/reservation`)

// Request hooks
// ----- //

onRecordCreateRequest((e) => {
    const { validate, autofillCustomer, sendConfirmationMail } = require(`${__hooks}/services/reservation.js`)
    const { notifyNewReservation } = require(`${__hooks}/services/notification.js`)

    // hide record information for non-authenticated users
    // especially hide customer data to prevent leaking personal information by enumerating customer ids
    if (!e.requestEvent.auth) {
        e.record.hide(
            'customer_iid',
            'customer_name',
            'customer_email',
            'customer_phone',
            'comments',
            'done',
            'is_new_customer',
            'pickup',
            'items',
            'collectionId',
            'collectionName',
            'updated',
            'on_premises',
            'expand',
        )
    }

    autofillCustomer(e.record)
    validate(e.record, !!e.requestEvent.auth)  // ignore invalid pickup dates for superuser requests

    e.next()

    const recordId = e.record.get('id')
    try {
        sendConfirmationMail(e.record)
    } catch(e) {
        $app.logger().error(`Failed to send confirmation for reservation ${recordId} – ${e}.`)
    }

    try {
        notifyNewReservation(e.record)
    } catch(e) {
        $app.logger().error(`Failed to send admin notification for reservation ${recordId} – ${e}.`)
    }
}, 'reservation')

onRecordUpdateRequest((e) => {
    if (!e.record.getBool('done')) {
        const oldRecord = $app.findRecordById('reservation', e.record.id)
        if (oldRecord.getBool('done') && !e.requestEvent.request.url.rawQuery.includes('force=true')) throw new BadRequestError('Can\'t undo a closed reservation')

        const itemsChanged = e.record.getRaw('items') !== oldRecord.getRaw('items')
        const copiesChanged = e.record.getRaw('requested_copies') !== oldRecord.getRaw('requested_copies')
        if (itemsChanged || copiesChanged) {
            const { validateStatus } = require(`${__hooks}/services/reservation.js`)
            validateStatus(e.record, e.record.id)
        }
    }
    e.next()
}, 'reservation')


// Record hooks
// ----- //

onRecordCreateExecute((e) => {
    const { wrapTransactional } = require(`${__hooks}/utils/db.js`)
    const { updateItems } = require(`${__hooks}/services/reservation.js`)

    wrapTransactional(e, (e) => {
        e.next()
        e.app.logger().info(`Created new reservation ${e.record.id} for ${e.record.getString('customer_email')}`)
        updateItems(e.record, null, false, e.app)
    })
}, 'reservation')

onRecordUpdateExecute((e) => {
    const { wrapTransactional } = require(`${__hooks}/utils/db.js`)
    const { updateItems } = require(`${__hooks}/services/reservation.js`)

    wrapTransactional(e, (e) => {
        const oldRecord = $app.findRecordById('reservation', e.record.id)

        e.next()

        e.app.logger().info(`Updated reservation ${e.record.id} of ${e.record.getString('customer_email')}`)

        // Note: "undoing" a closed transaction will not update item statuses accordingly.
        // Instead, undoing should be prevented beforehand on a request level
        updateItems(e.record, oldRecord, false, e.app)
    })

}, 'reservation')

onRecordDeleteExecute((e) => {
    const { wrapTransactional } = require(`${__hooks}/utils/db.js`)
    const { updateItems } = require(`${__hooks}/services/reservation.js`)

    wrapTransactional(e, (e) => {
        const customerEmail = e.record.getString('customer_email')
        e.next()
        e.app.logger().info(`Deleted reservation ${e.record.id} of ${customerEmail}`)
        updateItems(e.record, null, true, e.app)
    })
}, 'reservation')


// Routes
// ----- //
routerAdd('get', '/reservation/cancel', handleGetCancel)
routerAdd('get', '/api/reservation/csv', handleGetReservationsCsv, $apis.requireSuperuserAuth())

// Scheduled jobs
// ----- //

// note: cron dates are UTC
cronAdd('clear_reservations', "0 22 * * *", () => {
    const { clearReservations } = require(`${__hooks}/jobs/reservation.js`)
    clearReservations()
})

// note: cron dates are UTC
cronAdd('send_pickup_reminders', "0 9 * * *", () => {
    const { sendPickupReminders } = require(`${__hooks}/jobs/reservation.js`)
    sendPickupReminders()
})
