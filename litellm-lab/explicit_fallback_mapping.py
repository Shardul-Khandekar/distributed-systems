import os
from dotenv import load_dotenv
from litellm import Router

load_dotenv()

# Routing table
model_list = [
    {
        "model_name": "open-ai-gpt",                        # Internal alias
        "litellm_params": {
            "model": "gpt-4o-mini",                         # Provider-specific model name
            "api_key": os.getenv("OPENAI_API_KEY1"),        # API key that fails
        },
    },
    {
        "model_name": "open-ai-gpt-fallback",
        "litellm_params": {
            "model": "gpt-3.5-turbo",
            "api_key": os.getenv("OPENAI_API_KEY"),
        },
    },
]

router = Router(
    model_list=model_list,
    fallbacks=[{"open-ai-gpt": ["open-ai-gpt-fallback"]}],  # If "open-ai-gpt" fails, try "open-ai-gpt-fallback"
    num_retries=2,                                          # Number of retries before moving to the next fallback
)

response = router.completion(
    model="open-ai-gpt",
    messages=[{"role": "user", "content": "What is a fallback chain?"}],
)

print("Response:")
print(response)