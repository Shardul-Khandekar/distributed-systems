from tasks import long_running_task

# Send a task to the worker and continue with the main flow
result = long_running_task.delay("Report Generation")

print("The frontend can take other report")
print(f"Task ID: {result.id}")
print("Other parameters for the report are being processed")