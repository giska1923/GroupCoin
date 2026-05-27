import { Transaction } from 'sequelize';
import { Activity } from '../models';
import { ActivityTypeValue } from '../types';

interface RecordActivityInput {
  type: ActivityTypeValue;
  actorId: string;
  groupId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  transaction?: Transaction;
}

const ActivityService = {
  /**
   * Append a single activity row. Caller passes a `transaction` to bind the
   * activity log to the surrounding operation so it rolls back together if
   * anything fails.
   */
  async record(input: RecordActivityInput): Promise<Activity> {
    return Activity.create(
      {
        type: input.type,
        actorId: input.actorId,
        groupId: input.groupId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
      },
      { transaction: input.transaction },
    );
  },
};

export default ActivityService;
