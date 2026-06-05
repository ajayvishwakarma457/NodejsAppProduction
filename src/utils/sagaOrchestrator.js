const User = require('../models/userModel');
const { addEmailJob } = require('../queues/emailQueue');
const logger = require('./logger');

class SagaOrchestrator {
  /**
   * Run the User Onboarding Saga
   * @param {Object} userData - User registration properties (name, email, password)
   */
  static async runUserOnboarding(userData) {
    const steps = [];
    let createdUser = null;

    try {
      // Step 1: Create User in PENDING state
      logger.info(`[Saga] Step 1: Creating user in PENDING state for email ${userData.email}`);
      createdUser = await User.create({
        ...userData,
        status: 'pending',
      });
      steps.push({
        name: 'CREATE_USER',
        rollback: async () => {
          logger.warn(`[Saga Rollback] Deleting user ID ${createdUser._id} (email: ${userData.email}) due to downstream onboarding failure`);
          await User.findByIdAndDelete(createdUser._id);
        }
      });

      // Step 2: Dispatch welcome email job via BullMQ
      logger.info(`[Saga] Step 2: Enqueuing welcome email job for ${userData.email}`);
      
      // Simulate failure scenario for testing
      if (userData.email === 'trigger-saga-failure@example.com') {
        throw new Error('Simulated queue service down');
      }

      await addEmailJob(
        userData.email,
        'Welcome!',
        `Hi ${userData.name},\n\nWelcome to our platform!`,
        2 // Priority
      );
      
      steps.push({
        name: 'QUEUE_EMAIL',
        rollback: async () => {
          // BullMQ jobs once enqueued generally don't need deletion unless it's a critical saga requirement.
          logger.info(`[Saga Rollback] Email queued; no compensating rollback needed for BullMQ step.`);
        }
      });

      // Step 3: Commit User to ACTIVE state
      logger.info(`[Saga] Step 3: Committing user state to ACTIVE for user ID ${createdUser._id}`);
      createdUser.status = 'active';
      await createdUser.save();

      return {
        success: true,
        user: createdUser,
      };

    } catch (err) {
      logger.error(`[Saga Failed] Distributed transaction failed at step ${steps.length + 1}: ${err.message}. Initiating rollback...`);
      
      // Execute rollbacks in reverse order
      for (let i = steps.length - 1; i >= 0; i--) {
        try {
          await steps[i].rollback();
        } catch (rollbackErr) {
          logger.error(`[Saga Rollback Error] Failed to execute rollback for ${steps[i].name}: ${rollbackErr.message}`);
        }
      }

      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = SagaOrchestrator;
