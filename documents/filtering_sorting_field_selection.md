# Filtering, Sorting, and Field Selection

This document describes the design conventions, database syntax, and implementation structure for **Filtering, Sorting, and Field Selection** inside our production Express APIs.

---

## 1. REST API Query Standard

To build flexible clients, endpoints returning arrays of data (e.g. `GET /api/v1/users`) support standard query operators:

* **Filtering**: Limit results matching criteria.
  * Simple matching: `GET /api/v1/users?role=admin`
  * Range matching (using bracket notation): `GET /api/v1/users?createdAt[gte]=2026-01-01`
* **Sorting**: Organize the order of returned payloads.
  * Ascending sort: `GET /api/v1/users?sort=name`
  * Descending sort: `GET /api/v1/users?sort=-createdAt`
  * Multi-field sort: `GET /api/v1/users?sort=-createdAt,name`
* **Field Selection (Limiting)**: Expose only requested fields to minimize network usage.
  * Explicit fields: `GET /api/v1/users?fields=name,email`

---

## 2. Implementation Logic

We implemented these options in [userController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/userController.js) dynamically mapping request parameters directly onto Mongoose query chains.

### A. Advanced Filtering Map
We clean the query parameter inputs by deleting pagination properties, then dynamically map logical comparison parameters (e.g. `gte`, `gt`, `lte`, `lt`) to MongoDB dollar-operators (`$gte`, `$gt`, etc.):

```javascript
const queryObj = { ...req.query };
const excludedFields = ['page', 'sort', 'limit', 'fields', 'cursor', 'type'];
excludedFields.forEach((el) => delete queryObj[el]);

let queryStr = JSON.stringify(queryObj);
queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
let filterQuery = JSON.parse(queryStr);
```

### B. Dynamic Sorting Map
We split comma-separated strings into standard space-separated properties and feed them into `.sort()`:
```javascript
let dbQuery = User.find(filterQuery);

if (req.query.sort) {
  const sortBy = req.query.sort.split(',').join(' ');
  dbQuery = dbQuery.sort(sortBy); // e.g. "-createdAt name"
} else {
  dbQuery = dbQuery.sort({ _id: 1 }); // default fallback sorting
}
```

### C. Field Limiting Map
We parse requested comma-separated values to select explicitly requested columns, reducing serialization times. By default, we exclude internal mongoose version properties (`-__v`):
```javascript
if (req.query.fields) {
  const fields = req.query.fields.split(',').join(' ');
  dbQuery = dbQuery.select(fields); // e.g. "name email"
} else {
  dbQuery = dbQuery.select('-__v'); // Exclude MongoDB internal versioning flag
}
```

---

## 3. Compatibility

These advanced filtering, sorting, and field-limiting operations are executed across both **Offset-Based** and **Cursor-Based** pagination routes, giving you a powerful, unified database execution model.
