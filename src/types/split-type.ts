import { SplitType } from '../constants';

export type SplitTypeValue = (typeof SplitType)[keyof typeof SplitType];
