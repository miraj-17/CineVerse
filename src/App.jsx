
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Search, ArrowUpRight, Play, Sparkles, Clapperboard,
  Star, X, ChevronLeft, ChevronRight, Film, Compass,
  Tv, CalendarDays, Layers, LoaderCircle, WandSparkles
} from 'lucide-react'
import './App.css'

const API_URL = '/api/movies'
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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

function posterUrl(path, size = 'w500') {
  if (!path) return ''
  return `${IMAGE_BASE}${size}${path.startsWith('/') ? path : `/${path}`}`
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

function Reveal({ children, className = '', delay = 0 }) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={reveal}
      initial={reducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reducedMotion ? 0 : 0.45, delay }}
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
            <Icon size={42} />
            <span>{item.title}</span>
          </div>
        )}

        <span className="media-type-badge">
          {item.mediaType === 'tv'
            ? 'TV SERIES'
            : item.mediaType === 'anime'
              ? 'ANIME'
              : 'MOVIE'}
        </span>

        <span className="rating">
          <Star size={13} fill="currentColor" />
          {item.rating}
        </span>

        <span className="poster-open">
          <Play size={18} fill="currentColor" />
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

export default function App() {
  const [mediaMode, setMediaMode] = useState('movie')
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [selectedEpisodeNumber, setSelectedEpisodeNumber] = useState(1)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [playerTarget, setPlayerTarget] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const isTV = mediaMode === 'tv'
  const isAnime = mediaMode === 'anime'
  const isEpisodic = isTV || isAnime
  const mediaLabel = MEDIA[mediaMode].label

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

        if (search.trim()) params.query = search.trim()

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

        setItems((data.results || []).map(item =>
          formatMedia(item, genreMap, mediaMode)
        ))

        setTotalPages(Math.min(Number(data.total_pages || 1), 500))

      } catch (err) {
        if (err.name !== 'AbortError' && requestId === requestRef.current) {
          setError(
            mediaMode === 'anime'
              ? 'Could not load anime. Check your Anime API routes and connection.'
              : 'Could not load titles. Check your connection and try again.'
          )
          setItems([])
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false)
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

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
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

  const filteredItems = useMemo(() => {
    if (selectedGenre === 'All') return items

    return items.filter(item =>
      item.genres.includes(selectedGenre) || item.genre === selectedGenre
    )
  }, [items, selectedGenre])

  const trailer = useMemo(() => {
    const videos = selectedMedia?.original?.videos?.results || []

    return videos.find(video =>
      video.site === 'YouTube' &&
      video.type === 'Trailer' &&
      video.official
    ) || videos.find(video =>
      video.site === 'YouTube' &&
      ['Trailer', 'Teaser'].includes(video.type)
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
    setMediaMode(type)
    setCatalogType('trending')
    setPage(1)
    setSearch('')
    setSelectedGenre('All')
    setMenuOpen(false)
    setSelectedMedia(null)
    setTrailerOpen(false)
    setPlayerTarget(null)
  }

  async function openMedia(item) {
    const requestId = ++detailsRequestRef.current

    setSelectedMedia({ ...item })
    setDetailsLoading(true)
    setTrailerOpen(false)
    setPlayerTarget(null)
    setSeasonDetails(null)
    setSelectedEpisodeNumber(1)
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
      detailItem.original = {
        ...data,
        _apiMediaType: item.original?._apiMediaType || (item.mediaType === 'tv' ? 'tv' : 'movie')
      }

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

  function closeMedia() {
    ++detailsRequestRef.current
    setSelectedMedia(null)
    setTrailerOpen(false)
    setPlayerTarget(null)
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

  function playSelectedMovie() {
    if (!selectedMedia) return
    const actualType = selectedMedia.mediaType === 'anime'
      ? (selectedMedia.original?._apiMediaType || 'tv')
      : selectedMedia.mediaType

    setPlayerTarget({
      type: actualType === 'movie' ? 'movie' : 'tv',
      id: selectedMedia.id,
      season: selectedSeasonNumber,
      episode: selectedEpisodeNumber,
      title: selectedMedia.title
    })
    setTrailerOpen(false)
  }

  function playEpisode(episode) {
    if (!selectedMedia) return
    const actualType = selectedMedia.mediaType === 'anime'
      ? (selectedMedia.original?._apiMediaType || 'tv')
      : selectedMedia.mediaType

    if (actualType === 'movie') {
      playSelectedMovie()
      return
    }

    setSelectedEpisodeNumber(episode.episode_number)
    setPlayerTarget({
      type: 'tv',
      id: selectedMedia.id,
      season: episode.season_number ?? selectedSeasonNumber,
      episode: episode.episode_number,
      title: `${selectedMedia.title} — ${episode.name || `Episode ${episode.episode_number}`}`
    })
    setTrailerOpen(false)
  }

  const availableSeasons = (selectedMedia?.original?.seasons || [])
    .filter(season => season.season_number > 0)

  const MediaIcon = MEDIA[mediaMode].icon

  return (
    <div className="app">
      <div className="ambient-glow" aria-hidden="true" />

      <header className="navbar">
        <button
          className="logo"
          onClick={() => switchMedia('movie')}
          type="button"
          aria-label="CineVerse home"
        >
          <span className="logo-mark">
            <Clapperboard size={21} />
          </span>
          <span>CINE<span className="logo-accent">VERSE</span></span>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {Object.entries(MEDIA).map(([key, media]) => {
            const Icon = media.icon

            return (
              <button
                key={key}
                className={mediaMode === key && catalogType === 'trending' ? 'active' : ''}
                onClick={() => switchMedia(key)}
              >
                <Icon size={15} /> {media.label}
              </button>
            )
          })}

          <button
            className={catalogType === 'popular' ? 'active' : ''}
            onClick={() => changeCatalog('popular')}
          >
            <Star size={15} /> Popular
          </button>

          <a href="#categories" onClick={() => setMenuOpen(false)}>
            <Compass size={15} /> Discover
          </a>
        </nav>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(open => !open)}
          aria-label="Toggle navigation"
          type="button"
        >
          {menuOpen ? <X size={21} /> : <span>☰</span>}
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <Sparkles size={15} /> YOUR NEXT OBSESSION
            </div>

            <h1>
              Stories that
              <br />
              <span>stay with you.</span>
            </h1>

            <p>
              Discover extraordinary movies, unforgettable series and
              incredible anime worlds. Find your next favorite story.
            </p>

            <div className="hero-actions">
              <button
                className="btn btn-primary"
                onClick={() => document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play size={17} fill="currentColor" /> Explore {mediaLabel}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => switchMedia(
                  mediaMode === 'movie' ? 'anime'
                    : mediaMode === 'anime' ? 'tv' : 'movie'
                )}
              >
                {mediaMode === 'movie'
                  ? <WandSparkles size={17} />
                  : mediaMode === 'anime'
                    ? <Tv size={17} />
                    : <Film size={17} />}
                {mediaMode === 'movie'
                  ? 'Explore Anime'
                  : mediaMode === 'anime'
                    ? 'Explore TV Series'
                    : 'Explore Movies'}
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="hero-note">
              <span className="hero-dot" />
              Movies · Series · Anime
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-poster">
              <MediaIcon size={76} />
            </div>
            <span className="hero-star star-one">✦</span>
            <span className="hero-star star-two">✧</span>
          </div>
        </section>

        <section className="stats-strip">
          <div><strong>Movies</strong><span>Blockbuster discoveries</span></div>
          <div><strong>TV Series</strong><span>Stories across seasons</span></div>
          <div><strong>Anime</strong><span>Worlds beyond imagination</span></div>
        </section>

        <section className="movie-section" id="trending">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} /> THE COLLECTION
              </div>

              <h2>
                {search.trim()
                  ? `Search ${mediaLabel}`
                  : catalogType === 'popular'
                    ? `Popular ${mediaLabel}`
                    : `Trending ${mediaLabel}`}
              </h2>

              <p>
                {search.trim()
                  ? `Results for “${search.trim()}”`
                  : `Find something worth watching in our ${mediaLabel.toLowerCase()} collection.`}
              </p>
            </div>

            <div className="catalog-switch">
              {Object.entries(MEDIA).map(([key, media]) => {
                const Icon = media.icon

                return (
                  <button
                    key={key}
                    className={mediaMode === key ? 'active' : ''}
                    onClick={() => switchMedia(key)}
                  >
                    <Icon size={15} /> {media.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="search-panel">
            <label className="search-box">
              <Search size={19} />

              <input
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
                  <X size={17} />
                </button>
              )}
            </label>
          </div>

          <div className="genre-filters" id="categories">
            <button
              className={`genre-chip ${selectedGenre === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedGenre('All')}
            >
              All {mediaLabel}
            </button>

            {genres.map(genre => (
              <button
                key={genre.id}
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
              <LoaderCircle className="loading-icon" size={32} />
              <p>Discovering {mediaLabel.toLowerCase()}...</p>
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
                  <Compass size={32} />
                  <h3>No titles found</h3>
                  <p>Try another search or select a different genre.</p>
                  <button
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

          <p className="tmdb-note">
            Movie, TV and anime metadata provided by TMDB.
            CineVerse is not endorsed or certified by TMDB.
          </p>
        </section>

        <section className="discovery-banner">
          <div>
            <div className="eyebrow">
              <Sparkles size={14} /> KEEP EXPLORING
            </div>
            <h2>Every story starts somewhere.</h2>
            <p>Explore movies, TV series and anime in one place.</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => switchMedia(
              mediaMode === 'movie' ? 'anime'
                : mediaMode === 'anime' ? 'tv' : 'movie'
            )}
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

      <footer className="footer">
        <button
          className="logo footer-logo"
          onClick={() => switchMedia('movie')}
          type="button"
        >
          <span className="logo-mark"><Clapperboard size={19} /></span>
          <span>CINE<span className="logo-accent">VERSE</span></span>
        </button>

        <p>Discover responsibly. Watch through authorized sources.</p>
        <span>© {new Date().getFullYear()} CineVerse</span>
      </footer>

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
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMedia.title} details`}
          >
            <button
              className="modal-close"
              onClick={closeMedia}
              aria-label="Close details"
            >
              <X size={22} />
            </button>

            <div
              className="modal-backdrop"
              style={{
                backgroundImage: selectedMedia.backdrop
                  ? `linear-gradient(0deg, #101019 0%, #10101935 100%), url("${posterUrl(selectedMedia.backdrop, 'w1280')}")`
                  : 'linear-gradient(135deg, #392e63, #151522)'
              }}
            >
              <span className="media-type-badge">
                {selectedMedia.mediaType === 'tv'
                  ? 'TV SERIES'
                  : selectedMedia.mediaType === 'anime'
                    ? 'ANIME'
                    : 'MOVIE'}
              </span>
            </div>

            <div className="modal-details">
              <div className="eyebrow">
                {selectedMedia.mediaType === 'anime'
                  ? <WandSparkles size={15} />
                  : selectedMedia.mediaType === 'tv'
                    ? <Tv size={15} />
                    : <Film size={15} />}
                {selectedMedia.mediaType === 'anime'
                  ? 'ANIME DETAILS'
                  : selectedMedia.mediaType === 'tv'
                    ? 'SERIES DETAILS'
                    : 'MOVIE DETAILS'}
              </div>

              <h2>{selectedMedia.title}</h2>

              <div className="modal-meta">
                <span><Star size={15} fill="currentColor" /> {selectedMedia.rating}</span>
                <span><CalendarDays size={15} /> {selectedMedia.year}</span>

                {selectedMedia.genres.map(genre => (
                  <span key={genre}>{genre}</span>
                ))}

                {isEpisodic && selectedMedia.original.number_of_seasons && (
                  <span>
                    <Layers size={15} />
                    {selectedMedia.original.number_of_seasons} seasons
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
                <button className="btn btn-primary" onClick={playSelectedMovie}>
                  <Play size={17} fill="currentColor" /> Watch Now
                </button>
                <button className="btn btn-secondary" onClick={openTrailer}>
                  <Play size={17} /> Watch Trailer
                </button>

                {selectedMedia.original.homepage && (
                  <a
                    className="btn btn-secondary"
                    href={selectedMedia.original.homepage}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official Website <ArrowUpRight size={16} />
                  </a>
                )}
              </div>

              {isEpisodic && availableSeasons.length > 0 && (
                <section className="seasons-section">
                  <div className="season-heading">
                    <h3><Layers size={18} /> Seasons & Episodes</h3>
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
                        <article className="episode-card" key={episode.id}>
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
                              {episode.air_date ? ` · ${episode.air_date}` : ''}
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
                            <button
                              className="btn btn-primary episode-play-button"
                              type="button"
                              onClick={() => playEpisode(episode)}
                            >
                              <Play size={14} fill="currentColor" /> Play Episode
                            </button>
                          </div>
                        </article>
                      ))}

                      {(seasonDetails.episodes || []).length === 0 && (
                        <p>No episode information is available for this season.</p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {playerTarget && (
                <section className="trailer-section player-section">
                  <div className="trailer-heading player-heading">
                    <div>
                      <h3>Now Playing</h3>
                      <p>{playerTarget.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlayerTarget(null)}
                      aria-label="Close player"
                    >
                      <X size={19} />
                    </button>
                  </div>
                  <div className="trailer-frame player-frame">
                    <iframe
                      key={`${playerTarget.type}-${playerTarget.id}-${playerTarget.season}-${playerTarget.episode}`}
                      src={`/api/player?type=${playerTarget.type}&id=${playerTarget.id}${playerTarget.type === 'tv' ? `&season=${playerTarget.season}&episode=${playerTarget.episode}` : ''}`}
                      title={`Player: ${playerTarget.title}`}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      referrerPolicy="strict-origin"
                      allowFullScreen
                    />
                  </div>
                  <p className="player-help">
                    Player not loading? Check the NexStream key and allowed-domain settings in Cloudflare.
                  </p>
                </section>
              )}

              {trailerOpen && trailer?.key && (
                <div className="trailer-section">
                  <div className="trailer-heading">
                    <h3>Official trailer</h3>
                    <button
                      onClick={() => setTrailerOpen(false)}
                      aria-label="Close trailer"
                    >
                      <X size={19} />
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
                Movie and TV metadata is provided by TMDB. Playback is supplied by the configured third-party player and may not be available for every title.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
