/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_940982958")

  // add field
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "number4088614019",
    "max": null,
    "min": null,
    "name": "msrp",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_940982958")

  // remove field
  collection.fields.removeById("number4088614019")

  return app.save(collection)
})
