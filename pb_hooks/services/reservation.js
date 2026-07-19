// Important: every write operation run as part of a transactional event hook must use the event's txApp instead of global $app. See reservation.pb.js for details.

function countActiveByItem(itemId, app = $app) {
    const result = new DynamicModel({ cnt: 0 })
    app.db()
        .select('count(*) as cnt')
        .from('reservation')
        .where($dbx.exists($dbx.exp('select 1 from json_each(items) where json_each.value = {:itemId}', { itemId })))
        .andWhere($dbx.exp('done = false'))
        .one(result)
    return result.cnt
}

function countReservedCopies(itemId, excludeReservationId = null, app = $app) {
    const reservations = app.findAllRecords('reservation',
        $dbx.exists($dbx.exp('select 1 from json_each(items) where json_each.value = {:itemId}', { itemId })),
        $dbx.hashExp({ done: false })
    )
    return reservations
        .filter(r => r.id !== excludeReservationId)
        .reduce((sum, r) => {
            const rc = JSON.parse(r.getRaw('requested_copies') || '{}') || {}
            return sum + (rc[itemId] ?? 1)
        }, 0)
}

function getTodaysReservations(app = $app) {
    const records = app.findAllRecords('reservation',
        $dbx.exp('substr(pickup, 0, 11) = current_date'),
        $dbx.hashExp({ done: false })
    )
    return records
}

function getPickupTomorrowReservations(app = $app) {
    const records = app.findAllRecords('reservation',
        $dbx.exp("substr(pickup, 0, 11) = date(current_date, '+1 day')"),
        $dbx.hashExp({ done: false })
    )
    return records
}

function remove(r, app = $app) {
    app.delete(r)
    app.logger().info(`Deleted reservation ${r.id} (${r.getString('iid')}).`)
}

function markAsDone(r, app = $app) {
    r.set('done', true)
    app.save(r)
    app.logger().info(`Marked reservation ${r.id} as done.`)
}

function exportCsv(app = $app) {
    // exports active reservations only
    const CSV = require(`${__hooks}/utils/csv.js`)

    const fields = [
        { id: 'id', label: '_id', empty: '' },
        { id: 'customer_iid', label: 'Nutzer ID', empty: '' },
        { id: 'customer_name', label: 'Nutzer Name', empty: '' },
        { id: 'customer_phone', label: 'Nutzer Telefon', empty: '' },
        { id: 'customer_email', label: 'Nutzer E-Mail', empty: '' },
        { id: 'is_new_customer', label: 'Neuer Nutzer?', empty: false },
        { id: 'pickup', label: 'Abholdatum', empty: '' },
        { id: 'items', label: 'Gegenstände', empty: [] },
        { id: 'comments', label: 'Kommentare', empty: '' },
        { id: 'created', label: 'Erstellt am', empty: '' },
    ]

    const result = arrayOf(new Record())
    app.recordQuery('reservation')
        .andWhere($dbx.hashExp({ done: false }))
        .andWhere($dbx.exp('pickup >= DATE("now", "localtime", "start of day", "-1 day")'))
        .orderBy('pickup desc')
        .all(result)
    app.expandRecords(result, ['items'])

    const records = result
        .map((r) => r.publicExport())
        .map((r) => {
            const items = r.expand.items.map((e) => e.publicExport())
            return {
                id: r.id,
                customer_iid: r.customer_iid,
                customer_name: r.customer_name,
                customer_phone: r.customer_phone,
                customer_email: r.customer_email,
                is_new_customer: r.is_new_customer,
                pickup: r.pickup,
                comments: r.comments,
                created: r.created,
                items: items.map((i) => `${i.iid} (${i.name})`).join(', '),
            }
        })

    return CSV.serialize({ fields, records })
}

// Validation

function validate(r, force = false) {
    validateFields(r)
    validateStatus(r)
    if (!force) validateProtected(r)
    if (!force) validatePickup(r)
}

function validateFields(r) {
    // actual validation will be done during record creation, this is only to raise a specific error in case customer data couldn't be filled from iid
    const customerIid = r.getInt('customer_iid')
    if (customerIid) {
        if (!r.getString('customer_name') || !r.getString('customer_phone') || !r.getString('customer_email')) {
            throw new BadRequestError(`Invalid ID ${customerIid}, no corresponding customer found`)
        }
    }
}

