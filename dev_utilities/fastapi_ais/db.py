import pymongo
import os
import json
from datetime import datetime, timezone
from pymongo import ASCENDING
from zoneinfo import ZoneInfo

DATA_DIR = "./data"
FILENAME_TIMESTAMP_FORMATS = ["%Y-%m-%dT%H_%M_%S", "%Y-%m-%dT%H:%M:%S"]

# Read Mongo connection from environment so the service can run in Docker
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_USER = os.getenv("MONGO_USER", "ceotr")
MONGO_PASS = os.getenv("MONGO_PASS", "ceotr")

myclient = pymongo.MongoClient(MONGO_URL, username=MONGO_USER, password=MONGO_PASS)
mydb = myclient["ais"]
mycol = mydb["ais"]
config_col = mydb['ais_config']


def get_grouped():
    pipeline = [
        {
            '$group': {
                '_id': '$AIS.MMSI',
                'docs': {'$push': '$$ROOT'}
            }
        }
    ]
    result_cursor = list(mycol.aggregate(pipeline))
    # cursor = mycol.find({})
    # for cur in cursor:
    #     print(cur["AIS"]["MMSI"])
    # groups = []
    # for group in result_cursor:
    #     mmsi = group["_id"]
    #     records = group['docs']
    #     print(f"Vessel {mmsi} ({records[0]['AIS']['NAME']}) has {len(records)} records")
        # print(records[0]["AIS"]["NAME"])
    return result_cursor

def get_group_names() -> list[dict[str, str]]:
    cursor = get_grouped()
    ret = []
    for group in cursor:
        mmsi = group["_id"]
        name = group['docs'][0]["AIS"]["NAME"]
        count = len(group['docs'])
        ret.append({"name": name, "mmsi": mmsi, "count": count})
    return ret

def get_group_by(key, value):
    cur = mycol.find({f"AIS.{key}": value})
    return _process_cur(cur)


def _process_cur(cur):
    ret = []
    for doc in cur:
        doc["_id"] = str(doc["_id"])
        ret.append(doc)
    return ret


def _parse_fixture_timestamp(file_name: str) -> datetime:
    timestamp_text = file_name.split(".")[0]
    for timestamp_format in FILENAME_TIMESTAMP_FORMATS:
        try:
            return datetime.strptime(timestamp_text, timestamp_format)
        except ValueError:
            continue
    raise ValueError(
        f"time data {timestamp_text!r} does not match supported formats {FILENAME_TIMESTAMP_FORMATS!r}"
    )
    

def get_by_index(idx) -> list[dict[str, str]]:
    pipeline = [
        {
            '$group': {
                '_id': '$api_time',
                'docs': {'$push': '$$ROOT'}
            },
        },
        {
            '$sort': {
                '_id': ASCENDING
            }
        }
    ]
    # result_cursor = list(mycol.aggregate(pipeline))
    # print(result_cursor[idx]['docs'])
    # return _process_cur(result_cursor[idx]['docs'])
    cur = mycol.find({'group': idx})
    return _process_cur(cur)


def fun():
    cur = mycol.find({ "AIS.NAVSTAT": { "$not": { "$eq": 0 } } })
    for c in cur:
        print(c)
        


def _process_date(doc):
    timestamp = datetime.strptime(doc["AIS"]["TIMESTAMP"], "%Y-%m-%d %H:%M:%S %Z")
    api_time = doc["api_time"]
    print(timestamp)
    print(api_time)
    print(datetime.now(timezone.utc))
    time_diff = api_time - timestamp
    print(time_diff)
    new_timestamp: datetime = datetime.now(timezone.utc) - time_diff
    doc["AIS"]["TIMESTAMP"] = new_timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")
    return doc
    

def get_mimic():
    config_cur = config_col.find_one({})

    # Calculate how many groups exist
    # You may need to import `os` and `DATA_DIR` if not already available
    total_groups = len(os.listdir(DATA_DIR))

    group = 0
    if config_cur is not None:
        group = config_cur["next_group"]

        # Increment and wrap-around
        new_group = (group + 1) % total_groups
        config_col.update_one({}, {"$set" : {"next_group": new_group}})
    else:
        config_col.insert_one({
            "next_group": 1
        })

    return [{"AIS": _process_date(doc)["AIS"]} for doc in get_by_index(group)]


def get_all_unique():
    pipeline = [
    {
        # 1. Group documents by the combination of the three fields
        '$group': {
            # '_id' must be a unique identifier for the group. 
            # We use a composite key of the three fields.
            '_id': {
                'latitude': '$AIS.LATITUDE',
                'longitude': '$AIS.LONGITUDE',
                'mmsi': '$AIS.MMSI'
            },
            # 2. Use $first or $last to pick one document from the group.
            # Here, we use '$first' to keep the first document encountered 
            # for that unique combination.
            'uniqueDoc': { '$first': '$$ROOT' }
        }
    },
    {
        # 3. Replace the root document with the 'uniqueDoc' we just selected
        '$replaceRoot': { 'newRoot': '$uniqueDoc' }
    }
    ]
    cur = mycol.aggregate(pipeline)
    ret = _process_cur(cur)
    print(ret)
    return ret
    

def insert_data():
    group = 0
    files = [(_parse_fixture_timestamp(file), file) for file in os.listdir(DATA_DIR)]
    sorted_files = sorted(files)
    for _, file in sorted_files:
        file_path = os.path.join(DATA_DIR, file)
        with open(file_path, "r") as f:
            file_data = json.load(f)
            for ais in file_data:
                api_time = _parse_fixture_timestamp(file)
                api_time = api_time.replace(tzinfo=ZoneInfo("America/Toronto"))
                api_time = api_time.astimezone(timezone.utc)
                ais["api_time"] = api_time
                ais["group"] = group
                mycol.insert_one(ais)
        group+=1


def ensure_data_loaded():
    if mycol.estimated_document_count() > 0:
        return

    print("AIS collection is empty; loading AIS fixture data")
    insert_data()


if __name__ == '__main__':
    ensure_data_loaded()
    # fun()
    # get_all_unique()
    # get_grouped()
