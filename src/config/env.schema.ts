import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default('VYTA API'),
  APP_URL: Joi.string().uri().required(),
  CORS_ORIGIN: Joi.string().required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().required(),
  JWT_REFRESH_TTL: Joi.string().required(),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  STORAGE_DRIVER: Joi.string().valid('s3', 'local', 'noop').default('s3'),
  S3_ENDPOINT: Joi.string().allow('').default(''),
  S3_REGION: Joi.string().allow('').default(''),
  S3_BUCKET: Joi.string().allow('').default(''),
  S3_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  S3_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  RESEND_API_KEY: Joi.string().allow('').default(''),
  SUPPORT_TO_EMAIL: Joi.string().email({ tlds: false }).allow('').default(''),
  SUPPORT_FROM_EMAIL: Joi.string().email({ tlds: false }).allow('').default(''),
});
