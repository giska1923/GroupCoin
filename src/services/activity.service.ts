import { Transaction } from 'sequelize';
import { ActivityDTO, ActivityPageDTO } from '../dtos/response';
import { UserDTO } from '../dtos/response';
import { Activity, User } from '../models';
import { ActivityTypeValue } from '../types';
import { mapToClass } from '../utils/validation/class-mapper';
import { assertMember, loadGroupOr404 } from './group-access.service';

interface RecordActivityInput {
  type: ActivityTypeValue;
  actorId: string;
  groupId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  transaction?: Transaction;
}

interface ListGroupActivityInput {
  actorId: string;
  groupId: string;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toActivityDTO = (activity: Activity, actor?: User | null): ActivityDTO => {
  const dto = mapToClass(activity, ActivityDTO);
  if (actor) {
    dto.actor = mapToClass(actor, UserDTO);
  }
  return dto;
};

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

  /**
   * Paginated activity log for a single group, newest first. Hydrates each
   * row with the actor's `UserDTO` so the UI can render the feed without
   * an extra round-trip per row.
   */
  async listGroupActivity(
    input: ListGroupActivityInput,
  ): Promise<ActivityPageDTO> {
    await loadGroupOr404(input.groupId);
    await assertMember(input.groupId, input.actorId);

    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = input.offset ?? 0;

    const { rows, count } = await Activity.findAndCountAll({
      where: { groupId: input.groupId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const actorIds = Array.from(new Set(rows.map(r => r.actorId)));
    const actors = actorIds.length
      ? await User.findAll({ where: { id: actorIds } })
      : [];
    const actorById = new Map(actors.map(u => [u.id, u]));

    return mapToClass(
      {
        items: rows.map(r => toActivityDTO(r, actorById.get(r.actorId))),
        total: count,
        limit,
        offset,
      },
      ActivityPageDTO,
    );
  },
};

export default ActivityService;
