function handleSyncSubscribersToLoops(e) {
    const { createContact } = require(`${__hooks}/services/loops.js`)

    const result = arrayOf(new DynamicModel({
        email: '',
        firstname: '',
        lastname: '',
    }))

    e.app.db().newQuery(`
        SELECT email, firstname, lastname
        FROM customer
        WHERE newsletter = TRUE
    `).all(result)

    let synced = 0
    let failed = 0

    for (const row of result) {
        try {
            createContact(row.email, row.firstname, row.lastname)
            synced++
        } catch (err) {
            $app.logger().error('Failed to sync subscriber to Loops', 'email', row.email, 'error', String(err))
            failed++
        }
    }

    $app.logger().info('Loops initial sync complete', 'synced', synced, 'failed', failed)
    e.json(200, { synced, failed, total: result.length })
}

module.exports = {
    handleSyncSubscribersToLoops,
}
