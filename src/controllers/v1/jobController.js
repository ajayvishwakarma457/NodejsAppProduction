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

  // POST /api/v1/jobs/heavy-cpu
  executeHeavyCpuTask: async (req, res, next) => {
    try {
      const { number } = req.body;
      if (number === undefined) {
        return next(new AppError('Please provide a "number" for the Fibonacci calculation.', 400));
      }

      const inputNumber = parseInt(number, 10);
      if (isNaN(inputNumber) || inputNumber < 0) {
        return next(new AppError('"number" must be a non-negative integer.', 400));
      }

      const runHeavyCpuTask = require('../../utils/workerRunner');
      const result = await runHeavyCpuTask(inputNumber);

      res.status(200).json({
        status: 'success',
        message: 'CPU-bound task processed successfully via Worker Thread',
        data: {
          input: inputNumber,
          result,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/jobs/heapdump
  triggerHeapdump: async (req, res, next) => {
    try {
      const { writeHeapSnapshot } = require('../../utils/heapdump');
      const snapshotInfo = await writeHeapSnapshot();

      res.status(200).json({
        status: 'success',
        message: 'V8 heap snapshot generated successfully',
        data: {
          filename: snapshotInfo.filename,
          filepath: snapshotInfo.filepath,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = JobController;

