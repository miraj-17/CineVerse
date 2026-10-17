
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Search, ArrowUpRight, Play, Sparkles, Clapperboard,
  Star, X, ChevronLeft, ChevronRight, Film, Compass,
  Tv, CalendarDays, Layers, LoaderCircle
} from 'lucide-react'
import './App.css'

const API_URL = '/api/movies'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/'

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
}

function posterUrl(path, size = 'w500') {
  return path ? `${IMAGE_BASE}${size}${path.startsWith('/') ? path : `/${path}`}` : ''
}

function formatMedia(item, genreMap = {}, mediaType = 'movie') {
  const isTV = mediaType === 'tv'
  const genreNames = item.genres?.map(g => g.name)
    || (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean)

  return {
    id: item.id,
    mediaType,
    title: item.title || item.name || item.original_title || item.original_name || 'Untitled',
    year: (item.release_date || item.first_air_date || '').slice(0, 4) || 'N/A',
    rating: Number(item.vote_average || 0).toFixed(1),
    genre: genreNames[0] || (isTV ? 'TV Series' : 'Movie'),
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
      transition={{ duration: reducedMotion ? 0 : 0.55, delay }}
    >
      {children}
    </motion.div>
  )
}

function MediaCard({ item, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false)
  const isTV = item.mediaType === 'tv'

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
            {isTV ? <Tv size={42} /> : <Film size={42} />}
            <span>{item.title}</span>
          </div>
        )}

        <span className="media-type-badge">
          {isTV ? 'TV SERIES' : 'MOVIE'}
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
  const [trailerOpen, setTrailerOpen] = useState(false)
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

  const isTV = mediaMode === 'tv'
  const mediaLabel = isTV ? 'TV Series' : 'Movies'

  const requestJSON = async (params, signal) => {
    const query = new URLSearchParams(params)
    const response = await fetch(`${API_URL}?${query}`, { signal })

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`)
    }

    return response.json()
  }

  // Load the correct genre list when switching between movies and TV.
  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++genreRequestRef.current

    async function loadGenres() {
      setGenres([])
      setGenreMap({})

      try {
        const data = await requestJSON({
          type: mediaMode === 'tv' ? 'genres-tv' : 'genres'
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

  // Search and catalog requests use different endpoints for movies and TV.
  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++requestRef.current
    let delayTimer

    async function loadCatalog() {
      setLoading(true)
      setError('')

      try {
        let params

        if (search.trim()) {
          params = {
            type: isTV ? 'search-tv' : 'search',
            query: search.trim(),
            page: String(page)
          }
        } else {
          let type

          if (catalogType === 'popular') {
            type = isTV ? 'popular-tv' : 'popular'
          } else {
            type = isTV ? 'trending-tv' : 'trending'
          }

          params = { type, page: String(page) }
        }

        const data = await requestJSON(params, controller.signal)

        if (requestId !== requestRef.current) return

        const results = (data.results || []).map(item =>
          formatMedia(item, genreMap, mediaMode)
        )

        setItems(results)
        setTotalPages(Math.min(Number(data.total_pages || 1), 500))
      } catch (err) {
        if (err.name !== 'AbortError' && requestId === requestRef.current) {
          setError('Could not load titles. Please check your connection and try again.')
          setItems([])
        }
      } finally {
        if (requestId === requestRef.current) setLoading(false)
      }
    }

    delayTimer = setTimeout(loadCatalog, search.trim() ? 350 : 0)

    return () => {
      clearTimeout(delayTimer)
      controller.abort()
    }
  }, [search, page, catalogType, mediaMode, genreMap, isTV])

  // Fetch a selected show's seasons and episodes.
  useEffect(() => {
    if (!selectedMedia || selectedMedia.mediaType !== 'tv') {
      setSeasonDetails(null)
      return
    }

    const seasons = selectedMedia.original?.seasons || []
    const availableSeasons = seasons.filter(season => season.season_number > 0)

    if (!availableSeasons.some(s => s.season_number === selectedSeasonNumber)) {
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
        if (err.name !== 'AbortError') {
          setSeasonDetails(null)
        }
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
  }

  async function openMedia(item) {
    setSelectedMedia({
      ...item,
      original: item.original || {}
    })
    setDetailsLoading(true)
    setTrailerOpen(false)
    setSeasonDetails(null)
    setSelectedSeasonNumber(1)

    try {
      const data = await requestJSON({
        type: item.mediaType === 'tv' ? 'details-tv' : 'details',
        id: String(item.id)
      })

      setSelectedMedia(current => {
        if (!current || current.id !== item.id || current.mediaType !== item.mediaType) {
          return current
        }

        return formatMedia(data, genreMap, item.mediaType)
      })

      const seasons = data.seasons || []
      const firstSeason = seasons.find(season => season.season_number > 0)
      if (firstSeason) setSelectedSeasonNumber(firstSeason.season_number)
    } catch (err) {
      console.error('Could not load details:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  function openTrailer() {
    if (trailer?.key) {
      setTrailerOpen(true)
    } else {
      window.open(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${selectedMedia?.title || ''} official trailer`
        )}`,
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  const availableSeasons = (selectedMedia?.original?.seasons || [])
    .filter(season => season.season_number > 0)

  return (
    <div className="app">
      <div className="ambient-glow" aria-hidden="true" />

      <header className="navbar">
        <button className="logo" onClick={() => switchMedia('movie')} type="button">
          <span className="logo-mark"><Clapperboard size={21} /></span>
          <span>CINE<span className="logo-accent">VERSE</span></span>
        </button>

        <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <button
            className={!isTV && catalogType === 'trending' ? 'active' : ''}
            onClick={() => switchMedia('movie')}
          >
            <Film size={15} /> Movies
          </button>
          <button
            className={isTV ? 'active' : ''}
            onClick={() => switchMedia('tv')}
          >
            <Tv size={15} /> TV Series
          </button>
          <button onClick={() => changeCatalog('popular')}>
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
              Discover extraordinary movies and TV series, unforgettable
              characters, and stories worth staying up for.
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
                onClick={() => switchMedia(isTV ? 'movie' : 'tv')}
              >
                {isTV ? <Film size={17} /> : <Tv size={17} />}
                {isTV ? 'Explore Movies' : 'Explore TV Series'}
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="hero-note">
              <span className="hero-dot" /> Discover your next favorite story
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-poster">
              {isTV ? <Tv size={76} /> : <Clapperboard size={76} />}
            </div>
            <span className="hero-star star-one">✦</span>
            <span className="hero-star star-two">✧</span>
          </div>
        </section>

        <section className="stats-strip">
          <div><strong>Movies</strong><span>Blockbuster discoveries</span></div>
          <div><strong>TV Series</strong><span>Stories across seasons</span></div>
          <div><strong>TMDB</strong><span>Powered by movie data</span></div>
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
              <button
                className={!isTV ? 'active' : ''}
                onClick={() => switchMedia('movie')}
              >
                <Film size={15} /> Movies
              </button>
              <button
                className={isTV ? 'active' : ''}
                onClick={() => switchMedia('tv')}
              >
                <Tv size={15} /> TV Series
              </button>
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
                placeholder={`Search ${isTV ? 'TV series' : 'movies'}...`}
                aria-label={`Search ${mediaLabel}`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
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
              <button className="btn btn-primary" onClick={() => setPage(page)}>
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
            Movie and TV information provided by TMDB. CineVerse is not endorsed
            or certified by TMDB.
          </p>
        </section>

        <section className="discovery-banner">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> KEEP EXPLORING</div>
            <h2>Every story starts somewhere.</h2>
            <p>Switch between movies and series to find your next favorite.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => switchMedia(isTV ? 'movie' : 'tv')}
          >
            {isTV ? 'Explore Movies' : 'Explore TV Series'}
            <ArrowUpRight size={17} />
          </button>
        </section>
      </main>

      <footer className="footer">
        <button className="logo footer-logo" onClick={() => switchMedia('movie')}>
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
            if (event.target === event.currentTarget) {
              setSelectedMedia(null)
              setTrailerOpen(false)
            }
          }}
          role="presentation"
        >
          <div className="modal-content" role="dialog" aria-modal="true" aria-label={`${selectedMedia.title} details`}>
            <button
              className="modal-close"
              onClick={() => {
                setSelectedMedia(null)
                setTrailerOpen(false)
              }}
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
                {selectedMedia.mediaType === 'tv' ? 'TV SERIES' : 'MOVIE'}
              </span>
            </div>

            <div className="modal-details">
              <div className="eyebrow">
                {selectedMedia.mediaType === 'tv' ? <Tv size={15} /> : <Film size={15} />}
                {selectedMedia.mediaType === 'tv' ? 'SERIES DETAILS' : 'MOVIE DETAILS'}
              </div>

              <h2>{selectedMedia.title}</h2>

              <div className="modal-meta">
                <span><Star size={15} fill="currentColor" /> {selectedMedia.rating}</span>
                <span><CalendarDays size={15} /> {selectedMedia.year}</span>
                {selectedMedia.genres.map(genre => <span key={genre}>{genre}</span>)}
                {selectedMedia.mediaType === 'tv' && selectedMedia.original.number_of_seasons && (
                  <span><Layers size={15} /> {selectedMedia.original.number_of_seasons} seasons</span>
                )}
              </div>

              <p className="modal-description">{selectedMedia.description}</p>

              {detailsLoading && (
                <div className="details-loading">
                  <LoaderCircle className="loading-icon" size={20} /> Loading details...
                </div>
              )}

              <div className="modal-actions">
                <button className="btn btn-primary" onClick={openTrailer}>
                  <Play size={17} fill="currentColor" /> Watch Trailer
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

              {selectedMedia.mediaType === 'tv' && availableSeasons.length > 0 && (
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
                    onChange={event => setSelectedSeasonNumber(Number(event.target.value))}
                  >
                    {availableSeasons.map(season => (
                      <option key={season.id} value={season.season_number}>
                        {season.name || `Season ${season.season_number}`}
                      </option>
                    ))}
                  </select>

                  {seasonLoading && (
                    <div className="details-loading">
                      <LoaderCircle className="loading-icon" size={20} /> Loading episodes...
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
                              S{String(episode.season_number ?? selectedSeasonNumber).padStart(2, '0')}
                              {' '}E{String(episode.episode_number).padStart(2, '0')}
                              {episode.air_date ? ` · ${episode.air_date}` : ''}
                            </div>
                            <h4>{episode.name || `Episode ${episode.episode_number}`}</h4>
                            <p>{episode.overview || 'Episode description is not available.'}</p>
                            {episode.vote_average > 0 && (
                              <span className="episode-rating">
                                <Star size={12} fill="currentColor" /> {Number(episode.vote_average).toFixed(1)}
                              </span>
                            )}
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

              {trailerOpen && trailer?.key && (
                <div className="trailer-section">
                  <div className="trailer-heading">
                    <h3>Official trailer</h3>
                    <button onClick={() => setTrailerOpen(false)} aria-label="Close trailer">
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
                CineVerse provides discovery information and trailers. Episode details
                are informational and do not provide full-episode streaming.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
