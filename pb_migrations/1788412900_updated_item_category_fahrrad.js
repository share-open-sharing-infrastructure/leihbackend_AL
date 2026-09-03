/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_940982958")

  // update field — add "Fahrrad" to category select values
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 8,
    "name": "category",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Freizeit",
      "Garten",
      "Haushalt",
      "Heimwerken",
      "Kinder",
      "Küche",
      "Sonstige",
      "Fahrrad"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_940982958")

  // revert — remove "Fahrrad" from category select values
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 7,
    "name": "category",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "Freizeit",
      "Garten",
      "Haushalt",
      "Heimwerken",
      "Kinder",
      "Küche",
      "Sonstige"
    ]
  }))

  return app.save(collection)
})
