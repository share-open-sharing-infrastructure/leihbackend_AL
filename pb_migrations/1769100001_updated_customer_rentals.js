/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("customer_rentals")

  // delete the existing view
  app.delete(collection)

  // recreate with updated configuration
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
        "id": "json4038050209",
        "maxSize": 1,
        "name": "num_rentals",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "json2225521035",
        "maxSize": 1,
        "name": "num_active_rentals",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      }
    ],
    "id": "pbc_1931900333",
    "indexes": [],
    "listRule": null,
    "name": "customer_rentals",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "WITH customer_rentals AS (SELECT customer, count(*) AS num_rentals FROM rental GROUP BY customer), customer_rentals_active AS (SELECT customer, count(*) AS num_active_rentals FROM rental WHERE NOT returned_on GROUP BY customer) SELECT t1.customer AS id, num_rentals, coalesce(num_active_rentals, 0) AS num_active_rentals FROM customer_rentals t1 LEFT JOIN customer_rentals_active t2 ON t1.customer = t2.customer;",
    "viewRule": null
  })

  return app.save(newCollection)
}, (app) => {
  // revert to original view
  const collection = app.findCollectionByNameOrId("pbc_1931900333")
  app.delete(collection)

  const originalCollection = new Collection({
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
        "id": "json4038050209",
        "maxSize": 1,
        "name": "num_rentals",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "json2225521035",
        "maxSize": 1,
        "name": "num_active_rentals",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      }
    ],
    "id": "pbc_1931900333",
    "indexes": [],
    "listRule": null,
    "name": "customer_rentals",
    "system": false,
    "type": "view",
    "updateRule": null,
    "viewQuery": "with\ncustomer_rentals as (select customer, count(*) as num_rentals from rental group by customer),\ncustomer_rentals_active as (select customer, count(*) as num_active_rentals from rental where not returned_on group by customer)\nselect t1.customer as id, num_rentals, coalesce(num_active_rentals, 0) as num_active_rentals from customer_rentals t1 left join customer_rentals_active t2 on t1.customer = t2.customer;",
    "viewRule": null
  })

  return app.save(originalCollection)
})
