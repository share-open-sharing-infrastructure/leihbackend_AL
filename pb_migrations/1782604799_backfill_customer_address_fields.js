/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  app.db().newQuery(`
    UPDATE customer
    SET street = 'N/A'
    WHERE street IS NULL OR street = ''
  `).execute()

  app.db().newQuery(`
    UPDATE customer
    SET house_number = 'N/A'
    WHERE house_number IS NULL OR house_number = ''
  `).execute()

  app.db().newQuery(`
    UPDATE customer
    SET city = 'N/A'
    WHERE city IS NULL OR city = ''
  `).execute()

  app.db().newQuery(`
    UPDATE customer
    SET postal_code = 'N/A'
    WHERE postal_code IS NULL OR postal_code = ''
  `).execute()
}, (app) => {
  // Down migration: no-op (we can't know which records were originally empty)
})
