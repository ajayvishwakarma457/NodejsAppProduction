const { addEmailJob } = require('../../queues/emailQueue');
const AppError = require('../../utils/AppError');

const JobController = {
  // POST /api/v1/jobs/trigger-email
  triggerEmail: async (req, res, next) => {
    try {
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return next(
          new AppError('Please provide email destination (to), subject, and body.', 400)
        );
      }

      // Add task to BullMQ queue
      const job = await addEmailJob(to, subject, body);

      res.status(202).json({
        status: 'success',
        message: 'Email job queued for background processing',
        job: {
          id: job.id,
          name: job.name,
          data: job.data,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = JobController;
