/// <reference path="../pb_data/types.d.ts" />

// Track how a customer record came into existence, and record their consent.
//
// source:          'staff' (entered in the Verwaltung), 'self_service' (entered by
//                  the person themselves in the resomaker) or 'import'. Left empty
//                  for pre-existing records – absence means "legacy", not "staff".
// consented_on /   Who accepted which version of the Leihbedingungen and when.
// consent_version  GDPR Art. 7(1) requires being able to demonstrate consent, so
//                  validating the checkboxes without storing the outcome is not enough.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_108570809")

  collection.fields.add(new Field({
    "hidden": false,
    "id": "select_source",
    "maxSelect": 1,
    "name": "source",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": ["staff", "self_service", "import"]
  }))

  collection.fields.add(new Field({
    "hidden": false,
    "id": "date_consented_on",
    "max": "",
    "min": "",
    "name": "consented_on",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  collection.fields.add(new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text_consent_version",
    "max": 0,
    "min": 0,
    "name": "consent_version",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_108570809")

  collection.fields.removeById("select_source")
  collection.fields.removeById("date_consented_on")
  collection.fields.removeById("text_consent_version")

  return app.save(collection)
})
