import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Search, ArrowUpRight, Play, Info, Clapperboard,
  Star, X, ChevronLeft, ChevronRight, Film, Compass,
  Tv, CalendarDays, Layers, LoaderCircle, WandSparkles,
  Maximize, ExternalLink, Menu, Bookmark, History, Clock, Trash2
} from 'lucide-react'
import './App.css'
import UpdateChecker from './UpdateChecker.jsx'
import { getWatchLibrary, addToHistory, removeFromHistory, clearHistory, addToMyList, removeFromMyList, isInMyList } from './WatchLibrary.jsx'
/* ------------------------------------------------------------------
   API (unchanged): /api/movies  and  /api/player
------------------------------------------------------------------ */
const API_URL = 'https://cineverse-49q.pages.dev/api/movies'
const PLAYER_API_URL = 'https://cineverse-49q.pages.dev/api/player'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/'

const MEDIA = {
  movie: {
    label: 'Movies',
    singular: 'Movie',
    icon: Film,
    genres: 'genres',
    trending: 'trending',
    popular: 'popular',
    search: 'search',
    details: 'details'
  },
  tv: {
    label: 'TV Series',
    singular: 'TV Series',
    icon: Tv,
    genres: 'genres-tv',
    trending: 'trending-tv',
    popular: 'popular-tv',
    search: 'search-tv',
    details: 'details-tv'
  },
  anime: {
    label: 'Anime',
    singular: 'Anime',
    icon: WandSparkles,
    genres: 'genres-tv',
    trending: 'anime-series',
    popular: 'anime-series',
    search: 'search-anime-series',
    details: 'details-tv'
  }
}

const reveal = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 }
}

function posterUrl(path, size = 'w500') {
  if (!path) return ''
  return `${IMAGE_BASE}${size}${path.startsWith('/') ? path : `/${path}`}`
}

function badgeText(mediaType) {
  if (mediaType === 'tv') return 'TV Series'
  if (mediaType === 'anime') return 'Anime'
  return 'Movie'
}

function formatMedia(item, genreMap = {}, mediaType = 'movie') {
  const genreNames = item.genres?.map(g => g.name)
    || (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean)

  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || item.original_title
      || item.original_name || 'Untitled',
    year: (item.release_date || item.first_air_date || '')
      .slice(0, 4) || 'N/A',
    rating: Number(item.vote_average || 0).toFixed(1),
    genre: genreNames[0] || (
      mediaType === 'tv' ? 'TV Series'
        : mediaType === 'anime' ? 'Anime'
          : 'Movie'
    ),
    genres: genreNames,
    image: item.poster_path || '',
    backdrop: item.backdrop_path || '',
    description: item.overview || 'No description is available yet.',
    original: item
  }
}

