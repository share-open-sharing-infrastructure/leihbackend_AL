/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2990107169")

  // add field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "json_requested_copies",
    "maxSize": 0,
    "name": "requested_copies",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2990107169")

  collection.fields.removeById("json_requested_copies")

  return app.save(collection)
})
