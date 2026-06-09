# CineSearch

Discover and save movies with vanilla JavaScript and the [OMDB API](https://www.omdbapi.com/).

## Features

- Search movies with pagination
- Genre chips that **combine** with your search query
- Detail panel (plot, runtime, IMDb rating, genres)
- Favourites stored in `localStorage`
- Accessible markup, responsive layout, dark cinema theme

## Quick start

1. Clone or download this project.
2. Get a free API key from [OMDB](https://www.omdbapi.com/apikey.aspx).
3. Copy `js/config.example.js` to `js/config.js` and paste your key.
4. Serve the folder with any static server (required for `fetch` CORS):

```bash
npx serve .
```

5. Open `http://localhost:3000` (or the URL shown).

> Opening `index.html` directly as `file://` may break API requests in some browsers.

## Project structure

```
├── index.html          # Discover + search
├── favourites.html     # Saved movies
├── about.html
├── assets/             # Icons, placeholders, OG image
├── css/                # Modular styles (variables, components)
└── js/
    ├── config.js       # Your API key (see config.example.js)
    ├── shared.js       # API, storage, cards, detail panel
    ├── app.js          # Discover page logic
    └── favourites.js   # Favourites page logic
```

## Deploy (Netlify)

1. Drag the folder to [Netlify Drop](https://app.netlify.com/drop) or connect a Git repo.
2. Add `js/config.js` with your production key (or use Netlify env + a small build script if you add one later).
3. Set site URL in `index.html` canonical/OG tags if needed.

## Security note

The OMDB API key is visible in frontend code. For public repos, rotate keys if exposed and consider a serverless proxy for production traffic.

## License

MIT — use freely for learning and portfolios.

## Live Demo
