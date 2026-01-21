/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2990107169")

  // update createRule to allow all
  collection.createRule = ""

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2990107169")

  // revert createRule to null (no access)
  collection.createRule = null

  return app.save(collection)
})
