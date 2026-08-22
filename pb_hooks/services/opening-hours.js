/// <reference path="../../pb_data/types.d.ts" />

/**
 * Central module for opening-hours templating.
 *
 * Wire format (persisted in `settings.opening_hours` and returned from
 * GET /api/opening-hours): Array<[dayKey, "HH:MM", "HH:MM"]>
 *   dayKey ∈ 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat'
 *
 * The format is intentionally preserved to remain compatible with the
 * `llka-resomaker` frontend. Any change here is a coordinated cross-repo
 * migration. Consumers inside the backend should NOT re-parse the tuple
 * form directly — use `toDisplay()` / `isWithinOpeningHours()` instead.
 */

const { OPENING_HOURS: FALLBACK, WEEKDAYS } = require(`${__hooks}/constants.js`)

const WEEKDAY_LABELS_DE = {
    mon: 'Montag',
    tue: 'Dienstag',
    wed: 'Mittwoch',
    thu: 'Donnerstag',
    fri: 'Freitag',
    sat: 'Samstag',
    sun: 'Sonntag',
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * Read opening hours from the settings collection.
 * Falls back to the hardcoded default in constants.js if no settings
 * record exists or the field is empty/malformed.
 */
function getOpeningHours(app = $app) {
    try {
        const records = app.findAllRecords('settings')
        if (!records.length) return FALLBACK

        const raw = JSON.parse(records[0].getRaw('opening_hours') || 'null')
        if (!raw || !Array.isArray(raw) || raw.length === 0) return FALLBACK

        return raw
    } catch (e) {
        // Collection doesn't exist yet — fall back
        return FALLBACK
    }
}

/**
 * Validate the tuple shape. Throws BadRequestError on any violation.
 * `null` / `undefined` / empty array are all treated as "unset" and pass —
 * a missing value simply means "fall back to the hardcoded default".
 */
function validateOpeningHours(raw) {
    if (raw == null) return
    if (Array.isArray(raw) && raw.length === 0) return

    if (!Array.isArray(raw)) {
        throw new BadRequestError('opening_hours muss ein Array sein.')
    }

    for (let i = 0; i < raw.length; i++) {
        const entry = raw[i]
        if (!Array.isArray(entry) || entry.length !== 3) {
            throw new BadRequestError(
                `opening_hours[${i}] muss ein Tupel [Wochentag, "HH:MM", "HH:MM"] sein.`
            )
        }
        const [day, open, close] = entry
        if (!(day in WEEKDAYS)) {
            throw new BadRequestError(
                `opening_hours[${i}]: unbekannter Wochentag "${day}". Erlaubt: ${Object.keys(WEEKDAYS).join(', ')}.`
            )
        }
        if (typeof open !== 'string' || !TIME_PATTERN.test(open)) {
            throw new BadRequestError(
                `opening_hours[${i}].open ("${open}") muss dem Format HH:MM entsprechen.`
            )
        }
        if (typeof close !== 'string' || !TIME_PATTERN.test(close)) {
            throw new BadRequestError(
                `opening_hours[${i}].close ("${close}") muss dem Format HH:MM entsprechen.`
            )
        }
        if (toMinutes(open) >= toMinutes(close)) {
            throw new BadRequestError(
                `opening_hours[${i}]: Öffnungszeit ("${open}") muss vor Schließzeit ("${close}") liegen.`
            )
        }
    }
}

/**
 * Convert to the display shape consumed by mail templates:
 *   [{ day: "Mittwoch", open: "17:00", close: "21:00" }, ...]
 */
function toDisplay(hours = getOpeningHours()) {
    return hours.map(([day, open, close]) => ({
        day: WEEKDAY_LABELS_DE[day] || day,
        open,
        close,
    }))
}

/**
 * Whether the given Date falls inside any opening-hour window.
 * Uses UTC to preserve the historical comparison behavior of the
 * previous `validatePickup` implementation.
 */
function isWithinOpeningHours(date, hours = getOpeningHours()) {
    const dow = date.getUTCDay()
    const minutes = date.getUTCHours() * 60 + date.getUTCMinutes()

    return hours.some(([day, open, close]) => {
        if (WEEKDAYS[day] !== dow) return false
        return minutes >= toMinutes(open) && minutes < toMinutes(close)
    })
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
}

module.exports = {
    getOpeningHours,
    validateOpeningHours,
    toDisplay,
    isWithinOpeningHours,
    WEEKDAY_LABELS_DE,
}
