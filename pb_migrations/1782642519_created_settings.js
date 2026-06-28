/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let collection
  try {
    collection = app.findCollectionByNameOrId("settings")
  } catch (e) {
    collection = new Collection({
      "id": "pbc_settings_001",
      "name": "settings",
      "type": "base",
      "system": false,
    })
  }

  collection.createRule = null
  collection.deleteRule = null
  collection.updateRule = null
  collection.listRule = ""
  collection.viewRule = ""
  collection.indexes = []
  collection.fields = [
    new Field({
      "autogeneratePattern": "[a-z0-9]{15}",
      "help": "",
      "hidden": false,
      "id": "text3208210256",
      "max": 15,
      "min": 15,
      "name": "id",
      "pattern": "^[a-z0-9]+$",
      "presentable": false,
      "primaryKey": true,
      "required": true,
      "system": true,
      "type": "text"
    }),
    new Field({
      "autogeneratePattern": "",
      "help": "",
      "hidden": false,
      "id": "text1847291650",
      "max": 0,
      "min": 0,
      "name": "app_name",
      "pattern": "",
      "presentable": true,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }),
    new Field({
      "autogeneratePattern": "",
      "help": "",
      "hidden": false,
      "id": "text2938475610",
      "max": 0,
      "min": 0,
      "name": "tagline",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "file4829371056",
      "maxSelect": 1,
      "maxSize": 2097152,
      "mimeTypes": [
        "image/png",
        "image/svg+xml",
        "image/jpeg"
      ],
      "name": "logo",
      "presentable": false,
      "protected": false,
      "required": false,
      "system": false,
      "thumbs": [],
      "type": "file"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "file5938271640",
      "maxSelect": 1,
      "maxSize": 2097152,
      "mimeTypes": [
        "image/png",
        "image/svg+xml",
        "image/x-icon",
        "image/vnd.microsoft.icon"
      ],
      "name": "favicon",
      "presentable": false,
      "protected": false,
      "required": false,
      "system": false,
      "thumbs": [],
      "type": "file"
    }),
    new Field({
      "autogeneratePattern": "",
      "help": "",
      "hidden": false,
      "id": "text6019384752",
      "max": 0,
      "min": 0,
      "name": "copyright_holder",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "bool7120495863",
      "name": "show_powered_by",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "bool"
    }),
    new Field({
      "autogeneratePattern": "",
      "help": "",
      "hidden": false,
      "id": "text8231506974",
      "max": 0,
      "min": 0,
      "name": "primary_color",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }),
    new Field({
      "autogeneratePattern": "",
      "help": "",
      "hidden": false,
      "id": "text9342618085",
      "max": 0,
      "min": 0,
      "name": "id_format",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "number1053729196",
      "max": null,
      "min": 0,
      "name": "id_padding",
      "onlyInt": true,
      "presentable": false,
      "required": false,
      "system": false,
      "type": "number"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "bool2164830207",
      "name": "reservations_enabled",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "bool"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "bool3275941318",
      "name": "setup_complete",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "bool"
    }),
    new Field({
      "help": "",
      "hidden": false,
      "id": "json4386729150",
      "maxSize": 2000000,
      "name": "opening_hours",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "json"
    }),
    new Field({
      "hidden": false,
      "id": "autodate2990389176",
      "name": "created",
      "onCreate": true,
      "onUpdate": false,
      "presentable": false,
      "system": false,
      "type": "autodate"
    }),
    new Field({
      "hidden": false,
      "id": "autodate3332085495",
      "name": "updated",
      "onCreate": true,
      "onUpdate": true,
      "presentable": false,
      "system": false,
      "type": "autodate"
    }),
  ]

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("settings")
  return app.delete(collection)
})
