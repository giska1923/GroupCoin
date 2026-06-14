import { CreateFeedbackDTO } from '../dtos/request';
import { FeedbackDTO } from '../dtos/response';
import { Feedback } from '../models';
import { mapToClass } from '../utils/validation/class-mapper';

const FeedbackService = {
  async submit(userId: string, dto: CreateFeedbackDTO): Promise<FeedbackDTO> {
    const feedback = await Feedback.create({
      userId,
      topic: dto.topic,
      message: dto.message,
    });

    return mapToClass(feedback, FeedbackDTO);
  },
};

export default FeedbackService;
