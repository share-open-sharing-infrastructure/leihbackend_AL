function prepareEmergencyClosing(app = $app) {
    const { getDueTodayRentals } = require(`${__hooks}/services/rental.js`)
    const { getTodaysReservations } = require(`${__hooks}/services/reservation.js`)
    const { sendEmergencyClosingMail } = require(`${__hooks}/services/customer.js`)
    const { uniqueBy } = require(`${__hooks}/utils/common.js`)

    app.logger().info(`Preparing emergency closing.`)

    const reservations = getTodaysReservations(app)
    const rentals = getDueTodayRentals(app)
    app.expandRecords(rentals, ['customer'])

    const customerEmails = uniqueBy([
        ...(rentals.map(r => r.expandedOne('customer')).map(c => c.getString('email')).filter(e => e)),
        ...(reservations.map(c => c.getString('customer_email')).filter(e => e)),
    ], c => c)

    app.logger().info(`Got ${customerEmails.length} customers with rentals that would have been due today.`)

    let countSuccess = 0
    customerEmails.forEach(customerEmail => {
        const customer = app.findFirstRecordByData('customer', 'email', customerEmail)  // retrieve batch-wise outside the loop instead

        try {
            app.logger().info(`Sending emergency closing notification mail to ${customerEmail}.`)
            sendEmergencyClosingMail(customer)
            countSuccess++
            sleep(1000)
        } catch (e) {
            app.logger().error(`Failed to send emergency closing notification to ${customerEmail} - ${e}.`)
        }
    })

    // TODO (minor): update return date to next opening day

    return { successful: countSuccess, failed: customerEmails.length - countSuccess }
}

module.exports = {
    prepareEmergencyClosing,
}
