/* Next free member number.
   MUST be called with a transactional app so that the read and the subsequent insert
   are atomic – see customer.pb.js. PocketBase runs write transactions on a single
   non-concurrent connection, so they serialize and no retry loop is needed; the
   UNIQUE index on iid remains the backstop. */
function nextIid(app = $app) {
    const row = new DynamicModel({ next: 0 })
    app.db()
        .newQuery('SELECT COALESCE(MAX(iid), 0) + 1 AS next FROM customer')
        .one(row)
    return row.next
}

/* Look up a customer by email. Returns null when there is no match.
   Emails are unique as of the idx_customer_email_unique index, so a match is
   unambiguous; the count check stays as a cheap guard for legacy data. */
function findByEmail(email, app = $app) {
    const normalized = email?.trim().toLowerCase()
    if (!normalized) return null
    try {
        const count = app.countRecords('customer', $dbx.hashExp({ email: normalized }))
        if (count !== 1) return null
        return app.findFirstRecordByData('customer', 'email', normalized)
    } catch (e) {
        return null
    }
}

function getUniqueStreets(query, app = $app) {
    const result = arrayOf(new DynamicModel({
        street: ''
    }))

    let sql = app.db()
        .select('street')
        .from('customer')
        .distinct(true)

    if (query) sql = sql.where($dbx.like('street', query))

    sql.all(result)

    const streets = result
        .map(({ street }) => street)
        .map((street) => street.replace(/[0-9]+.*$/g, '').trim())
        .filter(street => street.length > 3)
    return [...new Set(streets)]
}

function exportCsv(app = $app) {
    const CSV = require(`${__hooks}/utils/csv.js`)

    const fields = [
        { id: 'id', label: '_id', empty: '' },
        { id: 'iid', label: '#', empty: '' },
        { id: 'email', label: 'E-Mail', empty: '' },
        { id: 'phone', label: 'Telefon', empty: '' },
        { id: 'firstname', label: 'Vorname', empty: '' },
        { id: 'lastname', label: 'Nachname', empty: '' },
        { id: 'street', label: 'Strasse', empty: '' },
        { id: 'city', label: 'Stadt', empty: '' },
        { id: 'postal_code', label: 'PLZ', empty: '' },
        { id: 'heard', label: 'Aufmerksam geworden', empty: '' },
        { id: 'remark', label: 'Anmerkungen', empty: '' },
        { id: 'registered_on', label: 'Registriert am', empty: '' },
        { id: 'renewed_on', label: 'Erneuert am', empty: '' },
        { id: 'newsletter', label: 'Newsletter', empty: false },
        { id: 'num_rentals', label: 'Ausleihen', empty: 0 },
        { id: 'num_active_rentals', label: 'Aktive Ausleihen', empty: 0 },
    ]

    const result = arrayOf(new DynamicModel(fields.reduce((acc, field) => {
        acc[field.id] = field.empty
        return acc;
    }, {})))
    app.db().newQuery('select customer.*, coalesce(num_rentals, 0) as num_rentals, coalesce(num_active_rentals, 0) as num_active_rentals from customer left join customer_rentals using (id)').all(result)
    const records = JSON.parse(JSON.stringify(result))

    return CSV.serialize({ fields, records })
}

/* Get a list of customers who haven't been active for x months and whose membership wasn't reneweed in that period */
function getInactive(offsetMonths = 24, app = $app) {
    let records = arrayOf(new Record)

    const refDate = new DateTime().addDate(0, -offsetMonths, 0)

    // get customers whose latest interaction was before given reference date
    // i.e. get max of (1) registration date, (2) renewal date, (3) latest rental date, (4) latest return date
    app.recordQuery('customer')
        .leftJoin("rental", $dbx.exp("customer.id = rental.customer"))
        .groupBy("customer.id")
        .having($dbx.exp("MAX(COALESCE(MAX(rental.rented_on), ''), COALESCE(MAX(rental.returned_on), ''), COALESCE(customer.registered_on, ''), COALESCE(customer.renewed_on, '')) < {:refDate}", { refDate }))
        .distinct(true)
        .all(records)

    return records
}

// E-Mail Sending

function sendWelcomeMail(c) {
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)
    const customerEmail = c.getString('email')

    // Someone who registered themselves has not been identified by anyone yet, so
    // they get a variant that echoes their data back for correction and asks them to
    // bring ID, rather than one that presents the iid as a confirmed membership.
    const isSelfService = c.getString('source') === 'self_service'
    const template = isSelfService ? 'customer_welcome_self.html' : 'customer_welcome.html'

    const html = $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/mail/${template}`
    ).render({
        firstname: c.getString('firstname'),
        lastname: c.getString('lastname'),
        iid: c.getInt('iid'),
        email: customerEmail,
        phone: c.getString('phone'),
        street: c.getString('street'),
        house_number: c.getString('house_number'),
        postal_code: c.getString('postal_code'),
        city: c.getString('city'),
        consent_version: c.getString('consent_version'),
    })

    const message = new MailerMessage({
        from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
        },
        to: [{ address: customerEmail }],
        subject: isSelfService
            ? `Deine Registrierung im Leihladen des Commonszentrums`
            : `Herzlich Willkommen im Leihladen des Commonszentrums!`,
        html,
    })

    if (!DRY_MODE && !IMPORT_MODE) $app.newMailClient().send(message)
}

function sendEmergencyClosingMail(c) {
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)
    const customerEmail = c.getString('email')

    const html = $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/mail/emergency_closing.html`
    ).render({
        firstname: c.getString('firstname'),
        lastname: c.getString('lastname'),
    })

    const message = new MailerMessage({
        from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
        },
        to: [{ address: customerEmail }],
        subject: `Leihladen Commonszentrum - Heute außerplanmäßig geschlossen!`,
        html,
    })

    if (!DRY_MODE && !IMPORT_MODE) $app.newMailClient().send(message)
}

function sendDeletionReminderMail(c) {
    const { DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)
    const customerEmail = c.getString('email')

    const html = $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/mail/deletion_reminder.html`
    ).render({
        firstname: c.getString('firstname'),
        lastname: c.getString('lastname'),
    })

    const message = new MailerMessage({
        from: {
            address: $app.settings().meta.senderAddress,
            name: $app.settings().meta.senderName,
        },
        to: [{ address: customerEmail }],
        subject: `Leihladen Commonszentrum - Löschung Ihrer Daten nach Inaktivität (Kunden-Nr. ${c.getInt('iid')})`,
        html,
    })

    c.set('delete_reminder_sent', new DateTime())
    $app.save(c)

    if (!DRY_MODE && !IMPORT_MODE) $app.newMailClient().send(message)
}

module.exports = {
    nextIid,
    findByEmail,
    getUniqueStreets,
    exportCsv,
    getInactive,
    sendWelcomeMail,
    sendEmergencyClosingMail,
    sendDeletionReminderMail,
}
