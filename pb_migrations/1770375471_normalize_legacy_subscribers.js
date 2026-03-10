/// <reference path="../pb_data/types.d.ts" />

// Normalize all existing customers with highlight_color='blue':
// set newsletter=true and clear highlight_color.
migrate((app) => {
    app.db().newQuery(`
        UPDATE customer
        SET newsletter = TRUE, highlight_color = ''
        WHERE highlight_color = 'blue'
    `).execute()
}, (app) => {
    // Not reversible: we can't distinguish which customers originally had
    // highlight_color='blue' vs. newsletter=true independently.
})
