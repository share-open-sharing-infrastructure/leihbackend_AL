/// <reference path="../pb_data/types.d.ts" />

// Enforce unique customer emails.
//
// Until now email was neither unique nor indexed, which is why autofillCustomer()
// bails out when it finds more than one match. Self-service signup needs email to
// be a reliable identity key, so we make it one.
//
// The index is an expression index on LOWER(email) so that it still holds for rows
// written through raw SQL (which bypasses the lowercasing hook in customer.pb.js),
// and partial on email != '' so that multiple blank addresses don't collide.

const MANAGED_INDEXES = ['idx_customer_email_unique', 'idx_customer_email_lookup']

function otherIndexes(collection) {
    const existing = JSON.parse(JSON.stringify(collection.indexes)) || []
    return existing.filter((idx) => !MANAGED_INDEXES.some((name) => idx.includes(name)))
}

migrate((app) => {
    // Pre-flight: fail loudly with an actionable message rather than with an opaque
    // SQLite constraint error. Duplicates can't be merged automatically – deciding
    // which of two records keeps the rental history is a human call.
    const dupes = arrayOf(new DynamicModel({ email: '', cnt: 0 }))
    app.db().newQuery(`
        SELECT lower(trim(email)) AS email, COUNT(*) AS cnt
        FROM customer
        WHERE trim(email) <> ''
        GROUP BY 1
        HAVING COUNT(*) > 1
        ORDER BY cnt DESC
    `).all(dupes)

    if (dupes.length) {
        throw new Error(
            `Cannot add unique index on customer.email – ${dupes.length} duplicate address(es) found:\n` +
            dupes.map((d) => `  ${d.email} (${d.cnt}x)`).join('\n') +
            '\nMerge or clear them in the admin UI, then re-run the migration.'
        )
    }

    const collection = app.findCollectionByNameOrId('pbc_108570809')
    unmarshal({
        indexes: [
            ...otherIndexes(collection),
            'CREATE UNIQUE INDEX `idx_customer_email_unique` ON `customer` (LOWER(`email`)) WHERE `email` != \'\'',
            'CREATE INDEX `idx_customer_email_lookup` ON `customer` (`email`)',
        ],
    }, collection)

    return app.save(collection)
}, (app) => {
    const collection = app.findCollectionByNameOrId('pbc_108570809')
    unmarshal({ indexes: otherIndexes(collection) }, collection)

    return app.save(collection)
})
