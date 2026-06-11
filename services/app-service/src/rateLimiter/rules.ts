import { RateLimitRule } from './RateLimiter';

export const normalApiRule: RateLimitRule = {
  name: 'normal-api',
  capacity: 100,
  refillPerSecond: 100 / 60,
  ttlSeconds: 120
};

export const otpApiRule: RateLimitRule = {
  name: 'otp-api',
  capacity: 5,
  refillPerSecond: 5 / 60,
  ttlSeconds: 120
};
