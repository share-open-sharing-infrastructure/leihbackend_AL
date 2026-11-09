function handleGetCsv(e) {
    const {exportCsv} = require(`${__hooks}/services/customer.js`)

    const result = exportCsv()
    const ts = new DateTime().unix()

    e.response.header().set('content-type', 'text/csv')
    e.response.header().set('content-disposition', `attachment; filename="customers_${ts}.csv"`)
    return e.string(200, result)
}

/* Public: does an account for this address already exist?

   Lets the resomaker tell a returning person "we already know you" instead of making
   them retype their data. This is deliberately an account-enumeration oracle – that
   trade-off was accepted for the UX. Keep it as narrow as possible:
   POST so the address stays out of access logs, history and Referer headers; a bare
   boolean and nothing else in the response; no caching. A rate-limit rule for
   'POST /api/customer/exists' belongs in the PocketBase settings. */
function handlePostExists(e) {
    const data = new DynamicModel({ email: '' })
    e.bindBody(data)

    const email = String(data.email || '').trim().toLowerCase()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new BadRequestError('Bitte gib eine gültige E-Mail-Adresse ein.')
    }

    const count = $app.countRecords('customer', $dbx.hashExp({ email }))

    e.response.header().set('cache-control', 'no-store')
    return e.json(200, { known: count > 0 })
}

module.exports = {
    handleGetCustomersCsv: handleGetCsv,
    handlePostExists,
}
