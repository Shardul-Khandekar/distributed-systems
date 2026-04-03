import os
from dotenv import load_dotenv
import litellm

load_dotenv()

response = litellm.completion(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Explain what streaming means in LLM APIs in 3 sentences."}],
    stream=True,
)

for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end="", flush=True)

print()