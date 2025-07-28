"""
CSC111 Project 2: Initial CSV Cleaner

This module goes through the raw data scraped from Billboard.com and removes duplicate songs,
keeping only the entry with the best (lowest number) rank.
Doing this greatly helps reduce the amount of data that needs to be processed.
"""

import csv


def main():
    """
    Read the CSV file, and create a new CSV file that contains the data from input,
    but with each song only appearing once and with its best rank.
    """
    input_file_path = "../data/billboard_global_200.csv"
    output_file_path = "../data/cleaned.csv"
    
    best_records = {}  # key: (track, artist, featured_artists); value: dict with "position", etc.

    # Open input CSV and supply our fieldnames.
    with open(input_file_path, newline='', encoding="utf-8") as infile:
        reader = csv.reader(infile)

        # Skip header row, which should always be present
        next(reader)

        # Process the rest of the rows
        for row in reader:
            # Our CSV is expected to have these five columns:
            _date, position_str, track, artist, featured_artists = row

            try:
                position = int(position_str.strip())
            except ValueError:  # If the position is invalid, then skip this row.
                continue

            # Used to uniquely identify a song in the dictionary
            # (specifically excludes `position` -- rank on chart -- since that can change between weeks)
            key = (track.strip(), artist.strip(), featured_artists.strip())

            # If the song is new or current ranking is better (lower number), update the record.
            if key not in best_records or position < best_records[key]["position"]:
                best_records[key] = {
                    "position": position,
                    "track": track.strip(),
                    "artist": artist.strip(),
                    "featured_artists": featured_artists.strip()
                }

    write_to_new(output_file_path, best_records)


def write_to_new(output_file_path: str, best_records: dict) -> None:
    """
    Write the cleaned records to the output CSV (without the date)
    """
    with open(output_file_path, "w", newline='', encoding="utf-8") as outfile:
        writer = csv.DictWriter(outfile, fieldnames=["position", "track", "artist", "featured_artists"])
        writer.writeheader()
        for record in best_records.values():
            writer.writerow(record)


if __name__ == "__main__":
    main()
