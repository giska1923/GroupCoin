/* eslint-disable @typescript-eslint/no-explicit-any */
import { plainToInstance } from 'class-transformer';

type ClassType<T> = new (...args: any[]) => T;

// TODO: Implement recursion to support nested classes
export const mapToClass = <T>(obj: any, toClass: ClassType<T>): T => {
  const mappedObj = plainToInstance(toClass, obj, {
    excludeExtraneousValues: true,
  });
  console.log(mappedObj);
  return mappedObj;
};
