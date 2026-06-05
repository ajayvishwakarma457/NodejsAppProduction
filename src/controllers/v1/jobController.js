const { addEmailJob } = require('../../queues/emailQueue');
const AppError = require('../../utils/AppError');

const JobController = {
  // POST /api/v1/jobs/trigger-email
  triggerEmail: async (req, res, next) => {
    try {
      const { to, subject, body, priority } = req.body;

      if (!to || !subject || !body) {
        return next(
          new AppError('Please provide email destination (to), subject, and body.', 400)
        );
      }

      // Convert priority to integer if provided (e.g. 1 = High, 2 = Medium, 3 = Low)
      const jobPriority = priority ? parseInt(priority, 10) : 3;

      if (isNaN(jobPriority) || jobPriority < 1 || jobPriority > 3) {
        return next(new AppError('Priority must be an integer between 1 (High) and 3 (Low).', 400));
      }

      // Add task to BullMQ queue
      const job = await addEmailJob(to, subject, body, jobPriority);

      res.status(202).json({
        status: 'success',
        message: `Email job (Priority: ${jobPriority}) queued for background processing`,
        job: {
          id: job.id,
          name: job.name,
          data: job.data,
          priority: jobPriority,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/jobs/failed
  getFailedJobs: async (req, res, next) => {
    try {
      const FailedJob = require('../../models/failedJobModel');
      const failed = await FailedJob.find().sort({ failedAt: -1 });

      res.status(200).json({
        status: 'success',
        results: failed.length,
        data: {
          failedJobs: failed,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = JobController;

