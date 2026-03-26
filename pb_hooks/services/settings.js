const { OPENING_HOURS } = require(`${__hooks}/constants.js`)

/**
 * Read opening hours from the settings collection.
 * Falls back to the hardcoded OPENING_HOURS from constants.js
 * if no settings record exists or the field is empty.
 */
function getOpeningHours(app = $app) {
    try {
        const records = app.findAllRecords('settings')
        if (!records.length) return OPENING_HOURS

        const raw = records[0].get('opening_hours')
        if (!raw || !Array.isArray(raw) || raw.length === 0) return OPENING_HOURS

        return raw
    } catch (e) {
        // Collection doesn't exist yet — fall back
        return OPENING_HOURS
    }
}

module.exports = {
    getOpeningHours,
}
