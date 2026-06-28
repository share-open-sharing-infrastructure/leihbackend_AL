/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  app.runInTransaction((txApp) => {
    const records = txApp.findRecordsByFilter("pbc_108570809", "1=1", "", 0, 0)

    for (const record of records) {
      let changed = false

      if (!record.getString("street")) {
        record.set("street", "N/A")
        changed = true
      }
      if (!record.getString("house_number")) {
        record.set("house_number", "N/A")
        changed = true
      }
      if (!record.getString("city")) {
        record.set("city", "N/A")
        changed = true
      }
      if (!record.getString("postal_code")) {
        record.set("postal_code", "N/A")
        changed = true
      }

      if (changed) {
        txApp.save(record)
      }
    }
  })
}, (app) => {
  // Down migration: no-op (we can't know which records were originally empty)
})
