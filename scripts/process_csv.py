"""
This module is used process the cleaned data, stored as a sequence of songs in the form of a CSV file,
into a couple of dictionaries that will be useful for later parts of the analysis we are doing.
It can also save the dictionaries to disk so that the computation doesn't have to be repeated.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass
import re  # regex
import json


def build_relationship_dicts(file_path: str) -> tuple[dict, dict]:
    """
    Given the path of a CSV file containing cleaned scraped data, in the format
    | position | track | artist | featured_artists |
    | <int>    | <str> | <str>  | <str>            |

    Return two dictionaries.

    (1) The first dictionary maps names of artists to a dictionary of names of artists
    with whom they've collaborated, and how many times they've collaborated with each one.
    This is a two-way relationship:
    {
       "A": {"B": 2},
       "B": {"A": 2},
       "C": {},
    }

    (2) The second dictionary maps songs to lists of artists involved in making the song.

    Preconditions
        - `file_path` is a valid path to a CSV file in the specified format
    """

    print(f"Reading from {file_path}...")

    collabs = {}

    # Maps songs to a list of names of artists involved
    # (using lists & not sets for json serialisability)
    songs_artists = {}

    with open(file_path, "r") as file:
        reader = csv.reader(file)
        next(reader)  # Skip header line
        for row in reader:
            top_rank, title, artists_str, featured = row

            artists = set.union(split_artists(artists_str), split_artists(featured))

            song = Song(title, list(artists), int(top_rank))
            songs_artists[song.serialise()] = list(artists)

            # Might be better here to just go straight to a graph
            # Instead of writing a dictionary first
            update_collab_counts(collabs, artists)

    return collabs, songs_artists


def update_collab_counts(collabs: dict[str, dict[str, int]], collaborating_artists: set[str]) -> None:
    """
    Given a dictionary `collabs` mapping artists to dicts of other artists they've collaborated with,
    along with how many times they've collaborated, mutate `collabs`.

    For every unique pair of two artists in `collaborating_artists`, increment their collaboration count
    in `collabs`.
    """

    for artist in collaborating_artists:
        if artist not in collabs:
            collabs[artist] = {}
        for other_artist in collaborating_artists:
            if other_artist == artist:
                continue
            if other_artist not in collabs[artist]:
                collabs[artist][other_artist] = 1
            else:
                collabs[artist][other_artist] += 1


def split_artists(artist_str: str) -> set[str]:
    """
    Split a string that lists artists by commas (and optionally other delimiters).
    The CSV parser already handles quoted fields, so commas inside names are preserved.
    """
    if not isinstance(artist_str, str) or artist_str == "N/A":
        return set()

    # Split on commas, and also on & and / for robustness
    # (You can add more delimiters if needed)
    delimiters = [',', '&', '/', ' x ', ' with ', ' Featuring ']
    temp = [artist_str]
    for delim in delimiters:
        new_temp = []
        for s in temp:
            new_temp.extend(s.split(delim))
        temp = new_temp
    # Remove whitespace and empty strings
    return {a.strip() for a in temp if a.strip()}


def save_dict(data: dict, file_path: str) -> None:
    """
    Given a dictionary, save it to a JSON file at the given path.

    Preconditions:
    - `data` must be a dictionary that contains only datatypes serialisable to JSON.
    """

    # Save the JSON with indentation for readability
    with open(file_path, "w") as file:
        json.dump(data, file, indent=4)


@dataclass
class Song:
    """
    Represents a song that appeared on the charts.

    Instance Attributes:
        - title: The title of the song.
        - artists: A list of names of the artists who made the song.
                   Makes no distinction between main/featured/etc artists.
        - top_rank: The top rank this song achieved on Billboard.com.

    Representation Invariants:
        - self.title.strip() != ""
        - len(self.artists) >= 1
        - top_rank > 0
    """

    title: str
    artists: list[str]
    top_rank: int

    def serialise(self) -> str:
        """
        Return a string representation of this song that can be reconstructed into the song object.

        Preconditions:
            - None of the fields in `self` contain "/////" or "&&&",
              since these are used as delimiters in the serialisation.
              (This never occurs in the actual dataset we're working with.)
        """
        return f"{self.title}/////{'&&&'.join(self.artists)}/////{str(self.top_rank)}"

    @staticmethod
    def deserialise(serialised_song: str) -> Song:
        """
        Given a serialised song -- such as a string returned by Song.serialise() --
        return the Song object that the string represents.

        Preconditions:
            - serialised_song is a validly serialised Song.
        """
        title, artists_str, top_rank_str = serialised_song.split("/////")
        return Song(title, artists_str.split("&&&"), int(top_rank_str))

    def __hash__(self) -> int:
        """
        Returns a hash of this object.
        """
        # This is needed to be able to use this object as a key in a dictionary.
        # Hashes the serialised form since I'm not confident in my ability to write a reliable hash function.
        return hash(self.serialise())


def main():
    """
    Main function to process the CSV and create JSON files.
    """
    input_file = "../data/cleaned.csv"
    collaborations_output = "../data/collaborations.json"
    songs_output = "../data/songs_to_artists.json"
    
    # Take the cleaned data, and process it into the collaborations dict & songs to artists dict.
    collaborations, songs_to_artists = build_relationship_dicts(input_file)
    save_dict(collaborations, collaborations_output)
    save_dict(songs_to_artists, songs_output)
    
    print("Processing complete.")


if __name__ == "__main__":
    main()
