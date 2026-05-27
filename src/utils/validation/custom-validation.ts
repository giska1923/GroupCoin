/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  registerDecorator,
  ValidationOptions,
  // ValidationArguments,
} from 'class-validator';

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          // TODO?: add args [: ValidationArguments]
          const phoneRegex = /^\+?[1-9]\d{1,14}$/;
          return typeof value === 'string' && phoneRegex.test(value);
        },
        defaultMessage() {
          // TODO?: add args [: ValidationArguments]
          return 'Contact must be a valid phone number, starting with a "+" and followed by digits';
        },
      },
    });
  };
}
