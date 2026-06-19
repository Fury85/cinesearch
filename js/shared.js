/* CineSearch — shared.js
   Utilities used by index and favourites pages */
(function (global) {
  'use strict';

  const CONFIG = global.CINESEARCH_CONFIG;
  if (!CONFIG?.API_KEY || CONFIG.API_KEY === 'YOUR_OMDB_API_KEY') {
    console.warn(
      '[CineSearch] Set your OMDB API key in js/config.js (copy from config.example.js).'
    );
  }

  /* ----- Security ----- */

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ----- Storage ----- */

  function loadFavourites() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      return [];
    }
  }

  function saveFavourites(favourites) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(favourites));
  }

  function normalizeFavourite(movie) {
    return {
      imdbID: movie.imdbID,
      Title: movie.Title,
      Year: movie.Year,
      Poster: movie.Poster,
      Type: movie.Type || 'movie',
    };
  }

  /* ----- API ----- */

  async function apiFetch(params, signal) {
    const query = new URLSearchParams({ apikey: CONFIG.API_KEY, ...params });
    const url = `${CONFIG.BASE_URL}?${query}`;

    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error('Network error — please check your connection.');
    }

    const data = await response.json();

    if (data.Response === 'False') {
      throw new Error(data.Error || 'Request failed.');
    }

    return data;
  }

  async function searchMovies(query, page = 1, signal) {
    return apiFetch(
      { s: query, page: String(page), type: 'movie' },
      signal
    );
  }

  async function fetchMovieDetail(imdbID, signal) {
    return apiFetch({ i: imdbID, plot: 'full' }, signal);
  }

  /* ----- Sort ----- */

  function parseMovieYear(yearStr) {
    if (!yearStr) return 0;
    const match = String(yearStr).match(/\d{4}/);
    return match ? parseInt(match[0], 10) : 0;
  }

  function sortMovies(movies, sortBy) {
    const sorted = [...movies];

    switch (sortBy) {
      case 'year-desc':
        return sorted.sort(
          (a, b) => parseMovieYear(b.Year) - parseMovieYear(a.Year)
        );
      case 'year-asc':
        return sorted.sort(
          (a, b) => parseMovieYear(a.Year) - parseMovieYear(b.Year)
        );
      case 'title-asc':
        return sorted.sort((a, b) =>
          (a.Title || '').localeCompare(b.Title || '')
        );
      default:
        return sorted;
    }
  }

  /* ----- UI helpers ----- */

  const NO_POSTER = 'assets/no-poster.svg';

  function posterSrc(movie) {
    let url = movie?.Poster;
    if (!url || url === 'N/A') return NO_POSTER;
    if (url.startsWith('http://')) {
      url = `https://${url.slice(7)}`;
    }
    return url;
  }

  function setPosterImage(img, movie) {
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.addEventListener(
      'error',
      () => {
        img.src = NO_POSTER;
      },
      { once: true }
    );
    img.src = posterSrc(movie);
  }

  function createMovieCard(movie, favourites) {
    const isFav = favourites.some((f) => f.imdbID === movie.imdbID);
    const title = movie.Title || 'Unknown';
    const year = movie.Year || '';
    const type = movie.Type || 'movie';
    const imdbID = movie.imdbID || '';

    const li = document.createElement('li');
    li.className = 'movie-grid__item';
    li.setAttribute('role', 'listitem');

    const article = document.createElement('article');
    article.className = 'movie-card';
    article.dataset.imdbId = imdbID;
    article.dataset.year = year;
    article.tabIndex = 0;
    article.setAttribute('aria-label', `${title}, ${year}`);
    article.setAttribute('itemscope', '');
    article.setAttribute('itemtype', 'https://schema.org/Movie');

    const figure = document.createElement('figure');
    figure.className = 'movie-card__poster-wrap';

    const img = document.createElement('img');
    img.className = 'movie-card__poster';
    img.alt = `${title} movie poster`;
    img.width = 200;
    img.height = 300;
    img.loading = 'lazy';
    img.setAttribute('itemprop', 'image');
    setPosterImage(img, movie);

    const figcaption = document.createElement('figcaption');
    figcaption.className = 'sr-only';
    figcaption.textContent = `${title} movie poster`;

    figure.append(img, figcaption);

    const overlay = document.createElement('div');
    overlay.className = 'movie-card__overlay';

    const favBtn = document.createElement('button');
    favBtn.className = 'movie-card__fav-btn';
    favBtn.type = 'button';
    favBtn.dataset.imdbId = imdbID;
    favBtn.setAttribute(
      'aria-label',
      `${isFav ? 'Remove' : 'Save'} ${title} ${isFav ? 'from' : 'to'} favourites`
    );
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.textContent = isFav ? '♥' : '♡';

    overlay.appendChild(favBtn);

    const yearBadge = document.createElement('span');
    yearBadge.className = 'movie-card__year-badge';
    yearBadge.textContent = year;

    const footer = document.createElement('footer');
    footer.className = 'movie-card__info';

    const h3 = document.createElement('h3');
    h3.className = 'movie-card__title';
    h3.setAttribute('itemprop', 'name');
    h3.textContent = title;

    const meta = document.createElement('div');
    meta.className = 'movie-card__meta';

    const time = document.createElement('time');
    time.className = 'movie-card__year';
    time.dateTime = year;
    time.setAttribute('itemprop', 'dateCreated');
    time.textContent = year;

    const typeSpan = document.createElement('span');
    typeSpan.className = 'movie-card__type';
    typeSpan.setAttribute('aria-label', `Type: ${type}`);
    typeSpan.textContent = `🎬 ${type}`;

    meta.append(time, typeSpan);
    footer.append(h3, meta);

    article.append(figure, overlay, yearBadge, footer);
    li.appendChild(article);

    return li;
  }

  function updateFavCountElements(favourites, ...elements) {
    const count = favourites.length;
    const label = count === 1 ? '1 saved favourite' : `${count} saved favourites`;

    elements.forEach((el) => {
      if (!el) return;
      el.textContent = count;
      el.setAttribute('aria-label', label);
    });
  }

  function updateDetailFavButton(btn, isFav) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isFav));
    btn.innerHTML = isFav
      ? '<span aria-hidden="true">♥</span> Saved!'
      : '<span aria-hidden="true">♡</span> Save to Favourites';
  }

  async function populateDetailPanel(movie, dom, favourites) {
    dom.detailPanel.hidden = false;
    dom.detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    dom.detailTitle.textContent = movie.Title;
    setPosterImage(dom.detailPoster, movie);
    dom.detailPoster.alt = `${movie.Title} movie poster`;
    dom.detailYear.textContent = movie.Year || '—';
    dom.detailRuntime.textContent =
      movie.Runtime && movie.Runtime !== 'N/A' ? movie.Runtime : '';
    dom.detailDirector.textContent =
      movie.Director && movie.Director !== 'N/A' ? movie.Director : 'Unknown';
    dom.detailPlot.textContent =
      movie.Plot && movie.Plot !== 'N/A' ? movie.Plot : 'No plot available.';
    dom.detailRating.textContent =
      movie.imdbRating && movie.imdbRating !== 'N/A'
        ? `⭐ ${movie.imdbRating}/10`
        : '';

    dom.detailGenres.innerHTML = '';
    if (movie.Genre && movie.Genre !== 'N/A') {
      movie.Genre.split(', ').forEach((genre) => {
        const li = document.createElement('li');
        li.textContent = genre;
        dom.detailGenres.appendChild(li);
      });
    }

    dom.detailImdbLink.href = `https://www.imdb.com/title/${movie.imdbID}/`;
    dom.detailFavBtn.setAttribute('data-imdb-id', movie.imdbID);

    const isFav = favourites.some((f) => f.imdbID === movie.imdbID);
    updateDetailFavButton(dom.detailFavBtn, isFav);
  }

  function showDetailLoading(dom) {
    dom.detailPanel.hidden = false;
    dom.detailTitle.textContent = 'Loading...';
    dom.detailPlot.textContent = '';
    dom.detailGenres.innerHTML = '';
    dom.detailPoster.src = NO_POSTER;
    dom.detailPoster.alt = '';
  }

  function initMobileNav(navToggle, siteNav) {
    if (!navToggle || !siteNav) return;

    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      siteNav.classList.toggle('is-open', !isOpen);
    });

    document.addEventListener('click', (e) => {
      if (siteNav.contains(e.target) || navToggle.contains(e.target)) return;
      navToggle.setAttribute('aria-expanded', 'false');
      siteNav.classList.remove('is-open');
    });
  }

  function setFooterYear(yearEl) {
    if (yearEl) {
      const y = new Date().getFullYear();
      yearEl.textContent = y;
      yearEl.setAttribute('datetime', String(y));
    }
  }

  /** Build OMDB search query from text search + optional genre chip */
  function buildSearchQuery(textQuery, genre) {
    const q = (textQuery || '').trim();
    if (!genre || genre === 'all') return q;
    if (!q) return genre;
    return `${q} ${genre}`;
  }

  global.CineSearch = {
    CONFIG,
    escapeHtml,
    loadFavourites,
    saveFavourites,
    normalizeFavourite,
    apiFetch,
    searchMovies,
    fetchMovieDetail,
    parseMovieYear,
    sortMovies,
    posterSrc,
    setPosterImage,
    NO_POSTER,
    createMovieCard,
    updateFavCountElements,
    updateDetailFavButton,
    populateDetailPanel,
    showDetailLoading,
    initMobileNav,
    setFooterYear,
    buildSearchQuery,
  };
})(window);
