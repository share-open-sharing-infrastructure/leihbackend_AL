import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { getAnonymousClient, getClient, initImap, listInbox, getFakeMailAccount, configureSmtp, USERNAME, purgeInbox } from './base.js'
import { assert } from 'chai'
import { describe, it, before } from 'mocha'
import { setTimeout } from 'timers/promises'

chai.use(chaiAsPromised)

// A complete, valid self-service signup payload. Individual tests spread this and
// override one field to check a single validation rule at a time.
const SIGNUP = {
    firstname: 'Max',
    lastname: 'Mustermann',
    street: 'Kunkelberg',
    house_number: '2',
    postal_code: '21335',
    city: 'Lüneburg',
    phone: '04131 123456',
    heard: 'Nachbarschaft',
    newsletter: false,
    accepted_terms: true,
    accepted_privacy: true,
}

describe('Reservations', () => {
    let client
    let anonymousClient
    let imapClient

    let item1, item2, item3, item4
    let customer1, customer2

    before(async () => {
        client = await getClient()
        anonymousClient = await getAnonymousClient()

        const mailConfig = await getFakeMailAccount()
        imapClient = await initImap(mailConfig.imap)
        await configureSmtp(client, mailConfig.smtp)
        await purgeInbox(imapClient)
    })

    after(async () => {
        await imapClient.end()
    })

    beforeEach(async () => {
        item1 = await client.collection('item').getFirstListItem('iid=1000') // apple pie
        item2 = await client.collection('item').getFirstListItem('iid=1001') // goat cheese
        item3 = await client.collection('item').getFirstListItem('iid=1002') // christmas tree
        item4 = await client.collection('item').getFirstListItem('iid=1003') // fluffy llama
        customer1 = await client.collection('customer').getFirstListItem('iid=1000') // john
        customer2 = await client.collection('customer').getFirstListItem('iid=1001') // jane
    })

    afterEach(async () => {
        await purgeInbox(imapClient)
    })

    describe('General', () => {
        it('should deny access to reservations for anonymous users', async () => {
            let promise = anonymousClient.collection('reservation').getFullList()
            await assert.isRejected(promise)
        })
    })

    describe('Creation', () => {
        // Note: addressing a customer by iid is a staff-only capability. For anonymous
        // callers the iid is ignored – see 'should ignore customer_iid from anonymous callers'.
        it('should create a reservation for an existing customer by iid', async () => {
            let reservation = await client.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)

            reservation = await client.collection('reservation').getOne(reservation.id)
            assert.equal(reservation.customer_name, `${customer1.firstname} ${customer1.lastname}`) // auto-fill
            assert.equal(reservation.customer_phone, customer1.phone) // auto-fill
            assert.equal(reservation.customer_email, customer1.email) // auto-fill
            assert.equal(reservation.customer_iid, customer1.iid) // auto-fill
            assert.isFalse(reservation.is_new_customer) // auto-fill

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            const messages = await listInbox(imapClient)
            assert.isAtLeast(messages.length, 1)
            const confirmMsg = messages.find(m => m.subject === 'Wir haben deine Reservierung für 27.12.2026 erhalten')
            assert.isNotNull(confirmMsg)
            assert.equal(confirmMsg.sender, USERNAME)
            assert.deepEqual(confirmMsg.recipients, [customer1.email])

            await client.collection('reservation').delete(reservation.id)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'instock')
        })

        it('should create a reservation for an existing customer by email', async () => {
            let reservation = await anonymousClient.collection('reservation').create({
                customer_email: 'johndoe@leihlokal-ka.de',
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)
            assert.doesNotHaveAnyKeys(reservation, ['customer_iid',
                'customer_name',
                'customer_email',
                'customer_phone',
                'comments',
                'done',
                'is_new_customer',
                'pickup',
                'items',
                'collectionId',
                'collectionName',
                'updated',
                'on_premises',
                'expand'])
            assert.doesNotHaveAllKeys(reservation, ['otp'])

            reservation = await client.collection('reservation').getOne(reservation.id)
            assert.equal(reservation.customer_name, `${customer1.firstname} ${customer1.lastname}`) // auto-fill
            assert.equal(reservation.customer_phone, customer1.phone) // auto-fill
            assert.equal(reservation.customer_email, customer1.email) // auto-fill
            assert.equal(reservation.customer_iid, customer1.iid) // auto-fill
            assert.isFalse(reservation.is_new_customer) // auto-fill

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            const messages = await listInbox(imapClient)
            assert.isAtLeast(messages.length, 1)
            const confirmMsg = messages.find(m => m.subject === 'Wir haben deine Reservierung für 27.12.2026 erhalten')
            assert.isNotNull(confirmMsg)
            assert.equal(confirmMsg.sender, USERNAME)
            assert.deepEqual(confirmMsg.recipients, [customer1.email])

            await client.collection('reservation').delete(reservation.id)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'instock')
        })

        it('should autofill customer info', async () => {
            let reservation = await anonymousClient.collection('reservation').create({
                customer_email: customer1.email,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })

            reservation = await client.collection('reservation').getOne(reservation.id)
            assert.equal(reservation.customer_email, customer1.email)
            assert.equal(reservation.customer_name, `${customer1.firstname} ${customer1.lastname}`)
            assert.equal(reservation.customer_phone, customer1.phone)
            assert.equal(reservation.customer_iid, customer1.iid)

            await client.collection('reservation').delete(reservation.id)
        })

        // Duplicate emails used to be possible, which is why autofill bailed out when it
        // found more than one match. Emails are unique now, so the situation can no
        // longer arise – assert that the database refuses to create it in the first place.
        it('should reject a customer email that already exists', async () => {
            const promise = client.collection('customer').update(customer2.id, { email: customer1.email })
            await assert.isRejected(promise)
        })

        it('should ignore customer_iid from anonymous callers', async () => {
            // An arbitrary iid from an unauthenticated caller would attribute the
            // reservation to a stranger and mail the confirmation to them.
            const testEmail = 'stranger@bobbbob.tld'
            let reservation = await anonymousClient.collection('reservation').create({
                customer_iid: 1000,  // john, who has nothing to do with this request
                customer_email: testEmail,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })

            reservation = await client.collection('reservation').getOne(reservation.id)
            assert.equal(reservation.customer_iid, 0)
            assert.isEmpty(reservation.customer_name)
            assert.isEmpty(reservation.customer_phone)
            assert.equal(reservation.customer_email, testEmail)
            assert.isTrue(reservation.is_new_customer)

            const messages = await listInbox(imapClient)
            const leaked = messages.find(m => m.recipients.includes(customer1.email))
            assert.isUndefined(leaked, 'confirmation must not reach the impersonated customer')

            await client.collection('reservation').delete(reservation.id)
        })

        it('should create a reservation for a new customer', async () => {
            const testEmail = 'bobby@bobbbob.tld'
            let reservation = await anonymousClient.collection('reservation').create({
                customer_name: 'Bob Bobby',
                customer_phone: '0123456789',
                customer_email: testEmail,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)

            const messages = await listInbox(imapClient)
            assert.isAtLeast(messages.length, 1)
            const confirmMsg = messages.find(m => m.subject === 'Wir haben deine Reservierung für 27.12.2026 erhalten')
            assert.isNotNull(confirmMsg)
            assert.equal(confirmMsg.sender, USERNAME)
            assert.deepEqual(confirmMsg.recipients, [testEmail])

            await client.collection('reservation').delete(reservation.id)
        })

        it('should create a reservation and register the customer from signup data', async () => {
            const testEmail = 'selbst@bobbbob.tld'
            let reservation = await anonymousClient.collection('reservation').create({
                customer_email: testEmail,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                signup: { ...SIGNUP },
            })
            assert.isNotNull(reservation)
            // the anonymous response must still not echo any customer data back
            assert.doesNotHaveAnyKeys(reservation, ['customer_iid', 'customer_name', 'customer_email', 'customer_phone'])

            const customers = await client.collection('customer').getFullList({ filter: `email="${testEmail}"` })
            assert.lengthOf(customers, 1)
            const customer = customers[0]
            assert.equal(customer.firstname, SIGNUP.firstname)
            assert.equal(customer.lastname, SIGNUP.lastname)
            assert.equal(customer.street, SIGNUP.street)
            assert.equal(customer.house_number, SIGNUP.house_number)
            assert.equal(customer.postal_code, SIGNUP.postal_code)
            assert.equal(customer.city, SIGNUP.city)
            assert.equal(customer.source, 'self_service')
            assert.isNotEmpty(customer.consented_on)
            assert.isNotEmpty(customer.consent_version)
            assert.isFalse(customer.newsletter)  // opt-in only
            assert.isAbove(customer.iid, 0)

            reservation = await client.collection('reservation').getOne(reservation.id)
            assert.equal(reservation.customer_iid, customer.iid)
            assert.equal(reservation.customer_name, `${SIGNUP.firstname} ${SIGNUP.lastname}`)
            assert.isFalse(reservation.is_new_customer)

            const messages = await listInbox(imapClient)
            assert.isNotNull(messages.find(m => m.subject === 'Deine Registrierung im Leihladen des Commonszentrums'))
            assert.isNotNull(messages.find(m => m.subject === 'Wir haben deine Reservierung für 27.12.2026 erhalten'))

            await client.collection('reservation').delete(reservation.id)
            await client.collection('customer').delete(customer.id)
        })

        it('should reuse an existing customer and ignore the signup payload', async () => {
            let reservation = await anonymousClient.collection('reservation').create({
                customer_email: customer1.email,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                signup: { ...SIGNUP, firstname: 'Hacker', lastname: 'McEvil', street: 'Evilstraße' },
            })

            const customers = await client.collection('customer').getFullList({ filter: `email="${customer1.email}"` })
            assert.lengthOf(customers, 1, 'must not create a second record')
            assert.equal(customers[0].firstname, customer1.firstname, 'existing data must not be overwritten')
            assert.equal(customers[0].street, customer1.street)

            reservation = await client.collection('reservation').getOne(reservation.id)
            assert.equal(reservation.customer_iid, customer1.iid)

            await client.collection('reservation').delete(reservation.id)
        })

        // The customer and the reservation share a transaction, so a reservation that
        // fails validation must leave no customer behind and send no mail.
        it('should roll back the created customer when the reservation is invalid', async () => {
            const testEmail = 'rollback@bobbbob.tld'
            const promise = anonymousClient.collection('reservation').create({
                customer_email: testEmail,
                customer_phone: 'not-a-phone-number',  // fails inside the transaction
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                signup: { ...SIGNUP },
            })
            await assert.isRejected(promise)

            const customers = await client.collection('customer').getFullList({ filter: `email="${testEmail}"` })
            assert.isEmpty(customers, 'customer must have been rolled back')
            // proves the deferred after-success hooks (welcome mail, Loops sync) never ran
            assert.isEmpty(await listInbox(imapClient))
        })

        it('should reject a signup without consent', async () => {
            for (const field of ['accepted_terms', 'accepted_privacy']) {
                const testEmail = `noconsent-${field}@bobbbob.tld`
                const promise = anonymousClient.collection('reservation').create({
                    customer_email: testEmail,
                    items: [item1.id],
                    pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                    signup: { ...SIGNUP, [field]: false },
                })
                await assert.isRejected(promise)
                assert.isEmpty(await client.collection('customer').getFullList({ filter: `email="${testEmail}"` }))
            }
        })

        it('should reject a signup with missing required fields', async () => {
            for (const field of ['firstname', 'lastname', 'street', 'house_number', 'postal_code', 'city']) {
                const testEmail = `missing-${field}@bobbbob.tld`
                const promise = anonymousClient.collection('reservation').create({
                    customer_email: testEmail,
                    items: [item1.id],
                    pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                    signup: { ...SIGNUP, [field]: '' },
                })
                await assert.isRejected(promise)
                assert.isEmpty(await client.collection('customer').getFullList({ filter: `email="${testEmail}"` }))
            }
        })

        it('should reject a signup with an unknown "heard" value', async () => {
            const testEmail = 'badheard@bobbbob.tld'
            const promise = anonymousClient.collection('reservation').create({
                customer_email: testEmail,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                signup: { ...SIGNUP, heard: 'Von einem Raben' },
            })
            await assert.isRejected(promise)
            assert.isEmpty(await client.collection('customer').getFullList({ filter: `email="${testEmail}"` }))
        })

        it('should allocate sequential iids for consecutive signups', async () => {
            const emails = ['seq1@bobbbob.tld', 'seq2@bobbbob.tld']
            const created = []
            for (const email of emails) {
                const reservation = await anonymousClient.collection('reservation').create({
                    customer_email: email,
                    items: [item1.id],
                    pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                    signup: { ...SIGNUP },
                })
                created.push(reservation.id)
            }

            const [c1] = await client.collection('customer').getFullList({ filter: `email="${emails[0]}"` })
            const [c2] = await client.collection('customer').getFullList({ filter: `email="${emails[1]}"` })
            assert.equal(c2.iid, c1.iid + 1)

            for (const id of created) await client.collection('reservation').delete(id)
            await client.collection('customer').delete(c1.id)
            await client.collection('customer').delete(c2.id)
        })

        it('should create only one customer for two concurrent identical signups', async () => {
            const testEmail = 'concurrent@bobbbob.tld'
            const create = () => anonymousClient.collection('reservation').create({
                customer_email: testEmail,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
                signup: { ...SIGNUP },
            })
            const settled = await Promise.allSettled([create(), create()])

            const customers = await client.collection('customer').getFullList({ filter: `email="${testEmail}"` })
            assert.lengthOf(customers, 1)

            for (const r of settled.filter(r => r.status === 'fulfilled')) {
                await client.collection('reservation').delete(r.value.id)
            }
            await client.collection('customer').delete(customers[0].id)
        })

        it('should fail when required customer fields are missing', async () => {
            let reservationPromise = anonymousClient.collection('reservation').create({
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            await assert.isRejected(reservationPromise)
            assert.isEmpty(await listInbox(imapClient))
        })

        it('should fail when reserving an unavailable item', async () => {
            let reservationPromise = anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item3.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            await assert.isRejected(reservationPromise)
            assert.isEmpty(await listInbox(imapClient))
        })

        it('should fail when pickup date is outside opening hours', async () => {
            let reservationPromise = anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T17:00:00Z')),  // sunday
            })
            await assert.isRejected(reservationPromise)
            assert.isEmpty(await listInbox(imapClient))
        })

        it('should fail when pickup date is in the past', async () => {
            let reservationPromise = anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date().addDays(-1),
            })
            await assert.isRejected(reservationPromise)
            assert.isEmpty(await listInbox(imapClient))
        })

        it('should fail when reserving a protected item as anonymous user but succeed as superuser', async () => {
            await client.collection('item').update(item1.id, { is_protected: true })

            let reservationPromise = anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            await assert.isRejected(reservationPromise)

            let reservation = await client.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)

            await client.collection('reservation').delete(reservation.id)
            await client.collection('item').update(item1.id, { is_protected: false })
        })
    })

    describe('Status', () => {
        it('should free up item when reservation is marked as done', async () => {
            let reservation = await anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)

            await purgeInbox(imapClient)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            await client.collection('reservation').update(reservation.id, {
                done: true
            })
            assert.isEmpty(await listInbox(imapClient))  // no mail sent for update

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'instock')

            await client.collection('reservation').delete(reservation.id)
        })

        it('should properly update item statuses of modified reservation', async () => {
            let reservation = await anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)

            item1 = await client.collection('item').getOne(item1.id)
            item2 = await client.collection('item').getOne(item2.id)
            assert.equal(item1.status, 'reserved')
            assert.equal(item2.status, 'instock')

            await client.collection('reservation').update(reservation.id, {
                items: [item2.id],
            })

            item1 = await client.collection('item').getOne(item1.id)
            item2 = await client.collection('item').getOne(item2.id)
            assert.equal(item1.status, 'instock')
            assert.equal(item2.status, 'reserved')

            await client.collection('reservation').delete(reservation.id)
        })

        it('should not update item status when changing other fields', async () => {
            let reservation = await anonymousClient.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(reservation)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            await client.collection('reservation').update(reservation.id, {
                comments: 'foobar',
            })

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            await client.collection('reservation').delete(reservation.id)
        })
    })

    describe('Housekeeping', () => {
        it('should properly clean up old dangling reservations and their item statuses', async () => {
            let newReservation = await client.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            assert.isNotNull(newReservation)
            assert.isFalse(newReservation.done)
            assert.equal(newReservation.items[0], item1.id)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            let oldReservation = await client.collection('reservation').getFirstListItem('customer_iid = 5000')
            assert.isNotNull(oldReservation)
            assert.isFalse(oldReservation.done)
            assert.equal(oldReservation.items[0], item4.id)

            item4 = await client.collection('item').getOne(item4.id)
            assert.equal(item4.status, 'reserved')

            await client.crons.run('clear_reservations')
            await setTimeout(3000)

            newReservation = await client.collection('reservation').getOne(newReservation.id)
            assert.isFalse(newReservation.done)

            oldReservation = await client.collection('reservation').getOne(oldReservation.id)
            assert.isTrue(oldReservation.done)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item4.status, 'reserved')

            item4 = await client.collection('item').getOne(item4.id)
            assert.equal(item4.status, 'instock')

            await client.collection('reservation').update(oldReservation.id, { done: false }, { force: true })
            await client.collection('item').update(item4.id, { status: 'reserved' })
            await client.collection('reservation').delete(newReservation.id)
        })
    })

    describe('Other', () => {
        it('should handle reservation cancellation', async () => {
            let reservation1 = await client.collection('reservation').create({
                customer_iid: 1000,
                items: [item1.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })
            let reservation2 = await client.collection('reservation').create({
                customer_iid: 1000,
                items: [item2.id],
                pickup: new Date(Date.parse('2026-12-27T13:00:00Z')),
            })

            assert.lengthOf(await client.collection('reservation').getFullList(), 3)  // one old one already existed

            await purgeInbox(imapClient)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'reserved')

            const response = await client.send('/reservation/cancel', {
                query: {
                    token: reservation1.cancel_token
                }
            })
            assert.deepEqual(response, {})  // empty response

            const reservations = await client.collection('reservation').getFullList()
            assert.lengthOf(reservations, 2)  // one old one already existed
            assert.equal(reservations[1].id, reservation2.id)

            item1 = await client.collection('item').getOne(item1.id)
            assert.equal(item1.status, 'instock')

            const messages = await listInbox(imapClient)
            assert.isAtLeast(messages.length, 1)
            const cancelMsg = messages.find(m => m.subject === 'Deine Reservierung für 27.12.2026 wurde storniert')
            assert.isNotNull(cancelMsg)
            assert.equal(cancelMsg.sender, USERNAME)
            assert.deepEqual(cancelMsg.recipients, [customer1.email])

            const adminCancelMsg = messages.find(m => m.subject.startsWith('Stornierte Reservierung:') && m.subject.endsWith('für 27.12.2026'))
            assert.isNotNull(adminCancelMsg)
            assert.deepEqual(adminCancelMsg.recipients, [USERNAME])

            await client.collection('reservation').delete(reservation2.id)
        })
    })
})
