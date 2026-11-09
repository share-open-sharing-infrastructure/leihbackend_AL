function handleGetOpeningHours(e) {
    const { getOpeningHours } = require(`${__hooks}/services/opening-hours.js`)

    const hours = getOpeningHours()

    return e.json(200, { opening_hours: hours })
}

module.exports = {
    handleGetOpeningHours,
}
