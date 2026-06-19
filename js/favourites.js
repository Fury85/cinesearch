/*  CineSearch — favourites.js  */

(function () {
  'use strict';

  const {
    loadFavourites,
    saveFavourites,
    normalizeFavourite,
    fetchMovieDetail,
    createMovieCard,
    updateFavCountElements,
    updateDetailFavButton,
    populateDetailPanel,
    showDetailLoading,
    initMobileNav,
    setFooterYear,
  } = window.CineSearch;

  const state = {
    favourites: [],
    selectedMovie: null,
  };

  let detailAbort = null;

  const DOM = {
    favsGrid: document.getElementById('js-favs-grid'),
    favsEmpty: document.getElementById('js-favs-empty'),
    favsActions: document.getElementById('js-favs-actions'),
    clearFavsBtn: document.getElementById('js-clear-favs-btn'),
    favCount: document.getElementById('js-fav-count'),
    favCount2: document.getElementById('js-fav-count-2'),
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
    navToggle: document.getElementById('js-nav-toggle'),
    siteNav: document.getElementById('site-nav'),
    yearEl: document.getElementById('js-year'),
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

    if (
      state.selectedMovie &&
      state.selectedMovie.imdbID === normalized.imdbID
    ) {
      const isFav = state.favourites.some(
        (f) => f.imdbID === normalized.imdbID
      );
      updateDetailFavButton(DOM.detailFavBtn, isFav);
      if (!isFav) DOM.detailPanel.hidden = true;
    }
  }

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

  function initEvents() {
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

    DOM.favsGrid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const card = e.target.closest('.movie-card');
      if (card) handleMovieClick(card.dataset.imdbId);
    });

    DOM.detailFavBtn.addEventListener('click', () => {
      if (state.selectedMovie) toggleFavourite(state.selectedMovie);
    });

    DOM.clearFavsBtn.addEventListener('click', () => {
      if (!confirm('Clear all saved favourites?')) return;
      state.favourites = [];
      syncFavourites();
      DOM.detailPanel.hidden = true;
      state.selectedMovie = null;
    });

    initMobileNav(DOM.navToggle, DOM.siteNav);
  }

  function init() {
    setFooterYear(DOM.yearEl);
    state.favourites = loadFavourites();
    renderFavourites();
    refreshFavCounts();
    initEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
