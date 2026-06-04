# MongoDB Aggregation Pipelines (Mongoose)

This document describes how to implement reporting and statistics using MongoDB's aggregation framework inside a Mongoose/Express setup.

---

## 1. Aggregation Pipeline Design

We implemented a dashboard stats endpoint to aggregate users by role and month using Mongoose's `aggregate` framework inside [src/controllers/v1/userController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/userController.js).

### Pipeline Controller Code
```javascript
getUserStats: async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      // Multi-facet aggregation to gather different shapes of data in a single query
      {
        $facet: {
          totalUsers: [
            { $count: 'count' }
          ],
          byRole: [
            {
              $group: {
                _id: '$role',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } }
          ],
          byMonth: [
            {
              $group: {
                _id: {
                  month: { $month: '$createdAt' },
                  year: { $year: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
          ]
        }
      },
      // Projection stage to reshape and clean up output format
      {
        $project: {
          totalUsers: { $arrayElemAt: ['$totalUsers.count', 0] },
          byRole: 1,
          byMonth: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: stats[0] || { totalUsers: 0, byRole: [], byMonth: [] }
    });
  } catch (err) {
    next(err);
  }
}
```

---

## 2. Endpoint Setup

The route is mounted in [src/routes/v1/userRoutes.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/routes/v1/userRoutes.js). It is protected and restricted only to `admin` users:

```javascript
router.get('/stats', restrictTo('admin'), UserController.getUserStats);
```

---

## 3. Verification & Response

Calling `GET /api/v1/users/stats` as an admin returns the computed statistics:

```json
{
  "status": "success",
  "data": {
    "byRole": [
      {
        "_id": "user",
        "count": 2
      },
      {
        "_id": "admin",
        "count": 1
      },
      {
        "_id": "moderator",
        "count": 1
      }
    ],
    "byMonth": [
      {
        "_id": {
          "month": 6,
          "year": 2026
        },
        "count": 4
      }
    ],
    "totalUsers": 4
  }
}
```
This confirms that the multi-stage aggregation pipeline behaves correctly, outputting formatted stats within a single database request.
