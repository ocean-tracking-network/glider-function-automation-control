from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import json

from .db import myclient, mydb, mycol, \
                get_group_names, \
                get_group_by, \
                get_by_index, \
                get_all_unique, \
                get_mimic, \
                ensure_data_loaded

DATA_LOCATION = "./data"


app = FastAPI()


@app.on_event("startup")
def startup():
    ensure_data_loaded()



origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://localhost:5173",
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/count")
def read_count():
    return {"count": len(os.listdir(DATA_LOCATION))}

@app.get("/ais/index/{file_idx}")
def read_ais(file_idx: int):
    return get_by_index(file_idx)
    
    
    # try:
    #     file = os.listdir(DATA_LOCATION)[file_idx]
    #     file_path = os.path.join(DATA_LOCATION, file)
    #     with open(file_path, "r") as f:
    #         return json.load(f)
    # except IndexError:
    #     return {"error": "Index out of bounds"}


@app.get("/ais/groups/names")
def read_group_names():
    return get_group_names()

@app.get("/ais/groups/{mmsi}")
def read_group_by_mmsi(mmsi: int):
    ret = get_group_by("MMSI", mmsi)
    print(ret)
    return ret

@app.get("/ais")
def read_all():
    return get_all_unique()

# Mimic the real AIS API
@app.get("/ais/mimic")
def mimic():
    return get_mimic()
