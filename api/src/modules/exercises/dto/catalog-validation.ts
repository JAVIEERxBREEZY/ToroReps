import { Transform } from 'class-transformer';
import { registerDecorator } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

export function TrimString(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

export function isCloudinaryPublicId(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== value.trim() ||
    /[?&#\\%<>]/.test(value) ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) ||
    value.includes('://') ||
    /^[a-z]:\//i.test(value)
  ) {
    return false;
  }

  const segments = value.split('/');
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        /^v\d+$/.test(segment),
    )
  ) {
    return false;
  }

  try {
    encodeURIComponent(value);
    return true;
  } catch {
    return false;
  }
}

export function IsCloudinaryPublicId(
  options?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isCloudinaryPublicId',
      target: object.constructor,
      propertyName: String(propertyName),
      options,
      validator: {
        validate: isCloudinaryPublicId,
        defaultMessage: () =>
          'cloudinaryPublicId debe ser un public_id válido, no una URL ni una ruta local.',
      },
    });
  };
}

export function IsCloudinaryVersion(): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      name: 'isCloudinaryVersion',
      target: object.constructor,
      propertyName: String(propertyName),
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          /^[1-9]\d{0,18}$/.test(value) &&
          BigInt(value) <= 9_223_372_036_854_775_807n,
        defaultMessage: () =>
          'cloudinaryVersion debe ser un entero positivo de 64 bits enviado como texto decimal.',
      },
    });
  };
}
