"""
RailYatra data pipeline.

Builds the timetable files the engine and API serve (master_train_data.json,
stations.json, category files) from one or more *sources*, then validates,
diffs and publishes them. See datapipe/README.md.
"""
