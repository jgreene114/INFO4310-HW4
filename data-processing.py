import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

directory = Path("data/Biketown Raw Data")
filtered_dfs = []
column_mapping = {
    'Start_Latitude': 'StartLatitude',
    'Start_Longitude': 'StartLongitude',
    'End_Latitude': 'EndLatitude',
    'End_Longitude': 'EndLongitude',
    'Distance_Miles_': 'DistanceMiles',
    'Distance_Miles': 'DistanceMiles',
}

for file_path in directory.rglob('*'):
    year, month = map(int, file_path.stem.split('_'))
    df = pd.read_csv(file_path)
    
    df.rename(columns=column_mapping, inplace=True)
    
    # combined_df['StartDateTime'] = pd.to_datetime(combined_df['StartDate'] + ' ' + combined_df['StartTime'])
    # combined_df['EndDateTime'] = pd.to_datetime(combined_df['EndDate'] + ' ' + combined_df['EndTime'])
    
    df['StartDate'] = pd.to_datetime(df['StartDate'] + ' ' + df['StartTime'])
    df['EndDate'] = pd.to_datetime(df['EndDate'] + ' ' + df['EndTime'])
    # df['EndDate'] = pd.to_datetime(df['EndDate'])
    
    nan_duration_mask = df['Duration'].isna()
    calculated_duration = (df['EndDate'] - df['StartDate'])
    df.loc[nan_duration_mask, 'Duration'] = calculated_duration[
        nan_duration_mask]
    df.loc[~nan_duration_mask, 'Duration'] = pd.to_timedelta(
        df.loc[~nan_duration_mask, 'Duration']
    )
    
    start_of_month = datetime(year, month, 1)
    end_of_month = datetime(year, month + 1, 1) - timedelta(
        seconds=1
    ) if month < 12 else datetime(
        year + 1, 1, 1
    ) - timedelta(seconds=1)
    
    df_filtered = df[
        (df['StartDate'] >= start_of_month - timedelta(days=1)) &
        (df['EndDate'] <= end_of_month + timedelta(days=1))
        ]
    filtered_dfs.append(df_filtered)

og_combined_df = pd.concat(filtered_dfs, ignore_index=True)

combined_df = og_combined_df.copy()
combined_df = combined_df[combined_df['Duration'] > timedelta(days=0)]
combined_df = combined_df[
    (30 >= combined_df['DistanceMiles']) & (combined_df['DistanceMiles'] > 0)]
combined_df = combined_df[(combined_df['Duration'] <= timedelta(days=1)) | (
            combined_df['DistanceMiles'] >= 1)]
combined_df['Duration'] = pd.to_timedelta(combined_df['Duration'])
combined_df['RouteID'] = combined_df['RouteID'].fillna(0).astype(int)
combined_df['BikeID'] = combined_df['BikeID'].fillna(0).astype(int)
combined_df['BikeName'] = combined_df[
    'BikeName'].str.lower().str.strip().astype(str)

combined_df = combined_df[combined_df['StartDate'] <= combined_df['EndDate']]

combined_df.drop(columns=['StartTime', 'EndTime'], inplace=True)

combined_df.dropna(how='all', inplace=True)
combined_df.dropna(
    subset=["StartLongitude", "StartLatitude", "StartHub"], how='all',
    inplace=True
)
combined_df.dropna(
    subset=["EndLongitude", "EndLatitude", "EndHub"], how='all', inplace=True
)

coord_columns = ['StartLongitude', 'StartLatitude', 'EndLongitude',
                 'EndLatitude']
# combined_df[coord_columns] = combined_df[coord_columns].round(6)

start_coords = combined_df[
    ['StartLatitude', 'StartLongitude']].drop_duplicates()
end_coords = combined_df[['EndLatitude', 'EndLongitude']].rename(
    columns={'EndLatitude': 'StartLatitude', 'EndLongitude': 'StartLongitude'}
).drop_duplicates()
coords = pd.concat([start_coords, end_coords]).drop_duplicates()
coords['ID'] = range(len(coords))
coords_dict = coords.set_index(['StartLatitude', 'StartLongitude'])[
    'ID'].to_dict()
combined_df['StartID'] = combined_df.apply(
    lambda row: coords_dict[(row['StartLatitude'], row['StartLongitude'])],
    axis=1
)
combined_df['EndID'] = combined_df.apply(
    lambda row: coords_dict[(row['EndLatitude'], row['EndLongitude'])], axis=1
)

df_for_export = combined_df.copy()

df_for_export.drop(
    columns=[
        'StartLatitude', 'EndLatitude', 'StartLongitude', 'EndLongitude',
        'StartHub', 'EndHub',
        'PaymentPlan', 'TripType', 'RentalAccessPath', 'MultipleRental',
        'RouteID', 'BikeName'  # question: should we leave this in
    ], inplace=True
)

df_for_export['Duration'] = df_for_export[
    'Duration'].dt.total_seconds().astype(int)

df_for_export['StartDate'] = df_for_export['StartDate'].dt.strftime(
    '%Y-%m-%dT%H:%M:%S'
)
# df_for_export['EndDate'] = df_for_export['EndDate'].dt.strftime(
#     '%Y-%m-%dT%H:%M:%S'
# )

# NOTE: dropping end date here
df_for_export.drop(columns=['EndDate'], inplace=True)


from collections import Counter

nodes = {}
# edges = Counter()

for index, row in combined_df.iterrows():
    start_id = row['StartID']
    end_id = row['EndID']
    
    if start_id not in nodes:
        nodes[start_id] = {
            'lat': row['StartLatitude'],
            'lon': row['StartLongitude'],
            'Name': Counter(),
            'Count': 1
        }
    else:
        nodes[start_id]['Count'] += 1
    
    if end_id not in nodes:
        nodes[end_id] = {
            'lat': row['EndLatitude'],
            'lon': row['EndLongitude'],
            'Name': Counter(),
            'Count': 1
        }
    else:
        nodes[end_id]['Count'] += 1
    
    if pd.notna(row['StartHub']):
        nodes[start_id]['Name'][row['StartHub']] += 1
    if pd.notna(row['EndHub']):
        nodes[end_id]['Name'][row['EndHub']] += 1
    
    # edges[(start_id, end_id)] += 1

for node_id, node_data in nodes.items():
    if node_data['Name']:
        most_common_name, _ = node_data['Name'].most_common(1)[0]
        node_data['Name'] = most_common_name
    else:
        node_data['Name'] = None

nodes_df = pd.DataFrame.from_dict(nodes, orient='index')

# filtering data to only hubs and trips with at least 10 trips
nodes_df = nodes_df[nodes_df['Count'] > 10]

df_for_export = (
    df_for_export[
        df_for_export['StartID'].isin(nodes_df.index) &
        df_for_export['EndID'].isin(nodes_df.index)
        ]
)

nodes_df = nodes_df.reset_index().rename(columns={'index': 'id'})
nodes_df.to_csv("data/Biketown Cleaned Data/hubs.csv", index=False)
df_for_export.to_csv("data/Biketown Cleaned Data/trips.csv", index=False)