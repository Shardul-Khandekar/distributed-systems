import os
from dotenv import load_dotenv
import litellm

load_dotenv()

def custom_logger(kwargs, response, start_time, end_time):
    duration = (end_time - start_time).total_seconds()
    cost = litellm.completion_cost(completion_response=response)
    print(f"\n--- Call Log ---")
    print(f"Model:    {response.model}")
    print(f"Tokens:   {response.usage.total_tokens}")
    print(f"Cost:     ${cost:.6f}")
    print(f"Latency:  {duration:.2f}s")
    print(f"----------------")

litellm.success_callback = [custom_logger]

prompts = [
    "What is Python?",
    "Explain Docker in one sentence.",
    "What does an API gateway do?",
]

for prompt in prompts:
    response = litellm.completion(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    print(f"Answer: {response.choices[0].message.content}\n")