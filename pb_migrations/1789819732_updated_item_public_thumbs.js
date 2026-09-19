/// <reference path="../pb_data/types.d.ts" />
// Enable server-side thumbnails on the public `item_public` view so the
// customer-facing app (llka-resomaker_AL) stops receiving multi-MB
// originals for every catalog tile.
//
// The `item` collection already defines the same thumbs
// (see 1770375472_updated_item_thumbs.js). Mirroring them on the view
// unblocks `?thumb=...` requests hitting /api/files/item_public/...
migrate((app) => {
  const collection = app.findCollectionByNameOrId("item_public")
  const field = collection.fields.getByName("images")
  field.thumbs = ["40x40f", "80x80f", "200x200f", "512x512f"]
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("item_public")
  const field = collection.fields.getByName("images")
  field.thumbs = []
  return app.save(collection)
})