function validateStatus(r, excludeId = null) {
    $app.expandRecord(r, ['items'], null)
    const requestedCopies = JSON.parse(r.getRaw('requested_copies') || '{}') || {}
    const rentalService = require(`${__hooks}/services/rental.js`)
    const errors = []
    for (const item of r.expandedAll('items')) {
        if (!['instock', 'reserved'].includes(item.getString('status'))) {
            errors.push(item.getInt('iid'))
            continue
        }
        const copies = item.getInt('copies') || 1
        const alreadyReserved = countReservedCopies(item.id, excludeId, $app)
        const alreadyRented = rentalService.countCopiesActiveByItem(item.id, $app)
        const remaining = copies - alreadyReserved - alreadyRented
        const requested = requestedCopies[item.id] ?? 1
        if (requested > remaining) errors.push(item.getInt('iid'))
    }
    if (errors.length) throw new BadRequestError(`Items ${errors} not available.`)
}

function validateProtected(r) {
    $app.expandRecord(r, ['items'], null)

    const protectedItems = r
        .expandedAll('items')
        .filter(i => i.getBool('is_protected'))
        .map(i => i.getInt('iid'))

    if (protectedItems.length) {
        throw new BadRequestError(`Items ${protectedItems} cannot be reserved.`)
    }
}

function validatePickup(r) {
    const { WEEKDAYS } = require(`${__hooks}/constants.js`)
    const { getOpeningHours } = require(`${__hooks}/services/settings.js`)

    const OPENING_HOURS = getOpeningHours()

    const pickupRaw = r.getDateTime('pickup')
    const pickup = new Date(pickupRaw.unix() * 1000)
    if (pickupRaw.before(new DateTime())) {
        throw new BadRequestError('Das Abholdatum muss in der Zukunft liegen.')
    }

    if (
        !OPENING_HOURS.filter((d) => WEEKDAYS[d[0]] === pickup.getUTCDay())
            .map((d) => [new Date(1970, 0, 1, d[1].split(':')[0], d[1].split(':')[1]), new Date(1970, 0, 1, d[2].split(':')[0], d[2].split(':')[1])])
            .filter((d) => {
                const d1 = new Date(1970, 0, 1, pickup.getUTCHours(), pickup.getUTCMinutes())
                return d1 >= d[0] && d1 < d[1]
            }).length
    ) {
        throw new BadRequestError('Das Abholdatum liegt außerhalb der Öffnungszeiten.')
    }
}

// Business logic

function autofillCustomer(record, app = $app) {
    function getByIid() {
        const customerIid = record.getInt('customer_iid')
        if (!customerIid) return null
        try {
            return app.findFirstRecordByData('customer', 'iid', customerIid)
        } catch (e) {
            return null
        }
    }

    function getByEmail() {
        const customerEmail = record.getString('customer_email')?.toLowerCase()
        if (!customerEmail) return null
        try {
            const count = app.countRecords('customer', $dbx.hashExp({ email: customerEmail }))
            if (count !== 1) return null // emails are not enforced to be unique currently
            return app.findFirstRecordByData('customer', 'email', customerEmail)
        } catch (e) {
            return null
        }
    }

    // try to get customer by given iid, otherwise by email, otherwise leave fields empty
    let customer = getByIid() || getByEmail()
    if (!customer) return record

    if (!record.getString('customer_name')) record.set('customer_name', `${customer.getString('firstname')} ${customer.getString('lastname')}`)
    if (!record.getString('customer_phone')) record.set('customer_phone', customer.getString('phone'))
    if (!record.getString('customer_email')) record.set('customer_email', customer.getString('email'))
    if (!record.getInt('customer_iid')) record.set('customer_iid', customer.getInt('iid'))
    record.set('is_new_customer', false)

    return record
}

// update item statuses based on current total reserved+rented copies
// called from execute hooks after the reservation record is already saved/deleted in DB
function updateItems(reservation, oldReservation = null, isDelete = false, app = $app) {
    const itemService = require(`${__hooks}/services/item.js`)
    const rentalService = require(`${__hooks}/services/rental.js`)

    const itemIdsNew = isDelete ? [] : reservation.getStringSlice('items')
    const itemIdsOld = oldReservation?.getStringSlice('items') || []
    const affectedIds = [...new Set([...itemIdsNew, ...itemIdsOld])]

    affectedIds.forEach((itemId) => {
        let item
        try { item = app.findRecordById('item', itemId) } catch { return }
        const copies = item.getInt('copies') || 1
        const itemStatus = item.getString('status')

        if (!['instock', 'reserved'].includes(itemStatus)) return

        const totalReserved = countReservedCopies(itemId, null, app)
        const totalRented = rentalService.countCopiesActiveByItem(itemId, app)

        if (totalReserved + totalRented >= copies) {
            if (itemStatus === 'instock') itemService.setStatus(item, 'reserved', app)
        } else {
            if (itemStatus === 'reserved') itemService.setStatus(item, 'instock', app)
        }
    })
}

