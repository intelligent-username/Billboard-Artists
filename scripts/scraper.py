"""
CSC111 Project 2: Webscraper

This model scrapes the data we need from Billboard website.
"""

from datetime import datetime, timedelta
import time
import csv
import re
import os
from typing import Optional

import bs4.element
import requests
from bs4 import BeautifulSoup


def split_artist(artist_str: str) -> tuple[str, str]:
    """
    Splits the full artist string into a main artist and featuring artists.
    It searches for the first occurrence of common featuring keywords
    (feat., featuring, ft.) and takes the left side as the main artist.
    The remainder (if any) is cleaned up by replacing further featuring keywords with commas.
    """
    artist_str = artist_str.strip()
    # Search for the first occurrence of a featuring keyword.
    match = re.search(r'\s+(feat\.?|featuring|ft\.?)\s+', artist_str, flags=re.IGNORECASE)
    if match:
        main_artist = artist_str[:match.start()].strip()
        featuring = artist_str[match.end():].strip()
        # Replace any additional featuring keywords with a comma separator.
        featuring = re.sub(r'\s+(feat\.?|featuring|ft\.?)\s+', ', ', featuring, flags=re.IGNORECASE)
    else:
        main_artist = artist_str
        featuring = ""
    return main_artist, featuring


def parse_chart_row(row: bs4.element.Tag, date_str: str) -> Optional[dict]:
    """
    Parses a single chart row (a <ul class="o-chart-results-list-row"> element)
    to extract:
      - Rank from the first <li> (within a <span> with appropriate class)
      - Song title from the <h3 id="title-of-a-story">
      - Artist info from the immediate following <span>
    Returns a dictionary with keys: Date, Rank, Song, Artist, Featuring.
    """
    try:
        # The first <li> is assumed to contain the rank number.
        rank_li = row.find("li")
        if not rank_li:
            return None
        # Try to locate the span with the rank (often with a class including "a-font-primary-bold-l")
        rank_span = rank_li.find("span", class_=lambda x: x and "a-font-primary-bold-l" in x)
        if not rank_span:
            rank_span = rank_li.find("span", class_="c-label")
        if not rank_span:
            return None
        rank_text = rank_span.get_text(strip=True)
        rank = int(rank_text)
    except ValueError as e:
        print("Error extracting rank:", e)
        return None

    # Extract the song title from <h3 id="title-of-a-story">
    title_h3 = row.find("h3", id="title-of-a-story")
    song = title_h3.get_text(strip=True) if title_h3 else ""

    # Extract artist info from the <span> immediately following the <h3>
    artist_text = ""
    if title_h3:
        artist_span = title_h3.find_next_sibling("span")
        if artist_span:
            artist_text = artist_span.get_text(strip=True)

    main_artist, featuring = split_artist(artist_text)
    # If there's no featuring info, mark it as "N/A"
    if not featuring:
        featuring = "N/A"

    return {
        "Date": date_str,
        "Rank": rank,
        "Song": song,
        "Artist": main_artist,
        "Featuring": featuring
    }


def scrape_chart(date_str: str) -> list[dict]:
    """
    Retrieves the Billboard Global 200 chart page for a given date and parses it.
    Returns a list of dictionaries (one per chart row).
    """
    url = f"https://www.billboard.com/charts/billboard-global-200/{date_str}/#"
    headers = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/115.0.0.0 Safari/537.36")
    }
    print(f"Scraping: {url}")
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to retrieve data for {date_str} (Status code: {response.status_code})")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    results = []
    # Select each chart row using its unique CSS class.
    rows = soup.select("ul.o-chart-results-list-row")
    for row in rows:
        entry = parse_chart_row(row, date_str)
        if entry:
            results.append(entry)
    return results


def main():
    """
    Scrapes data from Billboard website and writes it to a CSV file.
    """
    scrape_target_path = "../data/billboard_global_200.csv"

    csv_columns = ["Date", "Rank", "Song", "Artist", "Featuring"]

    # Set the starting date based on CSV content or default
    if os.path.isfile(scrape_target_path):
        # Read the second-to-last line of the CSV
        with open(scrape_target_path, 'r', encoding='utf-8') as csvfile:
            # Use a list to store all lines
            lines = list(csvfile)
            if len(lines) > 1:  # Check if file has more than just header
                second_last_line = lines[-2]  # Get second-to-last line
                last_date_str = second_last_line.split(',')[0]  # First column is date

                # set the start date to the next week
                # (i.e. start scraping for the week after the last week we already have)
                start_date = datetime.strptime(last_date_str, "%Y-%m-%d") + timedelta(days=7)
            else:
                print("Freshly scraping data from global 200 charts...\nThis might take a while...")
                start_date = datetime.strptime("2020-09-05", "%Y-%m-%d")
    else:
        print("Freshly scraping data from global 200 charts...\nThis might take a while...")
        start_date = datetime.strptime("2020-09-05", "%Y-%m-%d")

    # Stop the scraping at today's date.
    end_date = datetime.today()

    # Open CSV in append mode; if the file doesn't exist, write the header.
    file_exists = os.path.isfile(scrape_target_path)
    with open(scrape_target_path, "a", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=csv_columns)
        if not file_exists:
            writer.writeheader()

        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            try:
                weekly_data = scrape_chart(date_str)
                if weekly_data:
                    writer.writerows(weekly_data)
                    csvfile.flush()  # flush the output to disk immediately
                time.sleep(0.25)  # short pause between requests
            except KeyboardInterrupt:
                print(f"\nKeyboard interrupt detected while processing {date_str}.")
                csvfile.flush()
                break
            current_date += timedelta(days=7)
    print("Scraping complete.")


if __name__ == "__main__":
    main()
