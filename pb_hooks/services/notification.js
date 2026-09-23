function getAdminEmails() {
    const superusers = $app.findAllRecords('_superusers')
    return superusers.map(su => su.getString('email')).filter(e => !!e)
}

function sendToAdmins(subject, html) {
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)
    if (DRY_MODE || IMPORT_MODE) return

    const emails = getAdminEmails()
    if (!emails.length) {
        $app.logger().warn('No superuser emails found for admin notification.')
        return
    }

    for (const email of emails) {
        const message = new MailerMessage({
            from: {
                address: $app.settings().meta.senderAddress,
                name: $app.settings().meta.senderName,
            },
            to: [{ address: email }],
            subject,
            html,
        })
        $app.newMailClient().send(message)
        // A public reservation POST blocks on these sends before the response is
        // written, so keep the pacing gap short.
        sleep(200)
    }
}

function notifyNewCustomer(c) {
    const { fmtDate } = require(`${__hooks}/utils/common.js`)

    const firstname = c.getString('firstname')
    const lastname = c.getString('lastname')
    const iid = c.getInt('iid')

    const html = $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/mail/admin_new_customer.html`
    ).render({
        firstname,
        lastname,
        iid,
        email: c.getString('email'),
        registered_on: fmtDate(c.getDateTime('created')),
    })

    const prefix = c.getString('source') === 'self_service' ? 'Neue Selbstregistrierung' : 'Neue Registrierung'
    const subject = `${prefix}: ${firstname} ${lastname} (#${iid})`
    sendToAdmins(subject, html)
}

function notifyNewReservation(r, selfRegistered = false) {
    const { fmtDate } = require(`${__hooks}/utils/common.js`)

    const customerName = r.getString('customer_name')
    const customerEmail = r.getString('customer_email')
    const pickupDate = fmtDate(r.getDateTime('pickup'))

    $app.expandRecord(r, ['items'], null)

    const items = r.expandedAll('items').map((i) => ({
        iid: i.getInt('iid'),
        name: i.getString('name'),
    }))

    const html = $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/mail/admin_new_reservation.html`
    ).render({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_iid: r.getInt('customer_iid'),
        self_registered: selfRegistered,
        pickup: pickupDate,
        items,
    })

    const subject = selfRegistered
        ? `Neue Reservierung + Selbstregistrierung: ${customerName} für ${pickupDate}`
        : `Neue Reservierung: ${customerName} für ${pickupDate}`
    sendToAdmins(subject, html)
}

function notifyCancelledReservation(r) {
    const { fmtDate } = require(`${__hooks}/utils/common.js`)

    const customerName = r.getString('customer_name')
    const pickupDate = fmtDate(r.getDateTime('pickup'))

    $app.expandRecord(r, ['items'], null)

    const items = r.expandedAll('items').map((i) => ({
        iid: i.getInt('iid'),
        name: i.getString('name'),
    }))

    const html = $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/mail/admin_cancelled_reservation.html`
    ).render({
        customer_name: customerName,
        customer_email: r.getString('customer_email'),
        pickup: pickupDate,
        items,
    })

    const subject = `Stornierte Reservierung: ${customerName} für ${pickupDate}`
    sendToAdmins(subject, html)
}

module.exports = {
    notifyNewCustomer,
    notifyNewReservation,
    notifyCancelledReservation,
}
