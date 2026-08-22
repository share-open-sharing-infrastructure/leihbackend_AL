/// <reference path="../../pb_data/types.d.ts" />

/**
 * Load the shared layout.html chrome + a body template and render them
 * together with a merged context. Always injects `openingHours` so the
 * layout footer (and any body that wants it) can render current values
 * without every caller having to remember to pass them.
 *
 * `bodyPath` is resolved relative to pb_hooks/views/, e.g.
 *   render('mail/reservation_confirmation.html', ctx)
 *   render('reservation_cancelled.html', ctx)  // used by routes/reservation.js
 */
function render(bodyPath, ctx = {}) {
    const { toDisplay } = require(`${__hooks}/services/opening-hours.js`)

    return $template.loadFiles(
        `${__hooks}/views/layout.html`,
        `${__hooks}/views/${bodyPath}`
    ).render({
        openingHours: toDisplay(),
        ...ctx,
    })
}

module.exports = { render }
