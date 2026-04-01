import os
from dotenv import load_dotenv
import litellm

load_dotenv()

response = litellm.completion(
    model="gpt-4o-mini",
    messages=[
        {"role": "user", "content": "What is LiteLLM in one sentence?"}
    ]
)

print(type(response))
print(response)
# print(response.choices[0].message.content)