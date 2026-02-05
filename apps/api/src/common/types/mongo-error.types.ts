export const MONGO_DUPLICATE_KEY_CODE = 11000;

export interface MongoDuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

export function isMongoDuplicateKeyError(
  err: unknown,
): err is MongoDuplicateKeyError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as MongoDuplicateKeyError).code === MONGO_DUPLICATE_KEY_CODE
  );
}

export interface MongooseCastError {
  name: string;
}

export function isMongooseCastError(err: unknown): err is MongooseCastError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as MongooseCastError).name === 'CastError'
  );
}
