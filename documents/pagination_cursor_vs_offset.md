# Pagination: Cursor-Based vs Offset-Based

This document details the configuration, difference comparison, database logic, and API schema design for implementing both **Offset-Based** and **Cursor-Based** pagination in our Node.js production application.

---

## 1. Architectural Comparison

Production APIs with growing database sets use pagination to limit resource overhead and response payloads. We support two distinct patterns:

| Criteria | Offset-Based Pagination | Cursor-Based Pagination (Keyset) |
| :--- | :--- | :--- |
| **API Parameters** | `page` (number), `limit` (size) | `cursor` (unique ID/token), `limit` (size) |
| **Database Query** | `.skip(skip).limit(limit)` | `.find({ _id: { $gt: cursor } }).limit(limit)` |
| **Scale Performance** | **O(N)**. Database scans all rows up to the skipped count before returning page results. Performance degrades on high page values. | **O(log N)**. Uses database indexes directly to jump to the cursor offset. Fast and constant performance at scale. |
| **Real-time Drift** | **Prone to drift**. Inserting or deleting items during user paging shifts lists, causing items to be skipped or repeated. | **Stable**. Items are anchored to the unique cursor token. No duplicated items on list shifts. |
| **Use Cases** | Traditional desktop tables where users expect exact page jumping (e.g. "Go to Page 14"). | Endless-scrolling interfaces, high-write streams (e.g. chats, social feeds, event logs). |

---

## 2. API Design & Implementation

We refactored [userController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/userController.js) inside the `getUsers` method to dynamically handle both pagination models.

### A. Offset-Based Routine (Default)
Executes a dual query path via `Promise.all` to fetch matching rows and total counts:
```javascript
const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
const skip = (parsedPage - 1) * parsedLimit;

const [users, totalCount] = await Promise.all([
  User.find(query).sort({ _id: 1 }).skip(skip).limit(parsedLimit).lean(),
  User.countDocuments(query),
]);
```
**Response Envelope**:
```json
{
  "status": "success",
  "pagination": {
    "type": "offset",
    "page": 1,
    "limit": 10,
    "totalCount": 234,
    "totalPages": 24,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "results": 10,
  "data": [...]
}
```

### B. Cursor-Based Routine
Uses the `limit + 1` query trick to identify pagination status efficiently without running expensive `countDocuments()` scans:
```javascript
let cursorQuery = {};
if (cursor) {
  cursorQuery._id = { $gt: cursor }; // Sort ascending by MongoDB ObjectId
}

// Fetch limit + 1 items
const users = await User.find(cursorQuery)
  .sort({ _id: 1 })
  .limit(parsedLimit + 1)
  .lean();

const hasNextPage = users.length > parsedLimit;
if (hasNextPage) {
  users.pop(); // Remove the extra check-record from output payload
}
const nextCursor = hasNextPage ? users[users.length - 1]._id : null;
```
**Response Envelope**:
```json
{
  "status": "success",
  "pagination": {
    "type": "cursor",
    "limit": 10,
    "nextCursor": "603d6d5ef6e5223f00abc124",
    "hasNextPage": true
  },
  "results": 10,
  "data": [...]
}
```

---

## 3. Integration Testing

We extended our integration tests in [userIntegration.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/integration/userIntegration.test.js) to assert metadata schemas:
* **Offset asserts**: Validates default routing returns standard page counts and total record metrics.
* **Cursor asserts**: Confirms that request parameters (`type=cursor`) return expected key pointers (`nextCursor`, `hasNextPage`) and clean data blocks.
