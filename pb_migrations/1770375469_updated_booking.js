/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_booking")

  // add field
  collection.fields.addAt(10, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_554352435",
    "hidden": false,
    "id": "relation_booking_rental",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "associated_rental",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_booking")

  // remove field
  collection.fields.removeById("relation_booking_rental")

  return app.save(collection)
})
