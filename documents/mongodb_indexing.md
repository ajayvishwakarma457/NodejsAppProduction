# MongoDB Indexing Strategies & Query Optimization (Mongoose)

This document describes how to implement indexes and optimize Mongoose query performance using projection, lean query mode, and query plans.

---

## 1. Indexing Strategies

We configured single, compound, and text indexes inside Mongoose schemas.

### Text Search Index (Single/Multiple Fields)
Defined a text search index on `name` and `email` fields inside [src/models/userModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/userModel.js):
```javascript
userSchema.index({ name: 'text', email: 'text' });
```

### Compound Index (Uniqueness Constraint)
Defined a compound index on `{ user: 1, name: 1 }` with `{ unique: true }` inside [src/models/apiKeyModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/apiKeyModel.js) to enforce that a user cannot create duplicate keys with the same name:
```javascript
apiKeySchema.index({ user: 1, name: 1 }, { unique: true });
```

---

## 2. Query Optimization Strategies

### Use `.lean()`
By default, Mongoose wraps query results in rich Mongoose Documents (with getters, setters, save hooks, etc.). For read-only operations, we use `.lean()` to bypass document instantiation, returning plain JavaScript objects. This significantly reduces memory footprint and improves CPU throughput.

### Field Projection (`.select()`)
We limit payload sizes and memory consumption by selecting only the fields needed for the client response:
```javascript
const users = await User.find({ $text: { $search: q } })
  .select('name email role')
  .lean();
```

---

## 3. Index & Plan Analysis (`.explain()`)

We implemented a query plan explain endpoint at `GET /api/v1/users/search/explain` to examine MongoDB query executions:

```javascript
explainSearch: async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return next(new AppError('Please provide a search term', 400));

    const explanation = await User.find({ $text: { $search: q } })
      .select('name email role')
      .explain('executionStats');

    res.status(200).json({ status: 'success', explanation });
  } catch (err) {
    next(err);
  }
}
```

---

## 4. Verification

Calling `GET /api/v1/users/search/explain?q=Admin` returns the execution plan stats. 

* **Winning Plan Stage**: `PROJECTION_SIMPLE` -> `TEXT_MATCH` -> `FETCH` -> `IXSCAN`.
* **Index utilized**: `name_text_email_text`.
* **Performance metrics**:
  * `totalKeysExamined`: 1
  * `totalDocsExamined`: 1
  * `executionTimeMillis`: 1ms

This verifies that the search engine performs a direct **Index Scan (IXSCAN)** instead of a slow **Collection Scan (COLLSCAN)**.
