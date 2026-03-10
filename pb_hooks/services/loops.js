function createContact(email, firstName, lastName) {
    const { LOOPS_API_KEY, DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)

    if (!LOOPS_API_KEY) {
        $app.logger().warn('LOOPS_API_KEY not set, skipping contact creation.')
        return
    }

    if (DRY_MODE || IMPORT_MODE) {
        $app.logger().info('Skipping Loops contact creation (DRY_MODE or IMPORT_MODE)', 'email', email)
        return
    }

    try {
        const res = $http.send({
            url: 'https://app.loops.so/api/v1/contacts/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LOOPS_API_KEY,
            },
            body: JSON.stringify({
                email: email,
                firstName: firstName,
                lastName: lastName,
                subscribed: true,
            }),
        })

        if (res.statusCode >= 400) {
            $app.logger().error('Loops create contact failed', 'email', email, 'status', res.statusCode, 'body', res.raw)
        } else {
            $app.logger().info('Loops contact created', 'email', email)
        }
    } catch (err) {
        $app.logger().error('Loops create contact error', 'email', email, 'error', String(err))
    }
}

function updateContact(email, firstName, lastName) {
    const { LOOPS_API_KEY, DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)

    if (!LOOPS_API_KEY) {
        $app.logger().warn('LOOPS_API_KEY not set, skipping contact update.')
        return
    }

    if (DRY_MODE || IMPORT_MODE) {
        $app.logger().info('Skipping Loops contact update (DRY_MODE or IMPORT_MODE)', 'email', email)
        return
    }

    try {
        const res = $http.send({
            url: 'https://app.loops.so/api/v1/contacts/update',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LOOPS_API_KEY,
            },
            body: JSON.stringify({
                email: email,
                firstName: firstName,
                lastName: lastName,
            }),
        })

        if (res.statusCode >= 400) {
            $app.logger().error('Loops update contact failed', 'email', email, 'status', res.statusCode, 'body', res.raw)
        } else {
            $app.logger().info('Loops contact updated', 'email', email)
        }
    } catch (err) {
        $app.logger().error('Loops update contact error', 'email', email, 'error', String(err))
    }
}

function deleteContact(email) {
    const { LOOPS_API_KEY, DRY_MODE, IMPORT_MODE } = require(`${__hooks}/constants.js`)

    if (!LOOPS_API_KEY) {
        $app.logger().warn('LOOPS_API_KEY not set, skipping contact deletion.')
        return
    }

    if (DRY_MODE || IMPORT_MODE) {
        $app.logger().info('Skipping Loops contact deletion (DRY_MODE or IMPORT_MODE)', 'email', email)
        return
    }

    try {
        // Loops API uses POST for deletion (not DELETE)
        const res = $http.send({
            url: 'https://app.loops.so/api/v1/contacts/delete',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LOOPS_API_KEY,
            },
            body: JSON.stringify({
                email: email,
            }),
        })

        if (res.statusCode >= 400) {
            $app.logger().error('Loops delete contact failed', 'email', email, 'status', res.statusCode, 'body', res.raw)
        } else {
            $app.logger().info('Loops contact deleted', 'email', email)
        }
    } catch (err) {
        $app.logger().error('Loops delete contact error', 'email', email, 'error', String(err))
    }
}

module.exports = {
    createContact,
    updateContact,
    deleteContact,
}
