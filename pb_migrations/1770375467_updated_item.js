/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_940982958")

  // add field
  collection.fields.addAt(20, new Field({
    "hidden": false,
    "id": "bool1803945437",
    "name": "is_protected",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_940982958")

  // remove field
  collection.fields.removeById("bool1803945437")

  return app.save(collection)
})
