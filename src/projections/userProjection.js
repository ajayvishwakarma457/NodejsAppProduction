const UserReadView = require('../models/userReadViewModel');
const EventStore = require('../models/eventStoreModel');
const logger = require('../utils/logger');

const userProjection = {
  /**
   * Projects a single event onto the denormalized read model
   * @param {Object} event - Event record from EventStore
   */
  handleEvent: async (event) => {
    const { aggregateId, eventType, eventData, version } = event;

    logger.debug(`[Projection] Projecting event "${eventType}" (v${version}) for aggregate: ${aggregateId}`);

    switch (eventType) {
      case 'USER_CREATED': {
        await UserReadView.create({
          _id: aggregateId,
          name: eventData.name,
          email: eventData.email,
          role: eventData.role || 'user',
          status: eventData.status || 'active',
          version,
          isDeleted: false,
          lastUpdated: event.timestamp,
        });
        break;
      }

      case 'USER_UPDATED': {
        // Find existing read view. Ensure version increments exactly by 1 (or is greater) to avoid out-of-order writes
        const result = await UserReadView.findOneAndUpdate(
          { _id: aggregateId, version: { $lt: version } },
          {
            $set: {
              name: eventData.name,
              email: eventData.email,
              role: eventData.role,
              status: eventData.status,
              version,
              lastUpdated: event.timestamp,
            },
          },
          { new: true }
        );
        if (!result) {
          logger.warn(`[Projection] Version mismatch or missing aggregate for update. AggregateId: ${aggregateId}, version: ${version}`);
        }
        break;
      }

      case 'USER_DELETED': {
        await UserReadView.findOneAndUpdate(
          { _id: aggregateId, version: { $lt: version } },
          {
            $set: {
              isDeleted: true,
              version,
              lastUpdated: event.timestamp,
            },
          }
        );
        break;
      }

      default:
        logger.warn(`[Projection] Unhandled event type: ${eventType}`);
    }
  },

  /**
   * Replays all events for a specific user to rebuild their read model state from scratch
   * @param {string} aggregateId - Aggregate ID (UserId)
   */
  replayEvents: async (aggregateId) => {
    logger.info(`[Projection] Replaying events for user aggregate: ${aggregateId}`);

    // 1. Fetch all events sorted by version ascending
    const events = await EventStore.find({ aggregateId }).sort({ version: 1 });

    if (events.length === 0) {
      throw new Error(`No events found for aggregate ID: ${aggregateId}`);
    }

    // 2. Rebuild state by iterating through events
    let state = {};
    for (const event of events) {
      const { eventType, eventData, version } = event;
      if (eventType === 'USER_CREATED') {
        state = {
          _id: aggregateId,
          name: eventData.name,
          email: eventData.email,
          role: eventData.role || 'user',
          status: eventData.status || 'active',
          version,
          isDeleted: false,
          lastUpdated: event.timestamp,
        };
      } else if (eventType === 'USER_UPDATED') {
        state = {
          ...state,
          name: eventData.name || state.name,
          email: eventData.email || state.email,
          role: eventData.role || state.role,
          status: eventData.status || state.status,
          version,
          lastUpdated: event.timestamp,
        };
      } else if (eventType === 'USER_DELETED') {
        state = {
          ...state,
          isDeleted: true,
          version,
          lastUpdated: event.timestamp,
        };
      }
    }

    // 3. Upsert the final computed state to the Read View database
    await UserReadView.findByIdAndUpdate(aggregateId, state, { upsert: true, new: true });
    logger.info(`[Projection] Successfully rebuilt read state for user: ${aggregateId} (Current Version: v${state.version})`);
    return state;
  }
};

module.exports = userProjection;
