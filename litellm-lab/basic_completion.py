import os
from dotenv import load_dotenv
import litellm
from litellm import completion_cost

load_dotenv()

response = litellm.completion(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "What is LiteLLM in one sentence?"}
    ]
)

# print(type(response))
print(response)
# print(response.choices[0].message.content)

cost = completion_cost(completion_response=response)
print(f"Tokens: {response.usage.total_tokens}")
print(f"Cost: ${cost:.6f}")