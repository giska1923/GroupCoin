import { Expose, Type } from 'class-transformer';
import { ActivityTypeValue } from '../../types';
import { UserDTO } from './user.dto';

export class ActivityDTO {
  @Expose() id!: string;
  @Expose() type!: ActivityTypeValue;
  @Expose() actorId!: string;
  @Expose() groupId!: string | null;
  @Expose() entityType!: string | null;
  @Expose() entityId!: string | null;
  @Expose() metadata!: Record<string, unknown>;
  @Expose() createdAt!: Date;

  @Expose()
  @Type(() => UserDTO)
  actor?: UserDTO;
}

export class ActivityPageDTO {
  @Expose()
  @Type(() => ActivityDTO)
  items!: ActivityDTO[];

  // Total matching rows (so the client can render "X of Y" or paginate).
  @Expose() total!: number;
  @Expose() limit!: number;
  @Expose() offset!: number;
}
