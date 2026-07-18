/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1144690392")
  app.delete(collection)

  const newCollection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 0,
        "min": 0,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "_clone_SD7h",
        "max": null,
        "min": null,
        "name": "iid",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_FtEV",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "convertURLs": false,
        "hidden": false,
        "id": "_clone_yyIP",
        "maxSize": 0,
        "name": "description",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "editor"
      },
      {
        "hidden": false,
        "id": "_clone_8d9P",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "instock",
          "deleted",
          "outofstock",
          "onbackorder",
          "reserved",
          "lost",
          "repairing",
          "forsale"
        ]
      },
      {
        "hidden": false,
        "id": "_clone_PtjT",
        "max": null,
        "min": null,
        "name": "deposit",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "_clone_zsjn",
        "maxSelect": 99,
        "maxSize": 20000000,
        "mimeTypes": [
          "image/png",
          "image/jpeg",
          "image/webp"
        ],
        "name": "images",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [],
        "type": "file"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_synonyms",
        "max": 0,
        "min": 0,
        "name": "synonyms",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_3eV8",
        "max": 0,
        "min": 0,
        "name": "category",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_1q1g",
        "max": 0,
        "min": 0,
        "name": "brand",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_qz4f",
        "max": 0,
        "min": 0,
        "name": "model",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_DHSQ",
        "max": 0,
        "min": 0,
        "name": "packaging",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_IPnN",
        "max": 0,
        "min": 0,
        "name": "manual",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "_clone_QXkL",
        "max": null,
        "min": null,
        "name": "parts",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "_clone_W4qW",
        "max": null,
        "min": null,
        "name": "copies",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "_clone_1Z4w",
        "max": "",
        "min": "",
        "name": "added_on",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "_clone_is_protected",
        "name": "is_protected",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "_computed_available_copies",
        "max": null,
        "min": null,
        "name": "available_copies",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_1144690392",
    "indexes": [],
    "listRule": "",
    "name": "item_public",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT item.id, item.iid, item.name, item.description, item.status, item.deposit, item.images, item.synonyms, item.category, item.brand, item.model, item.packaging, item.manual, item.parts, item.copies, item.added_on, item.is_protected, (item.copies - COALESCE((SELECT SUM(COALESCE((SELECT CAST(jrc.value AS INTEGER) FROM json_each(r.requested_copies) jrc WHERE jrc.key = item.id LIMIT 1), 1)) FROM reservation r WHERE r.done = 0 AND EXISTS (SELECT 1 FROM json_each(r.items) ji WHERE ji.value = item.id)), 0) - COALESCE((SELECT SUM(COALESCE((SELECT CAST(jrn.value AS INTEGER) FROM json_each(rn.requested_copies) jrn WHERE jrn.key = item.id LIMIT 1), 1)) FROM rental rn WHERE (rn.returned_on = '' OR rn.returned_on IS NULL) AND EXISTS (SELECT 1 FROM json_each(rn.items) ji WHERE ji.value = item.id)), 0)) AS available_copies FROM item WHERE item.status != 'deleted'",
    "viewRule": ""
  })

  return app.save(newCollection)
}, (app) => {
  // revert: restore the previous (broken json_extract) version from migration 1783200001
  const collection = app.findCollectionByNameOrId("pbc_1144690392")
  app.delete(collection)

  const oldCollection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 0,
        "min": 0,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "_clone_SD7h",
        "max": null,
        "min": null,
        "name": "iid",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_FtEV",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "convertURLs": false,
        "hidden": false,
        "id": "_clone_yyIP",
        "maxSize": 0,
        "name": "description",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "editor"
      },
      {
        "hidden": false,
        "id": "_clone_8d9P",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "instock",
          "deleted",
          "outofstock",
          "onbackorder",
          "reserved",
          "lost",
          "repairing",
          "forsale"
        ]
      },
      {
        "hidden": false,
        "id": "_clone_PtjT",
        "max": null,
        "min": null,
        "name": "deposit",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "_clone_zsjn",
        "maxSelect": 99,
        "maxSize": 20000000,
        "mimeTypes": [
          "image/png",
          "image/jpeg",
          "image/webp"
        ],
        "name": "images",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [],
        "type": "file"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_synonyms",
        "max": 0,
        "min": 0,
        "name": "synonyms",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_3eV8",
        "max": 0,
        "min": 0,
        "name": "category",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_1q1g",
        "max": 0,
        "min": 0,
        "name": "brand",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_qz4f",
        "max": 0,
        "min": 0,
        "name": "model",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_DHSQ",
        "max": 0,
        "min": 0,
        "name": "packaging",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "_clone_IPnN",
        "max": 0,
        "min": 0,
        "name": "manual",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "_clone_QXkL",
        "max": null,
        "min": null,
        "name": "parts",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "_clone_W4qW",
        "max": null,
        "min": null,
        "name": "copies",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "_clone_1Z4w",
        "max": "",
        "min": "",
        "name": "added_on",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "_clone_is_protected",
        "name": "is_protected",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "_computed_available_copies",
        "max": null,
        "min": null,
        "name": "available_copies",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_1144690392",
    "indexes": [],
    "listRule": "",
    "name": "item_public",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "SELECT item.id, item.iid, item.name, item.description, item.status, item.deposit, item.images, item.synonyms, item.category, item.brand, item.model, item.packaging, item.manual, item.parts, item.copies, item.added_on, item.is_protected, (item.copies - COALESCE((SELECT SUM(COALESCE(CAST(json_extract(r.requested_copies, '$[\"' || item.id || '\"]') AS INTEGER), 1)) FROM reservation r WHERE r.done = 0 AND EXISTS (SELECT 1 FROM json_each(r.items) je WHERE je.value = item.id)), 0) - COALESCE((SELECT SUM(COALESCE(CAST(json_extract(rn.requested_copies, '$[\"' || item.id || '\"]') AS INTEGER), 1)) FROM rental rn WHERE (rn.returned_on = '' OR rn.returned_on IS NULL) AND EXISTS (SELECT 1 FROM json_each(rn.items) je WHERE je.value = item.id)), 0)) AS available_copies FROM item WHERE item.status != 'deleted'",
    "viewRule": ""
  })

  return app.save(oldCollection)
})