// E-Mail Sending

function sendConfirmationMail(r) {
    const { fmtDate } = require(`${__hooks}/utils/common.js`)
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)

    // Skip email if on_premises is true
    if (r.getBool('on_premises')) {
        return
    }

    $app.expandRecord(r, ['items'], null)

    const customerEmail = r.getString('customer_email')
    const pickupDateStr = fmtDate(r.getDateTime('pickup'))
    const cancelLink = `${$app.settings().meta.appURL}/reservation/cancel?token=${r.getString('cancel_token')}`

    const items = r.expandedAll('items').map((i) => ({
        iid: i.getInt('iid'),
        name: i.getString('name'),
        deposit: i.getFloat('deposit'),
    }))
    const depositTotal = items.reduce((sum, i) => sum + i.deposit, 0)

    const html = $template.loadFiles(`${__hooks}/views/layout.html`, `${__hooks}/views/mail/reservation_confirmation.html`).render({
        pickup: pickupDateStr,
        customer_name: r.getString('customer_name'),
        customer_iid: r.getInt('customer_iid'),
        customer_email: customerEmail,
        customer_phone: r.getString('customer_phone'),
        comments: r.getString('comments'),
        items: items,
        deposit_total: depositTotal,
        cancel_link: cancelLink,
        otp: r.getString('otp'),
    })

    const message = new MailerMessage({
        from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
        },
        to: [{ address: customerEmail }],
        subject: `Wir haben deine Reservierung für ${pickupDateStr} erhalten`,
        html,
    })

    if (!DRY_MODE && !IMPORT_MODE) $app.newMailClient().send(message)
}

function sendPickupReminderMail(r) {
    const { fmtDate } = require(`${__hooks}/utils/common.js`)
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)

    // Skip email if on_premises is true
    if (r.getBool('on_premises')) {
        return
    }

    $app.expandRecord(r, ['items'], null)

    const customerEmail = r.getString('customer_email')
    const pickupDateStr = fmtDate(r.getDateTime('pickup'))

    const html = $template.loadFiles(`${__hooks}/views/layout.html`, `${__hooks}/views/mail/pickup_reminder.html`).render({
        items: r.expandedAll('items').map((i) => ({
            iid: i.getInt('iid'),
            name: i.getString('name'),
        })),
        otp: r.getString('otp'),
    })

    const message = new MailerMessage({
        from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
        },
        to: [{ address: customerEmail }],
        subject: `Leihladen Commonszentrum - Abholung morgen (${pickupDateStr})`,
        html,
    })

    $app.logger().info(`Sending pickup reminder mail for reservation ${r.id} to customer ${customerEmail}.`)
    if (!DRY_MODE && !IMPORT_MODE) $app.newMailClient().send(message)
}

function sendCancellationMail(r) {
    const { fmtDate } = require(`${__hooks}/utils/common.js`)
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)

    // Skip email if on_premises is true
    if (r.getBool('on_premises')) {
        return
    }

    const customerEmail = r.getString('customer_email')
    const pickupDateStr = fmtDate(r.getDateTime('pickup'))

    const html = $template.loadFiles(`${__hooks}/views/layout.html`, `${__hooks}/views/mail/reservation_cancellation.html`).render({
        pickup: pickupDateStr,
    })

    const message = new MailerMessage({
        from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
        },
        to: [{ address: customerEmail }],
        subject: `Deine Reservierung für ${pickupDateStr} wurde storniert`,
        html,
    })

    if (!DRY_MODE && !IMPORT_MODE) $app.newMailClient().send(message)
}

module.exports = {
    markAsDone,
    remove,
    exportCsv,
    sendConfirmationMail,
    sendPickupReminderMail,
    sendCancellationMail,
    validate,
    autofillCustomer,
    updateItems,
    countActiveByItem,
    countReservedCopies,
    getTodaysReservations,
    getPickupTomorrowReservations,
}
