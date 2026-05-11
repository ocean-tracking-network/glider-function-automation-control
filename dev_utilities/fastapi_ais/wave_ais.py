import pandas as pd

missions = ['m169-C34166NS/',
'm170-C34164NS/',
'm171-C34167NS/',
'm176-C34164NS/',
'm177-C34166NS/',
'm181-C34167NS/',
'm182-C34166NS/',
'm183-C34164NS/',
'm186-C34166NS/',
'm189-C34167NS/',
'm193-C34167NS/',
'm199-C34164NS/',
'm203-C34164NS/',
'm209-C34167NS/',
'm211-C34164NS/',
'm216-C34164NS/']  


BASE_URL = "http://129.173.20.180:8086/output_past_missions/"


def get_wave_ais():
    dfs = []
    for mission in missions:
        url = BASE_URL+mission+"AIS%20Report.csv"
        print(url)
        df = pd.read_csv(url)
        dfs.append(df)
    return pd.concat(dfs)

def process_ais(df: pd.DataFrame):
    df["timeStamp"] = pd.to_datetime(df["timeStamp"])
    df = df.sort_values(by=['timeStamp'])
    print(len(df))

    df = df.drop_duplicates()
    print(len(df))
    
    return df


if __name__ == '__main__':
    df = get_wave_ais()
    df = process_ais(df)
    # print(df)