// Self-service registration: turning personal data entered in the resomaker into a
// customer record, as part of creating the reservation.
//
// Important: every write here runs inside the reservation's transaction, so all
// helpers take an explicit `app` and must never fall back to the global $app for
// writes. See reservation.pb.js for the transaction notes.

const REQUIRED_FIELDS = [
    ['firstname', 'Vorname'],
    ['lastname', 'Nachname'],
    ['street', 'Straße'],
    ['house_number', 'Hausnummer'],
    ['postal_code', 'PLZ'],
    ['city', 'Stadt'],
]

/* Read the signup payload off the raw request body.

   It deliberately does not live on the reservation collection: a hidden field can't
   be written by an unauthenticated caller (PocketBase strips hidden keys from
   non-superuser writes), and a visible one would store the personal data twice.
   Unknown body keys survive PocketBase's field mapping, so we can just read it. */
function parseSignup(e) {
    let raw
    try {
        raw = e.requestEvent?.requestInfo()?.body?.signup
    } catch (err) {
        return null
    }
    if (!raw) return null

    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw)
        } catch (err) {
            throw new BadRequestError('Ungültige Registrierungsdaten.')
        }
    }
    if (typeof raw !== 'object') throw new BadRequestError('Ungültige Registrierungsdaten.')

    return raw
}

/* Throws a BadRequestError with a German message, matching validatePickup's style. */
function validateSignup(s) {
    const { HEARD_VALUES } = require(`${__hooks}/constants.js`)

    const missing = REQUIRED_FIELDS
        .filter(([key]) => !String(s[key] ?? '').trim())
        .map(([, label]) => label)

    if (missing.length) {
        throw new BadRequestError(`Bitte fülle folgende Felder aus: ${missing.join(', ')}.`)
    }

    if (s.accepted_terms !== true) {
        throw new BadRequestError('Bitte akzeptiere die Leihbedingungen.')
    }
    if (s.accepted_privacy !== true) {
        throw new BadRequestError('Bitte akzeptiere die Datenschutzerklärung.')
    }

    // `heard` is a select field with exact German values – an unknown one would
    // otherwise fail deep inside the transaction with an opaque error.
    const heard = String(s.heard ?? '').trim()
    if (heard && !HEARD_VALUES.includes(heard)) {
        throw new BadRequestError(`Ungültiger Wert für "Wie hast du von uns erfahren?".`)
    }

    const phone = String(s.phone ?? '').trim()
    if (phone && !/^[0-9\s\+\-\/]+$/.test(phone)) {
        throw new BadRequestError('Bitte gib eine gültige Telefonnummer ein.')
    }
}

/* Create the customer. `iid` is left unset on purpose – customer.pb.js allocates it
   inside the same transaction. */
function createFromSignup(signup, email, app = $app) {
    const { CONSENT_VERSION } = require(`${__hooks}/constants.js`)

    const collection = app.findCollectionByNameOrId('customer')
    const record = new Record(collection)
    const now = new DateTime()

    record.set('email', email?.trim().toLowerCase())
    record.set('firstname', String(signup.firstname).trim())
    record.set('lastname', String(signup.lastname).trim())
    record.set('street', String(signup.street).trim())
    record.set('house_number', String(signup.house_number).trim())
    record.set('postal_code', String(signup.postal_code).trim())
    record.set('city', String(signup.city).trim())
    record.set('phone', String(signup.phone ?? '').trim())
    record.set('heard', String(signup.heard ?? '').trim())
    record.set('registered_on', now)
    record.set('source', 'self_service')
    record.set('consented_on', now)
    record.set('consent_version', CONSENT_VERSION)
    // Marketing consent – opt-in only, never inferred.
    record.set('newsletter', signup.newsletter === true)

    app.save(record)
    app.logger().info(`Created self-service customer ${record.id} (${record.getInt('iid')}) for ${email}.`)

    return record
}

module.exports = {
    parseSignup,
    validateSignup,
    createFromSignup,
}
