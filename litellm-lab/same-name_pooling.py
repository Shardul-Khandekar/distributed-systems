import os
from dotenv import load_dotenv
from litellm import Router

load_dotenv()

# Routing table
model_list = [
    {
        "model_name": "open-ai-gpt",
        "litellm_params": {
            "model": "gpt-4o-mini",
            "api_key": os.getenv("OPENAI_API_KEY"),
        },
    },
    {
        "model_name": "open-ai-gpt",
        "litellm_params": {
            "model": "gpt-3.5-turbo",
            "api_key": os.getenv("OPENAI_API_KEY"),
        },
    },
]

# Same alias means litellm treats them as a same pool and the router treats them as interchangeable
# Same name pooling -> When the models are roughly interchangeable for your use case and you want automatic load balancing plus failover.
# Explicit fallback mapping with different aliases -> When there's a clear priority order and the models serve different quality tiers.

router = Router(
    model_list=model_list,
    fallbacks=[{"open-ai-gpt": ["open-ai-gpt"]}],
    num_retries=2,
)

# Routers default behavior is usage-based, it favours model with the lowest token processed

response = router.completion(
    model="open-ai-gpt",
    messages=[{"role": "user", "content": "What is a fallback chain?"}],
)

print("Response:")
print(response)