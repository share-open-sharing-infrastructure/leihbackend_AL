/**
 * Subscriber sync logic.
 *
 * A customer qualifies as a subscriber if newsletter=true OR highlight_color='blue'.
 * The "subscribers" view in production reflects this.
 *
 * When a customer matches via highlight_color='blue' (legacy), we null out
 * highlight_color and set newsletter=true to normalize the record.
 *
 * On qualifying create/update: POST to Loops API to add subscriber.
 * On disqualifying update or delete: POST to Loops API to remove subscriber.
 */

function isSubscriber(record) {
    return record.getBool('newsletter') || record.getString('highlight_color') === 'blue'
}

/**
 * Normalize legacy highlight_color='blue' entries by setting newsletter=true
 * and clearing highlight_color. Called in execute hooks so the mutation is
 * committed as part of the main save (no extra $app.save needed).
 */
function normalizeLegacySubscriber(record) {
    if (record.getString('highlight_color') === 'blue') {
        record.set('highlight_color', '')
        record.set('newsletter', true)
    }
}

/**
 * Sync a customer's subscriber status after create or update.
 * @param {Record} record - the current record state
 * @param {Record|null} original - the previous record state (null on create)
 */
function syncSubscriber(record, original) {
    const { createContact, updateContact, deleteContact } = require(`${__hooks}/services/loops.js`)

    const nowQualifies = isSubscriber(record)
    const previouslyQualified = original ? isSubscriber(original) : false

    if (nowQualifies && !previouslyQualified) {
        createContact(
            record.getString('email'),
            record.getString('firstname'),
            record.getString('lastname'),
        )
    } else if (!nowQualifies && previouslyQualified) {
        deleteContact(original.getString('email'))
    } else if (nowQualifies && previouslyQualified && original) {
        const emailChanged = original.getString('email') !== record.getString('email')
        const nameChanged = original.getString('firstname') !== record.getString('firstname')
            || original.getString('lastname') !== record.getString('lastname')

        if (emailChanged) {
            // Loops identifies contacts by email, so delete old and create new
            deleteContact(original.getString('email'))
            createContact(
                record.getString('email'),
                record.getString('firstname'),
                record.getString('lastname'),
            )
        } else if (nameChanged) {
            updateContact(
                record.getString('email'),
                record.getString('firstname'),
                record.getString('lastname'),
            )
        }
    }
}

/**
 * Handle subscriber removal when a customer is deleted.
 */
function handleSubscriberRemoval(record) {
    const { deleteContact } = require(`${__hooks}/services/loops.js`)

    if (isSubscriber(record)) {
        deleteContact(record.getString('email'))
    }
}

module.exports = {
    isSubscriber,
    normalizeLegacySubscriber,
    syncSubscriber,
    handleSubscriberRemoval,
}
