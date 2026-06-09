/*  CineSearch — app.js (Discover page)  */

(function () {
  'use strict';

  const {
    CONFIG,
    loadFavourites,
    saveFavourites,
    normalizeFavourite,
    searchMovies,
    fetchMovieDetail,
    sortMovies,
    createMovieCard,
    updateFavCountElements,
    updateDetailFavButton,
    populateDetailPanel,
    showDetailLoading,
    initMobileNav,
    setFooterYear,
    buildSearchQuery,
  } = window.CineSearch;

  const state = {
    currentQuery: '',
    currentPage: 1,
    totalResults: 0,
    currentGenre: 'all',
    allMovies: [],
    favourites: [],
    selectedMovie: null,
  };

  let searchAbort = null;
  let detailAbort = null;

  const DOM = {
    searchForm: document.getElementById('js-search-form'),
    searchInput: document.getElementById('js-search-input'),
    searchHint: document.getElementById('search-hint'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    resultsGrid: document.getElementById('js-results-grid'),
    resultsLabel: document.getElementById('js-results-label'),
    resultsCount: document.getElementById('js-results-count'),
    sortSelect: document.getElementById('js-sort-select'),
    loading: document.getElementById('js-loading'),
    error: document.getElementById('js-error'),
    errorMsg: document.getElementById('js-error-msg'),
    retryBtn: document.getElementById('js-retry-btn'),
    empty: document.getElementById('js-empty'),
    detailPanel: document.getElementById('js-detail-panel'),
    detailPoster: document.getElementById('js-detail-poster'),
    detailTitle: document.getElementById('js-detail-title'),
    detailYear: document.getElementById('js-detail-year'),
    detailRuntime: document.getElementById('js-detail-runtime'),
    detailRating: document.getElementById('js-detail-rating'),
    detailDirector: document.getElementById('js-detail-director-name'),
    detailPlot: document.getElementById('js-detail-plot'),
    detailGenres: document.getElementById('js-detail-genres'),
    detailFavBtn: document.getElementById('js-detail-fav-btn'),
    detailImdbLink: document.getElementById('js-detail-imdb-link'),
    pagination: document.getElementById('js-pagination'),
    prevBtn: document.getElementById('js-prev-btn'),
    nextBtn: document.getElementById('js-next-btn'),
    pageInfo: document.getElementById('js-page-info'),
    favsGrid: document.getElementById('js-favs-grid'),
    favsEmpty: document.getElementById('js-favs-empty'),
    favsActions: document.getElementById('js-favs-actions'),
    clearFavsBtn: document.getElementById('js-clear-favs-btn'),
    favCount: document.getElementById('js-fav-count'),
    favCount2: document.getElementById('js-fav-count-2'),
    navToggle: document.getElementById('js-nav-toggle'),
    siteNav: document.getElementById('site-nav'),
    yearEl: document.getElementById('js-year'),
    configBanner: document.getElementById('js-config-banner'),
  };

  const detailDom = {
    detailPanel: DOM.detailPanel,
    detailPoster: DOM.detailPoster,
    detailTitle: DOM.detailTitle,
    detailYear: DOM.detailYear,
    detailRuntime: DOM.detailRuntime,
    detailRating: DOM.detailRating,
    detailDirector: DOM.detailDirector,
    detailPlot: DOM.detailPlot,
    detailGenres: DOM.detailGenres,
    detailFavBtn: DOM.detailFavBtn,
    detailImdbLink: DOM.detailImdbLink,
  };

  /* ----- UI states ----- */

  function showLoading() {
    DOM.loading.hidden = false;
    DOM.error.hidden = true;
    DOM.empty.hidden = true;
    DOM.resultsGrid.hidden = true;
    DOM.pagination.hidden = true;
  }

  function showError(message) {
    DOM.loading.hidden = true;
    DOM.error.hidden = false;
    DOM.resultsGrid.hidden = true;
    DOM.pagination.hidden = true;
    DOM.errorMsg.textContent = message;
  }

  function showEmpty() {
    DOM.loading.hidden = true;
    DOM.error.hidden = true;
    DOM.empty.hidden = false;
    DOM.resultsGrid.hidden = true;
    DOM.pagination.hidden = true;
  }

  function showResults() {
    DOM.loading.hidden = true;
    DOM.error.hidden = true;
    DOM.empty.hidden = true;
    DOM.resultsGrid.hidden = false;
  }

  function updateResultsLabel() {
    const { currentQuery, currentGenre } = state;
    const genreLabel =
      currentGenre !== 'all'
        ? currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1)
        : '';

    if (currentQuery && genreLabel) {
      DOM.resultsLabel.textContent = `"${currentQuery}" · ${genreLabel}`;
    } else if (currentQuery) {
      DOM.resultsLabel.textContent = `Results for "${currentQuery}"`;
    } else if (genreLabel) {
      DOM.resultsLabel.textContent = `Explore · ${genreLabel}`;
    } else {
      DOM.resultsLabel.textContent = 'Popular picks';
    }
  }

  /* ----- Render ----- */

  function renderMovies(movies) {
    DOM.resultsGrid.innerHTML = '';

    if (!movies.length) {
      showEmpty();
      return;
    }

    const sorted = sortMovies(movies, DOM.sortSelect.value);
    sorted.forEach((movie) => {
      DOM.resultsGrid.appendChild(createMovieCard(movie, state.favourites));
    });

    showResults();
  }

  function renderFavourites() {
    DOM.favsGrid.innerHTML = '';

    if (!state.favourites.length) {
      DOM.favsEmpty.hidden = false;
      DOM.favsActions.hidden = true;
      return;
    }

    DOM.favsEmpty.hidden = true;
    DOM.favsActions.hidden = false;

    state.favourites.forEach((movie) => {
      DOM.favsGrid.appendChild(createMovieCard(movie, state.favourites));
    });
  }

  function refreshFavCounts() {
    updateFavCountElements(state.favourites, DOM.favCount, DOM.favCount2);
  }

  function updatePagination() {
    const totalPages = Math.ceil(state.totalResults / CONFIG.RESULTS_PER_PAGE);

    if (totalPages <= 1) {
      DOM.pagination.hidden = true;
      return;
    }

    DOM.pagination.hidden = false;
    DOM.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
    DOM.prevBtn.disabled = state.currentPage === 1;
    DOM.nextBtn.disabled = state.currentPage === totalPages;
  }

  /* ----- Search ----- */

  async function handleSearch(query, page = 1, options = {}) {
    const { updateQuery = true, genre = state.currentGenre } = options;

    if (updateQuery) {
      state.currentQuery = query.trim();
    }

    const baseQ = state.currentQuery.trim();
    const searchTerm = buildSearchQuery(
      baseQ || (genre === 'all' ? CONFIG.DEFAULT_SEARCH : ''),
      genre
    );

    if (!searchTerm.trim()) return;

    state.currentPage = page;
    searchAbort?.abort();
    searchAbort = new AbortController();

    showLoading();
    DOM.detailPanel.hidden = true;
    updateResultsLabel();

    try {
      const data = await searchMovies(searchTerm, page, searchAbort.signal);
      state.allMovies = data.Search || [];
      state.totalResults = parseInt(data.totalResults, 10) || 0;

      DOM.resultsCount.textContent =
        state.totalResults > 0 ? ` · ${state.totalResults} found` : '';

      renderMovies(state.allMovies);
      updatePagination();

      const totalPages = Math.ceil(state.totalResults / CONFIG.RESULTS_PER_PAGE);
      DOM.searchHint.textContent =
        totalPages > 1
          ? `Page ${page} of ${totalPages} — sort applies to this page`
          : 'Press Enter or click Search to find movies';
    } catch (err) {
      if (err.name === 'AbortError') return;
      showError(err.message);
      DOM.resultsCount.textContent = '';
    }
  }

  function runSearchFromState(page = 1) {
    handleSearch(state.currentQuery, page, {
      updateQuery: false,
      genre: state.currentGenre,
    });
  }

  /* ----- Detail ----- */

  async function handleMovieClick(imdbID) {
    detailAbort?.abort();
    detailAbort = new AbortController();

    showDetailLoading(detailDom);

    try {
      const movie = await fetchMovieDetail(imdbID, detailAbort.signal);
      state.selectedMovie = movie;
      populateDetailPanel(movie, detailDom, state.favourites);
    } catch (err) {
      if (err.name === 'AbortError') return;
      DOM.detailTitle.textContent = 'Could not load details.';
      DOM.detailPlot.textContent = err.message;
    }
  }

  /* ----- Favourites ----- */

  function syncFavourites() {
    saveFavourites(state.favourites);
    renderFavourites();
    refreshFavCounts();
  }

  function toggleFavourite(movie) {
    const normalized = normalizeFavourite(movie);
    const index = state.favourites.findIndex(
      (f) => f.imdbID === normalized.imdbID
    );

    if (index === -1) {
      state.favourites.push(normalized);
    } else {
      state.favourites.splice(index, 1);
    }

    syncFavourites();
    updateCardFavState(normalized.imdbID);

    if (
      state.selectedMovie &&
      state.selectedMovie.imdbID === normalized.imdbID
    ) {
      const isFav = state.favourites.some(
        (f) => f.imdbID === normalized.imdbID
      );
      updateDetailFavButton(DOM.detailFavBtn, isFav);
    }
  }

  function updateCardFavState(imdbID) {
    const isFav = state.favourites.some((f) => f.imdbID === imdbID);
    document
      .querySelectorAll(`.movie-card__fav-btn[data-imdb-id="${imdbID}"]`)
      .forEach((btn) => {
        btn.setAttribute('aria-pressed', String(isFav));
        btn.textContent = isFav ? '♥' : '♡';
      });
  }

  function findMovieForFav(imdbID) {
    return (
      state.allMovies.find((m) => m.imdbID === imdbID) ||
      state.favourites.find((m) => m.imdbID === imdbID)
    );
  }

  function resetGenreFilters() {
    state.currentGenre = 'all';
    DOM.filterBtns.forEach((b) => {
      b.classList.remove('filter-btn--active');
      b.setAttribute('aria-pressed', 'false');
    });
    const allBtn = document.querySelector('[data-genre="all"]');
    allBtn?.classList.add('filter-btn--active');
    allBtn?.setAttribute('aria-pressed', 'true');
  }

  /* ----- Events ----- */
  
  function initEvents() {
    DOM.searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = DOM.searchInput.value.trim();
      if (!query) return;
      resetGenreFilters();
      state.currentQuery = query;
      handleSearch(query, 1, { genre: 'all' });
    });

    DOM.resultsGrid.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.movie-card__fav-btn');
      if (favBtn) {
        e.stopPropagation();
        const movie = findMovieForFav(favBtn.dataset.imdbId);
        if (movie) toggleFavourite(movie);
        return;
      }
      const card = e.target.closest('.movie-card');
      if (card) handleMovieClick(card.dataset.imdbId);
    });

    DOM.resultsGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const card = e.target.closest('.movie-card');
      if (card) handleMovieClick(card.dataset.imdbId);
    });

    DOM.favsGrid.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.movie-card__fav-btn');
      if (favBtn) {
        e.stopPropagation();
        const movie = state.favourites.find(
          (m) => m.imdbID === favBtn.dataset.imdbId
        );
        if (movie) toggleFavourite(movie);
        return;
      }
      const card = e.target.closest('.movie-card');
      if (card) handleMovieClick(card.dataset.imdbId);
    });

    DOM.detailFavBtn.addEventListener('click', () => {
      if (state.selectedMovie) toggleFavourite(state.selectedMovie);
    });

    DOM.filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        DOM.filterBtns.forEach((b) => {
          b.classList.remove('filter-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('filter-btn--active');
        btn.setAttribute('aria-pressed', 'true');
        state.currentGenre = btn.dataset.genre;
        runSearchFromState(1);
      });
    });

    DOM.sortSelect.addEventListener('change', () => {
      renderMovies(state.allMovies);
    });

    DOM.prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        runSearchFromState(state.currentPage - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    DOM.nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(
        state.totalResults / CONFIG.RESULTS_PER_PAGE
      );
      if (state.currentPage < totalPages) {
        runSearchFromState(state.currentPage + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    DOM.retryBtn.addEventListener('click', () => runSearchFromState(state.currentPage));

    DOM.clearFavsBtn.addEventListener('click', () => {
      if (!confirm('Clear all saved favourites?')) return;
      state.favourites = [];
      syncFavourites();
      document.querySelectorAll('.movie-card__fav-btn').forEach((btn) => {
        btn.setAttribute('aria-pressed', 'false');
        btn.textContent = '♡';
      });
    });

    initMobileNav(DOM.navToggle, DOM.siteNav);
  }

  function checkApiConfig() {
    if (!DOM.configBanner) return;
    if (!CONFIG.API_KEY || CONFIG.API_KEY === 'YOUR_OMDB_API_KEY') {
      DOM.configBanner.hidden = false;
    }
  }

  function init() {
    setFooterYear(DOM.yearEl);
    state.favourites = loadFavourites();
    renderFavourites();
    refreshFavCounts();
    initEvents();
    checkApiConfig();

    state.currentQuery = '';
    state.currentGenre = 'all';
    DOM.resultsLabel.textContent = 'Popular picks';
    handleSearch(CONFIG.DEFAULT_SEARCH, 1, {
      updateQuery: false,
      genre: 'all',
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
