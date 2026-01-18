# Define the work/task the worker will execute
from celery import Celery
import time

# 1. Create a Celery instance
app = Celery('tasks', broker='redis://localhost:6379/0')
# tasks is the name of the module
# broker refers to where the message queue is hosted

@app.task
def long_running_task(name):
    print(f"Starting long running task for {name}")
    time.sleep(10)
    return f"Finished long running task for {name}"

# To start the worker
# celery -A tasks worker --loglevel=info
# -A tasks -> Looks for Celery instance in tasks.py
# worker -> Starts the worker process
# --loglevel=info -> Shows info level logs in the console