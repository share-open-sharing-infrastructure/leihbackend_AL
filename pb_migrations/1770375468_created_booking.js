/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
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
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_940982958",
        "hidden": false,
        "id": "relation_booking_item",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "item",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_108570809",
        "hidden": false,
        "id": "relation_booking_customer",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "customer",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_booking_customer_name",
        "max": 0,
        "min": 0,
        "name": "customer_name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_booking_customer_phone",
        "max": 0,
        "min": 0,
        "name": "customer_phone",
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
        "id": "email_booking_customer_email",
        "max": 0,
        "min": 0,
        "name": "customer_email",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "date_booking_start",
        "max": "",
        "min": "",
        "name": "start_date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date_booking_end",
        "max": "",
        "min": "",
        "name": "end_date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "select_booking_status",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "reserved",
          "active",
          "returned",
          "overdue"
        ]
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_booking_notes",
        "max": 0,
        "min": 0,
        "name": "notes",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_booking",
    "indexes": [
      "CREATE INDEX `idx_booking_overlap` ON `booking` (`item`, `status`, `start_date`, `end_date`)",
      "CREATE INDEX `idx_booking_status` ON `booking` (`status`)",
      "CREATE INDEX `idx_booking_end_status` ON `booking` (`end_date`, `status`)"
    ],
    "listRule": null,
    "name": "booking",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_booking");

  return app.delete(collection);
})