/* ------------------------------------------------------------------
   Logo
------------------------------------------------------------------ */
function LogoMark({ size = 36, uid = 'nav' }) {
  const gradId = `cv-premium-${uid}`;

  return (
    <svg
      className="logo-svg"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id={gradId} x1="5" y1="4" x2="35" y2="36">
          <stop offset="0%" stopColor="#ff526f" />
          <stop offset="100%" stopColor="#a50025" />
        </linearGradient>
      </defs>

      <path
        d="M29 10.5 A14 14 0 1 0 29 29.5"
        stroke={`url(#${gradId})`}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      <path
        d="M17 13.5 L29 20 L17 26.5 Z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}



function Logo({ onClick, uid }) {
  return (
    <button
      className="logo"
      onClick={onClick}
      type="button"
      aria-label="CineVerse home"
    >
      <LogoMark uid={uid} />
      <span className="logo-word">
        Cine<strong>Verse</strong>
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------
   Poster card
------------------------------------------------------------------ */
function Reveal({ children, className = '' }) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={reveal}
      initial={reducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reducedMotion ? 0 : 0.35 }}
    >
      {children}
    </motion.div>
  )
}

function MediaCard({ item, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false)
  const Icon = MEDIA[item.mediaType]?.icon || Film

  return (
    <Reveal className="movie-card">
      <button
        className="poster-wrap"
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`View ${item.title} details`}
      >
        {item.image && !imageFailed ? (
          <img
            src={posterUrl(item.image)}
            alt={item.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="poster-fallback">
            <Icon size={38} />
            <span>{item.title}</span>
          </div>
        )}

        <span className="rating">
          <Star size={12} fill="currentColor" />
          {item.rating}
        </span>

        <span className="poster-open">
          <span className="poster-play">
            <Play size={20} fill="currentColor" />
          </span>
        </span>
      </button>

      <div className="movie-info">
        <button
          className="movie-title"
          type="button"
          onClick={() => onSelect(item)}
        >
          {item.title}
        </button>

        <div className="movie-sub">
          <span>{item.year}</span>
          <span>{item.genre}</span>
        </div>
      </div>
    </Reveal>
  )
}

/* ------------------------------------------------------------------
   App
------------------------------------------------------------------ */
export default function App() {
  const [mediaMode, setMediaMode] = useState('movie')
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [watchLibrary, setWatchLibrary] = useState(() => getWatchLibrary())
  const [libraryView, setLibraryView] = useState('catalog')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState(1)

  const [playerUrl, setPlayerUrl] = useState('')
  const [playerLoading, setPlayerLoading] = useState(false)
  const [playerError, setPlayerError] = useState('')

  const [trailerOpen, setTrailerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)

  const [items, setItems] = useState([])
  const [genres, setGenres] = useState([])
  const [genreMap, setGenreMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [catalogType, setCatalogType] = useState('trending')

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1)
  const [seasonDetails, setSeasonDetails] = useState(null)
  const [seasonLoading, setSeasonLoading] = useState(false)

  const requestRef = useRef(0)
  const genreRequestRef = useRef(0)
  const detailsRequestRef = useRef(0)
  const playerWrapRef = useRef(null)
  const modalRef = useRef(null)
  const searchRef = useRef(null)
  const autoPlayRef = useRef(false)

  const isTV = mediaMode === 'tv'
  const isAnime = mediaMode === 'anime'
  const isEpisodic = isTV || isAnime
  const mediaLabel = MEDIA[mediaMode].label

  function refreshWatchLibrary() {
    setWatchLibrary(getWatchLibrary())
  }

  function toggleMyList(item) {
    if (!item) return

    if (isInMyList(item)) {
      removeFromMyList(item)
    } else {
      addToMyList(item)
    }

    refreshWatchLibrary()
  }

  function openLibraryItem(item) {
    if (!item) return
    setLibraryView('catalog')
    openMedia(item)
  }

  function saveWatchHistory(item, episodeInfo = {}) {
    if (!item) return
    addToHistory(item, episodeInfo)
    refreshWatchLibrary()
  }
  async function requestJSON(params, signal) {
    const query = new URLSearchParams(params)
    const response = await fetch(`${API_URL}?${query}`, { signal })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`)
    }

    return data
  }

  // Load the genre list for the selected category.
  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++genreRequestRef.current

    async function loadGenres() {
      setGenres([])
      setGenreMap({})

      try {
        const data = await requestJSON({
          type: MEDIA[mediaMode].genres
        }, controller.signal)

        if (requestId !== genreRequestRef.current) return

        const list = data.genres || data.results || []
        const map = {}

        list.forEach(genre => {
          map[genre.id] = genre.name
        })

        setGenres(list)
        setGenreMap(map)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Could not load genres:', err)
        }
      }
    }

    loadGenres()
    return () => controller.abort()
  }, [mediaMode])

  // Load search results, trending titles or popular titles.
  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++requestRef.current
    let timer

    
async function loadCatalog() {
  setLoading(true)
  setError('')

  try {
    let type

    if (search.trim()) {
      type = MEDIA[mediaMode].search
    } else if (catalogType === 'popular') {
      type = MEDIA[mediaMode].popular
    } else {
      type = MEDIA[mediaMode].trending
    }

    const params = { type, page: String(page) }

    if (search.trim()) {
      params.query = search.trim()
    }

    if (mediaMode === 'anime') {
      const commonParams = { page: String(page) }

      if (search.trim()) {
        commonParams.query = search.trim()
      }

      const [seriesData, movieData] = await Promise.all([
        requestJSON({
          ...commonParams,
          type: search.trim() ? 'search-anime-series' : 'anime-series'
        }, controller.signal),

        requestJSON({
          ...commonParams,
          type: search.trim() ? 'search-anime-movies' : 'anime-movies'
        }, controller.signal)
      ])

      if (requestId !== requestRef.current) return

      const series = (seriesData.results || []).map(item => ({
        ...formatMedia(item, genreMap, 'anime'),
        original: { ...item, _apiMediaType: 'tv' }
      }))

      const movies = (movieData.results || []).map(item => ({
        ...formatMedia(item, genreMap, 'anime'),
        original: { ...item, _apiMediaType: 'movie' }
      }))

      setItems([...series, ...movies])

      setTotalPages(
        Math.min(
          Math.max(
            Number(seriesData.total_pages || 1),
            Number(movieData.total_pages || 1)
          ),
          500
        )
      )

      return
    }

    const data = await requestJSON(params, controller.signal)

    if (requestId !== requestRef.current) return

    setItems(
      (data.results || []).map(item =>
        formatMedia(item, genreMap, mediaMode)
      )
    )

    setTotalPages(
      Math.min(Number(data.total_pages || 1), 500)
    )
  } catch (err) {
    if (err.name !== 'AbortError' && requestId === requestRef.current) {
      console.error('Could not load titles:', err)

      setError(
        mediaMode === 'anime'
          ? 'Could not load anime. Check your Anime API routes and connection.'
          : 'Could not load titles. Check your connection and try again.'
      )

      setItems([])
    }
  } finally {
    if (requestId === requestRef.current) {
      setLoading(false)
    }
  }
}


    timer = setTimeout(loadCatalog, search.trim() ? 350 : 0)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search, page, catalogType, mediaMode, genreMap])

  // Fetch seasons and episodes for TV series or anime.
  useEffect(() => {
    if (!selectedMedia || !['tv', 'anime'].includes(selectedMedia.mediaType)) {
      setSeasonDetails(null)
      setSeasonLoading(false)
      return
    }

    const seasons = selectedMedia.original?.seasons || []
    const available = seasons.filter(s => s.season_number > 0)

    if (!available.some(s => s.season_number === selectedSeasonNumber)) {
      setSeasonDetails(null)
      return
    }

    const controller = new AbortController()

    async function loadSeason() {
      setSeasonLoading(true)
      setSeasonDetails(null)

      try {
        const data = await requestJSON({
          type: 'season',
          id: String(selectedMedia.id),
          season: String(selectedSeasonNumber)
        }, controller.signal)

        setSeasonDetails(data)
      } catch (err) {
        if (err.name !== 'AbortError') setSeasonDetails(null)
      } finally {
        if (!controller.signal.aborted) setSeasonLoading(false)
      }
    }

    loadSeason()
    return () => controller.abort()
  }, [selectedMedia, selectedSeasonNumber])

  // Escape closes the modal (browser handles Escape first in fullscreen).
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        autoPlayRef.current = false
        setPlayerUrl('')
        setPlayerError('')
        setSelectedMedia(null)
        setTrailerOpen(false)
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    document.body.style.overflow = selectedMedia ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [selectedMedia])

  // Navbar turns solid after the page is scrolled a little.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // "Play" on the hero: open the title, then start the player once the
  // details have loaded.
  useEffect(() => {
    if (autoPlayRef.current && selectedMedia && !detailsLoading) {
      autoPlayRef.current = false
      playSelectedMedia()
    }
  }, [selectedMedia, detailsLoading])

  const filteredItems = useMemo(() => {
    if (selectedGenre === 'All') return items

    return items.filter(item =>
      item.genres.includes(selectedGenre) || item.genre === selectedGenre
    )
  }, [items, selectedGenre])

  const heroCandidates = useMemo(
    () => items.filter(item => item.backdrop).slice(0, 5),
    [items]
  )

  const heroItem = heroCandidates[heroIndex] || heroCandidates[0] || null

  const trailer = useMemo(() => {
    const videos = selectedMedia?.original?.videos?.results || []

    return (
      videos.find(
        video =>
          video.site === 'YouTube' &&
          video.type === 'Trailer' &&
          video.official
      ) ||
      videos.find(
        video =>
          video.site === 'YouTube' &&
          ['Trailer', 'Teaser'].includes(video.type)
      )
    )
  }, [selectedMedia])

  function changeCatalog(type) {
    setCatalogType(type)
    setPage(1)
    setSearch('')
    setSelectedGenre('All')
    setMenuOpen(false)
  }

  function switchMedia(type) {
    autoPlayRef.current = false
    setMediaMode(type)
    setCatalogType('trending')
    setPage(1)
    setSearch('')
    setSelectedGenre('All')
    setHeroIndex(0)
    setMenuOpen(false)
    setPlayerUrl('')
    setPlayerError('')
    setSelectedMedia(null)
    setTrailerOpen(false)
  }

  function focusSearch() {
    setMenuOpen(false)
    document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 450)
  }

  async function playSelectedMedia(override = {}) {
    if (!selectedMedia) return

    const season = override.season ?? selectedSeasonNumber
    const episode = override.episode ?? selectedEpisodeNumber

    setPlayerLoading(true)
    setPlayerError('')
    setPlayerUrl('')

    try {
      const params = new URLSearchParams({
        mediaType: selectedMedia.mediaType,
        id: String(selectedMedia.id),
        season: String(season),
        episode: String(episode),
      })

      const response = await fetch(`${PLAYER_API_URL}?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Player load failed')
      }

      if (!data.playerUrl) {
        throw new Error('Player URL was not returned by the server')
      }

      setPlayerUrl(data.playerUrl)
      saveWatchHistory(selectedMedia, {
        season: selectedMedia.mediaType === 'movie' ? null : season,
        episode: selectedMedia.mediaType === 'movie' ? null : episode,
      })
      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setPlayerError(err.message || 'Player load failed')
    } finally {
      setPlayerLoading(false)
    }
  }

  function goFullscreen() {
    const el = playerWrapRef.current
    if (!el) return

    const request = el.requestFullscreen || el.webkitRequestFullscreen

    if (request) {
      request.call(el)
    } else if (playerUrl) {
      window.open(playerUrl, '_blank', 'noopener,noreferrer')
    }
  }

  async function openMedia(item) {
    const requestId = ++detailsRequestRef.current

    setPlayerUrl('')
    setPlayerError('')
    setSelectedEpisodeNumber(1)
    setSelectedMedia({ ...item })
    setDetailsLoading(true)
    setTrailerOpen(false)
    setSeasonDetails(null)
    setSelectedSeasonNumber(1)

    try {
      const detailType =
        item.mediaType === 'anime'
          ? item.original?._apiMediaType === 'tv'
            ? 'details-tv'
            : 'details'
          : MEDIA[item.mediaType].details

      const data = await requestJSON({
        type: detailType,
        id: String(item.id)
      })

      if (requestId !== detailsRequestRef.current) return

      const detailItem = formatMedia(data, genreMap, item.mediaType)

      setSelectedMedia(current => {
        if (
          !current ||
          current.id !== item.id ||
          current.mediaType !== item.mediaType
        ) {
          return current
        }

        return detailItem
      })

      const firstSeason = (data.seasons || [])
        .find(season => season.season_number > 0)

      if (firstSeason) {
        setSelectedSeasonNumber(firstSeason.season_number)
      }
    } catch (err) {
      if (requestId === detailsRequestRef.current) {
        console.error('Could not load details:', err)
      }
    } finally {
      if (requestId === detailsRequestRef.current) {
        setDetailsLoading(false)
      }
    }
  }

  function playFromHero(item) {
    autoPlayRef.current = true
    openMedia(item)
  }

  function closeMedia() {
    ++detailsRequestRef.current
    autoPlayRef.current = false

    setPlayerUrl('')
    setPlayerError('')
    setSelectedEpisodeNumber(1)
    setSelectedMedia(null)
    setTrailerOpen(false)
    setSeasonDetails(null)
    setDetailsLoading(false)
  }

  function openTrailer() {
    if (trailer?.key) {
      setTrailerOpen(true)
      return
    }

    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${selectedMedia?.title || ''} official trailer`
      )}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const availableSeasons = (selectedMedia?.original?.seasons || [])
    .filter(season => season.season_number > 0)

  const showHero =
    !search.trim() && !error && page === 1 && (Boolean(heroItem) || loading)

  return (
    <div className="app">
      <UpdateChecker />
      {/* ---------------- Navbar ---------------- */}
      <header className={`navbar ${scrolled || menuOpen ? 'solid' : ''}`}>
        <Logo uid="nav" onClick={() => switchMedia('movie')} />

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {Object.entries(MEDIA).map(([key, media]) => {
            const Icon = media.icon

            return (
              <button
                key={key}
                type="button"
                className={mediaMode === key && catalogType === 'trending' ? 'active' : ''}
                onClick={() => switchMedia(key)}
              >
                <Icon size={15} /> {media.label}
              </button>
            )
          })}

          <button
            type="button"
            className={catalogType === 'popular' ? 'active' : ''}
            onClick={() => changeCatalog('popular')}
          >
            <Star size={15} /> Popular
          </button>


          <button
            type="button"
            className={libraryView === 'myList' ? 'active' : ''}
            onClick={() => {
              setLibraryView('myList')
              setMenuOpen(false)
              refreshWatchLibrary()
              document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <Bookmark size={15} /> My List
          </button>

          <button
            type="button"
            className={libraryView === 'history' ? 'active' : ''}
            onClick={() => {
              setLibraryView('history')
              setMenuOpen(false)
              refreshWatchLibrary()
              document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <History size={15} /> History
          </button>

          <a
            href="/download/index.html"
            className="download-app-link"
          >
            <ArrowUpRight size={15} />
            Download App
          </a>


        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={focusSearch}
            aria-label="Search titles"
          >
            <Search size={19} />
          </button>

          <button
            type="button"
            className="icon-btn menu-toggle"
            onClick={() => setMenuOpen(open => !open)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main className={showHero ? '' : 'no-hero'}>
        {/* ---------------- Billboard hero ---------------- */}
        {showHero && (
          heroItem ? (
            <section className="hero" aria-label="Featured title">
              <img
                key={`${heroItem.mediaType}-${heroItem.id}`}
                className="hero-bg"
                src={posterUrl(heroItem.backdrop, 'w1280')}
                alt=""
              />
              <div className="hero-shade" />

              <div className="hero-content">
                <span className="hero-kind">
                  {badgeText(heroItem.mediaType)} Â· Trending now
                </span>

                <h1>{heroItem.title}</h1>

                <div className="hero-meta">
                  <span className="meta-rating">
                    <Star size={14} fill="currentColor" /> {heroItem.rating}
                  </span>
                  <span>{heroItem.year}</span>
                  <span>{heroItem.genre}</span>
                </div>

                <p>{heroItem.description}</p>

                <div className="hero-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => playFromHero(heroItem)}
                  >
                    <Play size={19} fill="currentColor" /> Play
                  </button>

                  <button
                    type="button"
                    className="btn btn-glass btn-lg"
                    onClick={() => openMedia(heroItem)}
                  >
                    <Info size={19} /> More info
                  </button>
                </div>
              </div>

              {heroCandidates.length > 1 && (
                <div className="hero-picker" role="tablist" aria-label="Featured titles">
                  {heroCandidates.map((candidate, index) => (
                    <button
                      key={`${candidate.mediaType}-${candidate.id}`}
                      type="button"
                      role="tab"
                      aria-selected={candidate === heroItem}
                      aria-label={candidate.title}
                      className={candidate === heroItem ? 'active' : ''}
                      onClick={() => setHeroIndex(index)}
                    >
                      <img
                        src={posterUrl(candidate.backdrop, 'w300')}
                        alt=""
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="hero hero-skeleton" aria-hidden="true">
              <LoaderCircle className="loading-icon" size={30} />
            </section>
          )
        )}

        {true && (
        <>
        {/* ---------------- Catalog ---------------- */}
        <section className="catalog" id="trending">
          <div className="catalog-head">
            <div>
              <h2>
                {search.trim()
                  ? `Search ${mediaLabel}`
                  : catalogType === 'popular'
                    ? `Popular ${mediaLabel}`
                    : `Trending ${mediaLabel}`}
              </h2>

              <p>
                {search.trim()
                  ? `Results for â€œ${search.trim()}â€`
                  : `Find something worth watching in our ${mediaLabel.toLowerCase()} collection.`}
              </p>
            </div>

            <div className="segmented" role="tablist" aria-label="Category">
              {Object.entries(MEDIA).map(([key, media]) => {
                const Icon = media.icon

                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={mediaMode === key}
                    className={mediaMode === key ? 'active' : ''}
                    onClick={() => switchMedia(key)}
                  >
                    <Icon size={15} /> {media.label}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="search-box">
            <Search size={19} />

            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={`Search ${mediaLabel.toLowerCase()}...`}
              aria-label={`Search ${mediaLabel}`}
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>

          {libraryView !== 'catalog' && (
            <div className="library-panel">
              <div className="catalog-head">
                <div>
                  <h2>
                    {libraryView === 'myList' ? 'My List' : 'Watch History'}
                  </h2>
                  <p>
                    {libraryView === 'myList'
                      ? `${watchLibrary.myList.length} saved titles`
                      : `${watchLibrary.history.length} recently played titles`}
                  </p>
                </div>

                {libraryView !== 'catalog' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setLibraryView('catalog')}
                  >
                    <ArrowUpRight size={15} /> Back to Browse
                  </button>
                )}

                {libraryView === 'history' && watchLibrary.history.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-glass btn-sm"
                    onClick={() => {
                      clearHistory()
                      refreshWatchLibrary()
                    }}
                  >
                    <Trash2 size={15} /> Clear history
                  </button>
                )}
              </div>

              <div className="movie-grid">
                {(libraryView === 'myList'
                  ? watchLibrary.myList
                  : watchLibrary.history
                ).map(item => (
                  <div className="library-card" key={`${item.mediaType}-${item.id}-${item.season || 0}-${item.episode || 0}`}>
                    <MediaCard item={item} onSelect={openLibraryItem} />
                    <div className="library-card-actions">
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => {
                          if (libraryView === 'myList') {
                            removeFromMyList(item)
                          } else {
                            removeFromHistory(item)
                          }
                          refreshWatchLibrary()
                        }}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(libraryView === 'myList'
                ? watchLibrary.myList
                : watchLibrary.history
              ).length === 0 && (
                <div className="empty-state">
                  {libraryView === 'myList'
                    ? <Bookmark size={30} />
                    : <Clock size={30} />}
                  <h3>
                    {libraryView === 'myList' ? 'Your list is empty' : 'No watch history yet'}
                  </h3>
                  <p>
                    {libraryView === 'myList'
                      ? 'Save movies and series to find them here later.'
                      : 'Start playing a movie or episode and it will appear here.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setLibraryView('catalog')}
                  >
                    Browse titles
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="genre-filters" id="categories">
            <button
              type="button"
              className={`genre-chip ${selectedGenre === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedGenre('All')}
            >
              All
            </button>

            {genres.map(genre => (
              <button
                key={genre.id}
                type="button"
                className={`genre-chip ${selectedGenre === genre.name ? 'active' : ''}`}
                onClick={() => setSelectedGenre(genre.name)}
              >
                {genre.name}
              </button>
            ))}
          </div>

          {error && (
            <div className="empty-state">
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPage(current => current)
                  setCatalogType(current => current)
                  setError('')
                }}
              >
                Try again
              </button>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <LoaderCircle className="loading-icon" size={30} />
              <p>Loading {mediaLabel.toLowerCase()}...</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="movie-grid">
                {filteredItems.map(item => (
                  <MediaCard
                    key={`${item.mediaType}-${item.id}`}
                    item={item}
                    onSelect={openMedia}
                  />
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="empty-state">
                  <Compass size={30} />
                  <h3>No titles found</h3>
                  <p>Try another search or select a different genre.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSearch('')
                      setSelectedGenre('All')
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {!search.trim() && totalPages > 1 && (
                <div className="pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage(current => Math.max(1, current - 1))
                      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} /> Previous
                  </button>

                  <span>Page {page} of {totalPages}</span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage(current => Math.min(totalPages, current + 1))
                      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    aria-label="Next page"
                  >
                    Next <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        </>
        )}

        <section className="cta-band">
          <div>
            <h2>Every story starts somewhere.</h2>
            <p>Movies, TV series and anime, all in one place.</p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              switchMedia(
                mediaMode === 'movie' ? 'anime'
                  : mediaMode === 'anime' ? 'tv' : 'movie'
              )
            }
          >
            {mediaMode === 'movie'
              ? 'Explore Anime'
              : mediaMode === 'anime'
                ? 'Explore TV Series'
                : 'Explore Movies'}
            <ArrowUpRight size={17} />
          </button>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="footer">
        <div className="footer-brand">
          <Logo uid="foot" onClick={() => switchMedia('movie')} />
          <p>Discover responsibly. Watch through authorized sources.</p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          {Object.entries(MEDIA).map(([key, media]) => (
            <button key={key} type="button" onClick={() => switchMedia(key)}>
              {media.label}
            </button>
          ))}
          <button type="button" onClick={() => changeCatalog('popular')}>
            Popular
          </button>
        </nav>

        <p className="footer-legal">
          Movie, TV and anime metadata provided by TMDB. CineVerse is not
          endorsed or certified by TMDB.
          <span>Â© {new Date().getFullYear()} CineVerse</span>
        </p>
      </footer>

      {/* ---------------- Details + player modal ---------------- */}
      {selectedMedia && (
        <div
          className="movie-modal"
          onClick={event => {
            if (event.target === event.currentTarget) closeMedia()
          }}
          role="presentation"
        >
          <div
            className="modal-content"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMedia.title} details`}
          >
            <button
              type="button"
              className="modal-close"
              onClick={closeMedia}
              aria-label="Close details"
            >
              <X size={20} />
            </button>

            {playerUrl ? (
              <section className="player-section">
                <div className="player-frame" ref={playerWrapRef}>
                  <iframe
                    src={playerUrl}
                    title={`${selectedMedia.title || 'Movie'} player`}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>

                <div className="player-bar">
                  <span className="player-title">
                    {selectedMedia.title || 'Now Playing'}
                    {isEpisodic &&
                      ` Â· S${selectedSeasonNumber} E${selectedEpisodeNumber}`}
                  </span>

                  <div className="player-actions">
                    <button
                      type="button"
                      className="btn btn-glass btn-sm"
                      onClick={goFullscreen}
                    >
                      <Maximize size={15} /> Fullscreen
                    </button>

                    <button
                      type="button"
                      className="btn btn-glass btn-sm"
                      onClick={() => setPlayerUrl('')}
                    >
                      <X size={15} /> Close player
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <div
                className="modal-cover"
                style={{
                  backgroundImage: selectedMedia.backdrop
                    ? `url("${posterUrl(selectedMedia.backdrop, 'w1280')}")`
                    : 'linear-gradient(135deg, #3a1420, #141416)'
                }}
              >
                <div className="modal-cover-fade" />
                <span className="kind-pill">
                  {badgeText(selectedMedia.mediaType)}
                </span>
              </div>
            )}

            <div className="modal-details">
              <h2>{selectedMedia.title}</h2>

              <div className="modal-meta">
                <span className="meta-rating">
                  <Star size={14} fill="currentColor" /> {selectedMedia.rating}
                </span>
                <span><CalendarDays size={14} /> {selectedMedia.year}</span>

                {(selectedMedia.genres || []).map(genre => (
                  <span key={genre}>{genre}</span>
                ))}

                {isEpisodic && selectedMedia.original?.number_of_seasons && (
                  <span>
                    <Layers size={14} />
                    {selectedMedia.original?.number_of_seasons} seasons
                  </span>
                )}
              </div>

              <p className="modal-description">
                {selectedMedia.description}
              </p>

              {detailsLoading && (
                <div className="details-loading">
                  <LoaderCircle className="loading-icon" size={20} />
                  Loading details...
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => playSelectedMedia()}
                  disabled={playerLoading}
                >
                  <Play size={17} fill="currentColor" />
                  {playerLoading ? 'Loading player...' : 'Watch now'}
                </button>

                <button type="button" className="btn btn-secondary" onClick={openTrailer}>
                  <Clapperboard size={17} /> Trailer
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => toggleMyList(selectedMedia)}
                >
                  <Bookmark size={17} />
                  {isInMyList(selectedMedia) ? 'Remove from My List' : 'Add to My List'}
                </button>

                {selectedMedia.original?.homepage && (
                  <a
                    className="btn btn-secondary"
                    href={selectedMedia.original?.homepage}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official website <ArrowUpRight size={16} />
                  </a>
                )}
              </div>

              {playerError && (
                <p className="player-error" role="alert">
                  {playerError}
                </p>
              )}

              {isEpisodic && availableSeasons.length > 0 && (
                <section className="seasons-section">
                  <div className="season-heading">
                    <h3>Episodes</h3>
                    <span>{availableSeasons.length} seasons</span>
                  </div>

                  <label className="season-select-label" htmlFor="seasonSelect">
                    Choose a season
                  </label>

                  <select
                    id="seasonSelect"
                    className="season-select"
                    value={selectedSeasonNumber}
                    onChange={event =>
                      setSelectedSeasonNumber(Number(event.target.value))
                    }
                  >
                    {availableSeasons.map(season => (
                      <option key={season.id} value={season.season_number}>
                        {season.name || `Season ${season.season_number}`}
                      </option>
                    ))}
                  </select>

                  {seasonLoading && (
                    <div className="details-loading">
                      <LoaderCircle className="loading-icon" size={20} />
                      Loading episodes...
                    </div>
                  )}

                  {!seasonLoading && seasonDetails && (
                    <div className="episode-list">
                      {(seasonDetails.episodes || []).map(episode => (
                        <article
                          className={`episode-card ${selectedEpisodeNumber === episode.episode_number ? 'active' : ''}`}
                          key={episode.id}
                          onClick={() => {
                            setSelectedEpisodeNumber(episode.episode_number)
                            playSelectedMedia({
                              season: selectedSeasonNumber,
                              episode: episode.episode_number,
                            })
                          }}
                        >
                          {episode.still_path ? (
                            <img
                              src={posterUrl(episode.still_path, 'w300')}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <div className="episode-placeholder">
                              <Play size={20} />
                            </div>
                          )}

                          <div className="episode-info">
                            <div className="episode-number">
                              S{String(
                                episode.season_number ?? selectedSeasonNumber
                              ).padStart(2, '0')}
                              {' '}E{String(episode.episode_number).padStart(2, '0')}
                              {episode.air_date ? ` Â· ${episode.air_date}` : ''}
                            </div>

                            <h4>
                              {episode.name || `Episode ${episode.episode_number}`}
                            </h4>

                            <p>
                              {episode.overview || 'Episode description is not available.'}
                            </p>

                            {episode.vote_average > 0 && (
                              <span className="episode-rating">
                                <Star size={12} fill="currentColor" />
                                {Number(episode.vote_average).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </article>
                      ))}

                      {(seasonDetails.episodes || []).length === 0 && (
                        <p className="muted-note">
                          No episode information is available for this season.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {trailerOpen && trailer?.key && (
                <div className="trailer-section">
                  <div className="trailer-heading">
                    <h3>Official trailer</h3>
                    <button
                      type="button"
                      onClick={() => setTrailerOpen(false)}
                      aria-label="Close trailer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="trailer-frame">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}`}
                      title={`${selectedMedia.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <p className="modal-disclaimer">
                Metadata and images provided by TMDB.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}















