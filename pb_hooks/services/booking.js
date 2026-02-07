// Important: every write operation run as part of a transactional event hook must use the event's txApp instead of global $app. See reservation.pb.js for details.

function validate(record, app = $app) {
    validateDates(record)
    validateProtectedItem(record, app)
    validateOverlap(record, app)
}

function validateDates(record) {
    const startDate = record.getDateTime('start_date')
    const endDate = record.getDateTime('end_date')

    if (endDate.before(startDate)) {
        throw new BadRequestError('end_date must be >= start_date')
    }

    // only check for new records (no id saved yet)
    if (!record.original) {
        const today = new DateTime()
        // compare date portions only
        const todayStr = today.string().substring(0, 10)
        const startStr = startDate.string().substring(0, 10)
        if (startStr < todayStr) {
            throw new BadRequestError('start_date must not be in the past')
        }
    }
}

function validateProtectedItem(record, app = $app) {
    const itemId = record.getString('item')
    const item = app.findRecordById('item', itemId)
    if (!item.getBool('is_protected')) {
        throw new BadRequestError('Only protected items can be booked')
    }
}

function validateOverlap(record, app = $app) {
    const itemId = record.getString('item')
    const startDate = record.getDateTime('start_date').string()
    const endDate = record.getDateTime('end_date').string()

    const item = app.findRecordById('item', itemId)
    const copies = item.getInt('copies') || 1

    // find conflicting bookings: overlapping date range with active status
    let filter = `item = '${itemId}' && (status = 'reserved' || status = 'active') && start_date <= '${endDate}' && end_date >= '${startDate}'`

    // exclude current record on update
    if (record.id) {
        filter += ` && id != '${record.id}'`
    }

    let conflicts = []
    try {
        conflicts = app.findRecordsByFilter('booking', filter)
    } catch (e) {
        // no results found — no conflicts
    }

    if (conflicts.length >= copies) {
        throw new BadRequestError(`Booking conflicts with ${conflicts.length} existing booking(s) for this item (${copies} copy/copies available)`)
    }
}

function validateStatusTransition(from, to) {
    if (from === to) return

    const allowed = {
        'reserved': ['active', 'returned'],
        'active': ['returned', 'overdue'],
        'overdue': ['returned'],
        'returned': [],
    }

    if (!allowed[from]?.includes(to)) {
        throw new BadRequestError(`Invalid status transition from '${from}' to '${to}'`)
    }
}

function markAsOverdue(record, app = $app) {
    record.set('status', 'overdue')
    app.save(record)
    app.logger().info(`Marked booking ${record.id} as overdue.`)
}

module.exports = {
    validate,
    validateStatusTransition,
    markAsOverdue,
}
