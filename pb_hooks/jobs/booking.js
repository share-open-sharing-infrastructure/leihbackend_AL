function markOverdueBookings() {
    const bookingService = require(`${__hooks}/services/booking.js`)

    const today = new DateTime().string().substring(0, 10)

    let overdueBookings = []
    try {
        overdueBookings = $app.findRecordsByFilter('booking', `status = 'active' && end_date < '${today}'`)
    } catch (e) {
        // no results found
    }

    $app.logger().info(`Found ${overdueBookings.length} overdue booking(s).`)

    overdueBookings.forEach((r) => bookingService.markAsOverdue(r))
}

module.exports = {
    markOverdueBookings,
}
