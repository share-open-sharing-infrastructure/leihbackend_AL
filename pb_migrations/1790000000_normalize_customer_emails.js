/// <reference path="../pb_data/types.d.ts" />

// Lowercase and trim all existing customer emails.
// The create/update hooks in customer.pb.js already do this for records that go
// through the API, but raw-SQL paths (seeds, bulk imports, IMPORT_MODE) bypass them.
// Must run before the unique index migration so that comparison is meaningful.
migrate((app) => {
    app.db().newQuery(`
        UPDATE customer
        SET email = lower(trim(email))
        WHERE email <> lower(trim(email))
    `).execute()
}, (app) => {
    // Not reversible: the original casing is gone.
})
