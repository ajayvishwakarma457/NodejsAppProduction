# Cache-aside Pattern

This document describes the design and implementation of the **Cache-aside** (or Lazy Loading) caching pattern in our application APIs.

---

## 1. Flow of Cache-aside Pattern

The Cache-aside pattern isolates database logic from caching logic. The application code manages the cache directly.

### A. Read Operation (Lazy Loading)
```
          [ Read Request ]
                 |
                 v
         /---------------\
        /  Is the data    \    Yes (Cache Hit)
       <  in the cache?    > -----------------> [ Return Data ]
        \                 /
         \---------------/
                 | No (Cache Miss)
                 v
       [ Query MongoDB ]
                 |
                 v
      [ Save Data to Redis ]
                 |
                 v
           [ Return Data ]
```

### B. Write / Update / Delete Operation (Cache Invalidation)
When updating or deleting database records, we immediately delete the cache key. This ensures subsequent reads retrieve fresh data from the database, preventing stale cache data.

---

## 2. Implementation in UserController

We refactored the CRUD handlers in [src/controllers/v1/userController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/userController.js) to enforce Cache-aside.

### Read User (`getUserById`)
```javascript
getUserById: async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `user_cache:${id}`;

    // 1. Try fetching from Redis cache
    const cachedUser = await redisClient.get(cacheKey);
    if (cachedUser) {
      console.log(`[Cache-aside] Cache HIT for user:${id}`);
      return res.json(JSON.parse(cachedUser));
    }

    console.log(`[Cache-aside] Cache MISS for user:${id}. Querying database...`);
    
    // 2. Query database on Cache Miss
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError(`User with ID ${id} not found`, 404));
    }

    // 3. Save to Redis cache with a 1-hour TTL (3600 seconds)
    await redisClient.set(cacheKey, JSON.stringify(user), 'EX', 3600);

    res.json(user);
  } catch (err) {
    next(err);
  }
}
```

### Update User (`updateUser`)
```javascript
updateUser: async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    
    if (!updatedUser) {
      return next(new AppError(`User with ID ${id} not found to update`, 404));
    }

    // Invalidate cache on update
    const cacheKey = `user_cache:${id}`;
    await redisClient.del(cacheKey);
    console.log(`[Cache-aside] Cache invalidated for user:${id} on update.`);

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
}
```

---

## 3. Verification

Checking the server execution logs when making consecutive API calls:

1. **First Read (Cache Miss)**:
   * **API call**: `GET /api/v1/users/6a2179afaab6dde6852e073e`
   * **Console Log**: `[Cache-aside] Cache MISS for user:6a2179afaab6dde6852e073e. Querying database...`
2. **Second Read (Cache Hit)**:
   * **API call**: `GET /api/v1/users/6a2179afaab6dde6852e073e`
   * **Console Log**: `[Cache-aside] Cache HIT for user:6a2179afaab6dde6852e073e`
3. **Update (Cache Invalidation)**:
   * **API call**: `PUT /api/v1/users/6a2179afaab6dde6852e073e` with `{"name":"Admin User Updated"}`
   * **Console Log**: `[Cache-aside] Cache invalidated for user:6a2179afaab6dde6852e073e on update.`
4. **Third Read (Cache Miss)**:
   * **API call**: `GET /api/v1/users/6a2179afaab6dde6852e073e`
   * **Console Log**: `[Cache-aside] Cache MISS for user:6a2179afaab6dde6852e073e. Querying database...` (returns updated data)
