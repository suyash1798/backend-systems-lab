const tokenBucketLua = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local bucket = redis.call("HMGET", key, "tokens", "updatedAt")
local tokens = tonumber(bucket[1])
local updated_at = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  updated_at = now
end

local elapsed = math.max(0, now - updated_at)
local refill = elapsed * refill_rate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
local retry_after = 0

if tokens >= requested then
  allowed = 1
  tokens = tokens - requested
else
  retry_after = math.ceil((requested - tokens) / refill_rate)
end

redis.call("HMSET", key, "tokens", tokens, "updatedAt", now)
redis.call("EXPIRE", key, ttl)

return { allowed, math.floor(tokens), retry_after }
`;

export default tokenBucketLua;
