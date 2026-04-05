import os
import time
from dotenv import load_dotenv
import litellm
from litellm import Cache

load_dotenv()

# Enable in-memory caching
litellm.cache = Cache(type="local")

messages = [{"role": "user", "content": "What is caching?"}]

start = time.time()
response_1 = litellm.completion(
    model="gpt-4o-mini",
    messages=messages,
    caching=True,
)
time_1 = time.time() - start

# When caching=True is passed to a completion call, LiteLLM hashes the request (model + messages + parameters) into a cache key.

# Second call with the same message
start = time.time()
response_2 = litellm.completion(
    model="gpt-4o-mini",
    messages=messages,
    caching=True,
)
time_2 = time.time() - start

print(f"First call:  {time_1:.2f}s — {response_1.choices[0].message.content[:80]}...")
print(f"Second call: {time_2:.2f}s — {response_2.choices[0].message.content[:80]}...")