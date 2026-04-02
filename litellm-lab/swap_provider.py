import os
from dotenv import load_dotenv
import litellm
from litellm import completion_cost

load_dotenv()

message = [{"role": "user", "content": "What is the capital of Japan?"}]

# OpenAI call
response_openai = litellm.completion(
    model="gpt-4o-mini",
    messages=message
)

# Gemini call
response_gemini = litellm.completion(
    model="gemini/gemini-2.0-flash", 
    messages=message
)

cost_openai = completion_cost(completion_response=response_openai)
cost_gemini = completion_cost(completion_response=response_gemini)

print("OpenAI response:")
print(response_openai)
print(f"Tokens: {response_openai.usage.total_tokens}")
print(f"Cost: ${cost_openai:.6f}")

print("\nGemini response:")
print(response_gemini)
print(f"Tokens: {response_gemini.usage.total_tokens}")
print(f"Cost: ${cost_gemini:.6f}")