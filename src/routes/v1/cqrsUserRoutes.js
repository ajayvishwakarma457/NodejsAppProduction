const express = require('express');
const router = express.Router();
const cqrsUserController = require('../../controllers/v1/cqrsUserController');

// Query: Retrieve all users
router.get('/', cqrsUserController.getUsers);

// Query: Retrieve a specific user by ID
router.get('/:id', cqrsUserController.getUserById);

// Command: Create a new user
router.post('/', cqrsUserController.createUser);

// Command: Update user details (name, email, role, status) with expectedVersion OCC check
router.patch('/:id', cqrsUserController.updateUser);

// Command: Delete user with expectedVersion OCC check
router.delete('/:id', cqrsUserController.deleteUser);

// Command: Rebuild the read model by replaying the event store history for a user
router.post('/:id/replay', cqrsUserController.replayEvents);

module.exports = router;
