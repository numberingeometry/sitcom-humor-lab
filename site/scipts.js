// script.js (site/ folder version)
// Client-side loader for CSVs and Plotly charts
// Expected CSVs are one folder up in ../data/processed/

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inside = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inside && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inside = !inside;
      }
    } else if (c === ',' && !inside) {
      row.push(cur);
      cur = '';
    } else if ((c === '\n' || c === '\r') && !inside) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Missing or inaccessible: ${path}`);
  const text = await res.text();
  const rows = parseCSV(text);
  const header = rows.shift();
  return rows
    .filter(r => r.length === header.length)
    .map(r => Object.fromEntries(r.map((v, i) => [header[i], v])));
}

function movingAverage(arr, window = 5) {
  const out = Array(arr.length).fill(null);
  for (let i = 0; i < arr.length; i++) {
    const s = Math.max(0, i - window + 1);
    const slice = arr.slice(s, i + 1).map(Number).filter(x => !Number.isNaN(x));
    out[i] = slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  }
  return out;
}

async function buildRatingsTrend() {
  const el = document.getElementById('ratings-trend');
  try {
    const data = await loadCSV('../data/processed/imdb_ratings.csv');

    data.sort((a, b) =>
      (Number(a.season) - Number(b.season)) ||
      (Number(a.episode) - Number(b.episode))
    );

    data.forEach((d, i) => d.ep_index = i + 1);

    const seasons = [...new Set(data.map(d => d.season))].sort((a, b) => Number(a) - Number(b));
    const traces = seasons.map(s => {
      const sub = data.filter(d => d.season === s && d.imdb_rating && d.imdb_rating !== 'N/A');
      return {
        x: sub.map(d => d.ep_index),
        y: sub.map(d => Number(d.imdb_rating)),
        mode: 'lines+markers',
        name: `S${s}`,
        hovertemplate: `S${s}E%{text}: %{y}<extra></extra>`,
        text: sub.map(d => d.episode)
      };
    });

    const allY = data.map(d => (d.imdb_rating === 'N/A' ? null : Number(d.imdb_rating)));
    const ma = movingAverage(allY, 5);
    const maTrace = {
      x: data.map(d => d.ep_index),
      y: ma,
      mode: 'lines',
      name: '5-ep moving avg',
      line: { width: 3 }
    };

    const layout = {
      margin: { l: 40, r: 20, t: 30, b: 40 },
      xaxis: { title: 'Episode (global index)' },
      yaxis: { title: 'IMDb rating' },
      legend: { orientation: 'h' }
    };

    Plotly.newPlot('ratings-trend', [...traces, maTrace], layout, { responsive: true });
  } catch (err) {
    el.innerHTML = `<div class="note">Could not load ratings CSV. Ensure <code>data/processed/imdb_ratings.csv</code> exists.</div>`;
    console.warn(err);
  }
}

async function buildJokeScatter() {
  const el = document.getElementById('joke-scatter');
  try {
    const feats = await loadCSV('../data/processed/pilot_features.csv');

    feats.sort((a, b) =>
      (Number(a.season) - Number(b.season)) ||
      (Number(a.episode) - Number(b.episode))
    );

    const x = feats.map(d => Number(d.jokes_per_min));
    const y = feats.map(d => Number(d.imdb_rating));

    const trace = { x, y, mode: 'markers', type: 'scatter', name: 'Episodes' };
    const layout = {
      margin: { l: 40, r: 20, t: 30, b: 40 },
      xaxis: { title: 'Joke density (events/min)' },
      yaxis: { title: 'IMDb rating' }
    };

    Plotly.newPlot('joke-scatter', [trace], layout, { responsive: true });
  } catch (err) {
    el.innerHTML = `<div class="note">Optional plot. To enable, export <code>data/processed/pilot_features.csv</code> with columns: <code>season,episode,jokes_per_min,imdb_rating</code>.</div>`;
    console.info('Pilot joke scatter: waiting for pilot_features.csv');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  buildRatingsTrend();
  buildJokeScatter();
});
