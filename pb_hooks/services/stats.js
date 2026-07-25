// TODO: make time offset (currently -5 years) configurable

function getMonthlyNewCustomers(app = $app) {
    /*
    select strftime('%Y-%m-01', registered_on) as month, count(*) as cnt from customer where registered_on >= date(date(), '-5 years') group by month;
    */

    const sql = app.db()
        .select("strftime('%Y-%m-01', registered_on) as month")
        .andSelect("count(*) as cnt")
        .from("customer")
        .where($dbx.exp("registered_on >= date(date(), '-5 years')"))
        .groupBy("month")
        .orderBy("month")

    const results = arrayOf(new DynamicModel({
        month: '',
        cnt: 0
    }))
    sql.all(results)

    return Object.fromEntries(results.map(r => [r.month, r.cnt]))
}

function getMonthlyRentals(app = $app) {
    /*
    select strftime('%Y-%m-01', rented_on) as month, count(*) as cnt from rental where rented_on >= date(date(), '-5 years') group by month;
    */

    const sql = app.db()
        .select("strftime('%Y-%m-01', rented_on) as month")
        .andSelect("count(*) as cnt")
        .from("rental")
        .where($dbx.exp("rented_on >= date(date(), '-5 years')"))
        .groupBy("month")
        .orderBy("month")

    const results = arrayOf(new DynamicModel({
        month: '',
        cnt: 0
    }))
    sql.all(results)

    return Object.fromEntries(results.map(r => [r.month, r.cnt]))
}

function getMonthlyNewItems(app = $app) {
    /*
    select strftime('%Y-%m-01', added_on) as month, count(*) as cnt from item where status != 'deleted' and added_on >= date(date(), '-5 years') group by month;
    */

    const sql = app.db()
        .select("strftime('%Y-%m-01', added_on) as month")
        .andSelect("count(*) as cnt")
        .from("item")
        .where($dbx.exp("status != 'deleted' and added_on >= date(date(), '-5 years')"))
        .groupBy("month")
        .orderBy("month")

    const results = arrayOf(new DynamicModel({
        month: '',
        cnt: 0
    }))
    sql.all(results)

    return Object.fromEntries(results.map(r => [r.month, r.cnt]))
}

function getMonthlyActiveCustomers(app = $app) {
    /*
    select strftime('%Y-%m-01', rented_on) as month, count(distinct customer) as cnt from rental where rented_on >= date(date(), '-5 years') group by month;
    */

    const sql = app.db()
        .select("strftime('%Y-%m-01', rented_on) as month")
        .andSelect("count(distinct customer) as cnt")
        .from("rental")
        .where($dbx.exp("rented_on >= date(date(), '-5 years')"))
        .groupBy("month")
        .orderBy("month")

    const results = arrayOf(new DynamicModel({
        month: '',
        cnt: 0
    }))
    sql.all(results)

    return Object.fromEntries(results.map(r => [r.month, r.cnt]))
}

function getStats(app = $app) {
    const newCustomersCount = getMonthlyNewCustomers(app)
    const activeCustomersCount = getMonthlyActiveCustomers(app)
    const rentalsCount = getMonthlyRentals(app)
    const totalItems = getMonthlyNewItems(app)

    // fill dates to ensure consistent time grid across all stats
    const months = [...new Set([
        ...Object.keys(newCustomersCount),
        ...Object.keys(activeCustomersCount),
        ...Object.keys(rentalsCount),
        ...Object.keys(totalItems),
    ])].toSorted()

    const minMonth = months.length > 0 ? months[0] : '1970-01-01'
    const maxMonth = months.length > 0 ? months[months.length - 1] : '1970-01-01'

    const minDate = new DateTime(`${minMonth} 00:00:00.000Z`)
    const maxDate = new DateTime(`${maxMonth} 00:00:00.000Z`)

    let currentDate = minDate
    while (currentDate < maxDate) {
        const currentDateStr = currentDate.string().substring(0, 10)
        if (!(currentDateStr in newCustomersCount)) newCustomersCount[currentDateStr] = 0
        if (!(currentDateStr in activeCustomersCount)) activeCustomersCount[currentDateStr] = 0
        if (!(currentDateStr in rentalsCount)) rentalsCount[currentDateStr] = 0
        if (!(currentDateStr in totalItems)) totalItems[currentDateStr] = 0
        currentDate = currentDate.addDate(0, 1, 0)
    }

    return {
        "new_customers_count": newCustomersCount,
        "active_customers_count": activeCustomersCount,
        "rentals_count": rentalsCount,
        "total_items": totalItems,
    }
}

module.exports = {
    getMonthlyNewCustomers,
    getMonthlyRentals,
    getStats,
    getMonthlyNewItems,
    getMonthlyActiveCustomers,
}