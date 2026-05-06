# IMPORTANT
# This script needs an SFMC connection, I'm using a virtualbox VM with NAT port forwarding to be able to connect
# to TCP/6565
import socket
import time
import json
from datetime import datetime

def read_simulate_glider_json():
    with open("simulate_glider_dialog.json", "r") as f:
        log_json = json.load(f)
    # Just get the first log
    return log_json[0]

s = socket.socket()
s.connect(("127.0.0.1", 6565))

connection_log = read_simulate_glider_json()
last_date = datetime.fromisoformat(connection_log["date"]["$date"])
for dialog in connection_log["surface_dialog"]:
    s.sendall(dialog["data"].encode())
    print(dialog["data"])
    new_date = datetime.fromisoformat(dialog["time"]["$date"])
    time_diff = new_date - last_date
    last_date = new_date
    time.sleep(time_diff.total_seconds())
    

s.close()

