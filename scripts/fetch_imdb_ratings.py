import argparse
import csv
import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv

def fetch_json(url):
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--imdb-id', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()

    load_dotenv()
    api_key = os.getenv('OMDB_API_KEY')
    if not api_key:
        print('ERROR: OMDB_API_KEY not found in .env')
        sys.exit(1)

    series_url = f'https://www.omdbapi.com/?i={args.imdb_id}&apikey={api_key}'
    meta = fetch_json(series_url)
    total_seasons = int(meta.get('totalSeasons', 0))
    if total_seasons == 0:
        print('ERROR: Could not determine total seasons')
        sys.exit(1)
    
    rows = []
    for season_num in range(1, total_seasons + 1):
        # Fetch season metadata
        season_url = f'https://www.omdbapi.com/?i={args.imdb_id}&Season={season_num}&apikey={api_key}'
        season = fetch_json(season_url)
        sj = fetch_json(season_url)
        episodes = sj.get('Episodes', [])
        for ep in episodes:
            rows.append({
                'season': season_num,
                'episode': int(ep.get('Episode', 0)),
                'title': ep.get('Title'),
                'imdb_rating': ep.get('imdbRating'),
                'released': ep.get('Released'),
                # 'runtime': ep.get('Runtime'),
                # 'actors': ep.get('Actors'),
                # 'plot': ep.get('Plot'),
                'imdb_id': ep.get('imdbID'),
                # 'imdb_votes': ep.get('imdbVotes'),
            })

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

if __name__ == '__main__':
    main()

