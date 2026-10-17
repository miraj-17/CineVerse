
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Search, ArrowUpRight, Play, Sparkles, Clapperboard,
  Star, X, ChevronDown, Film, Compass
} from 'lucide-react'
import './App.css'

const API_URL = '/api/movies'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/'

const reveal = {
  hidden: { opacity: 0, y: 35 },
  visible: { opacity: 1, y: 0 },
}

function posterUrl(path, size = 'w500') {
  return path ? `${IMAGE_BASE}${size}${path.startsWith('/') ? path : `/${path}`}` : ''
}

function formatMovie(item, genreMap = {}) {
  const genreIds = item.genre_ids || []
  const genreNames = item.genres?.map((genre) => genre.name) ||
    genreIds.map((id) => genreMap[id]).filter(Boolean)

  return {
    id: item.id,
    title: item.title || item.original_title || 'Untitled Movie',
    year: item.release_date?.slice(0, 4) || 'N/A',
    rating: Number(item.vote_average || 0).toFixed(1),
    genre: genreNames[0] || 'Movie',
    genres: genreNames,
    image: item.poster_path || '',
    backdrop: item.backdrop_path || '',
    description: item.overview || 'No overview is available for this movie yet.',
    original: item,
  }
}

function Reveal({ children, className = '', delay = 0 }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={reveal}
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function MovieCard({ movie, index, onSelect }) {
  const cardRef = useRef(null)
  const reduceMotion = useReducedMotion()

  function handleMove(event) {
    if (reduceMotion || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    cardRef.current.style.setProperty('--tilt-x', `${(0.5 - y) * 9}deg`)
    cardRef.current.style.setProperty('--tilt-y', `${(x - 0.5) * 9}deg`)
    cardRef.current.style.setProperty('--mouse-x', `${x * 100}%`)
    cardRef.current.style.setProperty('--mouse-y', `${y * 100}%`)
  }

  function resetTilt() {
    if (!cardRef.current) return
    cardRef.current.style.setProperty('--tilt-x', '0deg')
    cardRef.current.style.setProperty('--tilt-y', '0deg')
  }

  return (
    <motion.article
      ref={cardRef}
      className="movie-card"
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      onClick={() => onSelect(movie)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(movie)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${movie.title}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
      whileHover={reduceMotion ? {} : { y: -8 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="poster-wrap">
        {movie.image ? (
          <img
            src={posterUrl(movie.image)}
            alt={movie.title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden'
            }}
          />
        ) : (
          <div className="poster-placeholder">
            <Film size={36} />
          </div>
        )}
        <div className="poster-shade" />
        <span className="rating">
          <Star size={12} fill="currentColor" /> {movie.rating}
        </span>
        <span className="poster-open">
          <Play size={17} fill="currentColor" />
        </span>
        <span className="poster-category">{movie.genre}</span>
      </div>
      <div className="movie-info">
        <h3>{movie.title}</h3>
        <p>{movie.year} <span>·</span> {movie.genre}</p>
      </div>
    </motion.article>
  )
}

function App() {
  const [search, setSearch] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const [movies, setMovies] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [catalogType, setCatalogType] = useState('trending')
  const [detailsLoading, setDetailsLoading] = useState(false)

  const genreMapRef = useRef({})
  const requestRef = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadGenres() {
      try {
        const response = await fetch(`${API_URL}?type=genres`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Could not load genres')

        const data = await response.json()
        const list = data.genres || []
        const map = {}

        list.forEach((genre) => {
          map[genre.id] = genre.name
        })

        genreMapRef.current = map
        setGenres(list.map((genre) => genre.name))
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Genre loading error:', err)
        }
      }
    }

    loadGenres()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const requestId = ++requestRef.current

    async function loadMovies() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          type: search.trim() ? 'search' : catalogType,
          page: String(page),
        })

        if (search.trim()) {
          params.set('query', search.trim())
        }

        const response = await fetch(`${API_URL}?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Movie API route not found. Check your Cloudflare deployment.'
              : `Could not load movies (HTTP ${response.status}).`
          )
        }

        const data = await response.json()

        if (requestId !== requestRef.current) return

        const list = (data.results || []).map((item) =>
          formatMovie(item, genreMapRef.current)
        )

        setMovies(list)
        setTotalPages(Math.min(data.total_pages || 1, 500))
      } catch (err) {
        if (err.name !== 'AbortError' && requestId === requestRef.current) {
          console.error('Movie loading error:', err)
          setError(err.message || 'Something went wrong while loading movies.')
          setMovies([])
        }
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false)
        }
      }
    }

    const delay = search.trim() ? 350 : 0
    const timer = setTimeout(loadMovies, delay)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search, catalogType, page])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedMovie(null)
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredMovies = movies.filter((movie) => {
    if (selectedGenre === 'All') return true
    return movie.genres.includes(selectedGenre) || movie.genre === selectedGenre
  })

  function changeCatalog(type) {
    setCatalogType(type)
    setPage(1)
    setSearch('')
    setSelectedGenre('All')
    setMenuOpen(false)
  }

  async function openMovie(movie) {
    setSelectedMovie(movie)
    setDetailsLoading(true)

    try {
      const response = await fetch(
        `${API_URL}?type=details&id=${encodeURIComponent(movie.id)}`
      )

      if (!response.ok) throw new Error('Could not load movie details')

      const data = await response.json()
      const detailedMovie = formatMovie(data, genreMapRef.current)

      setSelectedMovie((current) =>
        current?.id === movie.id ? detailedMovie : current
      )
    } catch (err) {
      console.error('Movie details error:', err)
    } finally {
      setDetailsLoading(false)
    }
  }

  const selectedTrailer = selectedMovie?.original?.videos?.results?.find(
    (video) =>
      video.site === 'YouTube' &&
      (video.type === 'Trailer' || video.type === 'Teaser') &&
      video.official
  ) || selectedMovie?.original?.videos?.results?.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer'
  )

  function openTrailer() {
    if (selectedTrailer?.key) {
      window.open(
        `https://www.youtube.com/watch?v=${encodeURIComponent(selectedTrailer.key)}`,
        '_blank',
        'noopener,noreferrer'
      )
    } else {
      window.alert('No trailer is available for this movie right now.')
    }
  }

  return (
    <div className="app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="navbar">
        <a
          className="logo"
          href="#"
          aria-label="CineVerse home"
          onClick={() => changeCatalog('trending')}
        >
          <span className="logo-mark"><Clapperboard size={19} /></span>
          CINE<span>VERSE</span><i>.</i>
        </a>

        <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
          <a
            className={catalogType === 'trending' && !search ? 'active' : ''}
            href="#"
            onClick={(event) => {
              event.preventDefault()
              changeCatalog('trending')
            }}
          >
            Home
          </a>
          <a
            className={catalogType === 'popular' && !search ? 'active' : ''}
            href="#trending"
            onClick={() => changeCatalog('popular')}
          >
            Popular
          </a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>
            Discover
          </a>
          <a href="#upcoming" onClick={() => setMenuOpen(false)}>
            About
          </a>
        </nav>

        <a
          className="profile-btn"
          href="#trending"
          onClick={() => setMenuOpen(false)}
        >
          Explore <ArrowUpRight size={15} />
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <ChevronDown />}
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-grain" />

          <div className="hero-content">
            <motion.div
              className="eyebrow"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <Sparkles size={14} /> YOUR NEXT MOVIE OBSESSION
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.12 }}
            >
              Stories that<br />stay with <span>you.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Not just movies. Entire worlds waiting to be discovered.
              Find the story that speaks to you, one frame at a time.
            </motion.p>

            <motion.div
              className="hero-buttons"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            >
              <a className="primary-btn" href="#trending">
                <Play size={15} fill="currentColor" /> Explore Movies
              </a>
              <a className="secondary-btn" href="#categories">
                Discover your vibe <ArrowUpRight size={15} />
              </a>
            </motion.div>

            <div className="hero-meta">
              <span><span className="live-dot" /> LIVE MOVIE DISCOVERY</span>
              <span>SCROLL TO EXPLORE ↓</span>
            </div>
          </div>

          <motion.div
            className="hero-art"
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className="orbit orbit-one"
              animate={{ rotate: 360 }}
              transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="orbit orbit-two"
              animate={{ rotate: -360 }}
              transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="hero-glow"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <motion.div
              className="hero-core"
              animate={{ y: [0, -12, 0], rotateY: [0, 8, 0], rotateX: [0, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="core-ring" />
              <div className="core-letter">C<span>.</span></div>
              <div className="core-shine" />
            </motion.div>
            <motion.div
              className="floating-chip chip-top"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Star size={13} fill="currentColor" /> CINEMATIC
            </motion.div>
            <motion.div
              className="floating-chip chip-bottom"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              <Film size={14} /> YOUR NEXT OBSESSION
            </motion.div>
            <span className="art-label">BEYOND THE SCREEN</span>
          </motion.div>

          <div className="hero-scroll-line" />
        </section>

        <Reveal className="stats">
          <div><strong>01 / DISCOVER</strong><span>Stories worth your time</span></div>
          <div><strong>02 / EXPLORE</strong><span>Every genre, every mood</span></div>
          <div><strong>03 / EXPERIENCE</strong><span>Cinema, your way</span></div>
        </Reveal>

        <section className="movie-section" id="trending">
          <Reveal className="section-heading">
            <div>
              <span className="section-kicker">
                <span className="live-dot" /> LIVE FROM TMDB
              </span>
              <h2>
                {search.trim() ? 'Search your next ' : 'Find your next '}
                <span>favorite.</span>
              </h2>
              <p className="section-description">
                Discover trending movies, audience favorites and new stories.
              </p>
            </div>
            <span className="view-all">
              {catalogType === 'popular' ? 'POPULAR MOVIES' : 'TRENDING MOVIES'}
              <ArrowUpRight size={14} />
            </span>
          </Reveal>

          <Reveal className="search-panel">
            <div className="search-box">
              <Search size={19} />
              <input
                type="search"
                placeholder="Search a movie..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                  setSelectedGenre('All')
                }}
                aria-label="Search movies"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  aria-label="Clear search"
                >
                  <X size={17} />
                </button>
              )}
            </div>

            <div className="genre-filters" id="categories">
              {['All', ...genres].map((genre) => (
                <button
                  key={genre}
                  className={selectedGenre === genre ? 'genre-chip selected' : 'genre-chip'}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </Reveal>

          {loading && (
            <div className="loading-state" role="status">
              <div className="loading-spinner" />
              <p>Discovering your next favorite movie...</p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <Compass size={32} />
              <h3>Unable to load movies.</h3>
              <p>{error}</p>
              <button
                className="secondary-btn"
                onClick={() => {
                  setPage(1)
                  setCatalogType((current) => current)
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="movie-grid">
                {filteredMovies.map((movie, index) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    index={index}
                    onSelect={openMovie}
                  />
                ))}
              </div>

              {filteredMovies.length === 0 && (
                <div className="empty-state">
                  <Compass size={32} />
                  <h3>No stories found. Yet.</h3>
                  <p>Try another title or genre. Your next favorite is out there.</p>
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      setSearch('')
                      setSelectedGenre('All')
                      setPage(1)
                    }}
                  >
                    Reset discovery
                  </button>
                </div>
              )}

              {totalPages > 1 && !search.trim() && (
                <div className="pagination">
                  <button
                    className="secondary-btn"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1))
                      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Previous
                  </button>
                  <span>Page {page} of {totalPages}</span>
                  <button
                    className="secondary-btn"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage((current) => Math.min(totalPages, current + 1))
                      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Next <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}

          <p className="catalog-note">
            Movie information, ratings and artwork are provided by TMDB.
          </p>
        </section>

        <Reveal className="discovery-banner">
          <div className="banner-orb" />
          <div className="banner-content">
            <span className="section-kicker">
              <Sparkles size={13} /> YOUR NEXT FAVORITE IS OUT THERE
            </span>
            <h2>Every mood has<br />a <span>movie.</span></h2>
          </div>
          <div className="banner-copy">
            <p>
              Some nights call for an edge-of-your-seat thriller.
              Others need a world you can disappear into.
            </p>
            <p>
              Whatever you're feeling, the perfect story is waiting.
              Let's find it together.
            </p>
            <a className="text-link" href="#trending">
              Find your story <ArrowUpRight size={15} />
            </a>
          </div>
        </Reveal>

        <Reveal className="upcoming-section" id="upcoming">
          <span className="section-kicker"><Film size={13} /> THE JOURNEY CONTINUES</span>
          <h2>There is always<br />another <span>world.</span></h2>
          <p>
            Explore a growing universe of films, stories, trailers and discoveries.
            Your next movie night starts here.
          </p>
          <a className="primary-btn" href="#trending">
            Explore the collection <ArrowUpRight size={15} />
          </a>
        </Reveal>
      </main>

      <footer className="footer">
        <a className="logo" href="#" onClick={() => changeCatalog('trending')}>
          <span className="logo-mark"><Clapperboard size={16} /></span>
          CINE<span>VERSE</span><i>.</i>
        </a>
        <p>For the love of stories, and the worlds they create.</p>
        <span>© 2026 CINEVERSE</span>
      </footer>

      {selectedMovie && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedMovie(null)}
        >
          <motion.div
            className="movie-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMovie.title} details`}
            initial={{ opacity: 0, y: 25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedMovie(null)}
              aria-label="Close details"
            >
              <X size={20} />
            </button>

            <div className="modal-poster">
              {selectedMovie.backdrop ? (
                <img
                  src={posterUrl(selectedMovie.backdrop, 'w780')}
                  alt={selectedMovie.title}
                />
              ) : selectedMovie.image ? (
                <img
                  src={posterUrl(selectedMovie.image)}
                  alt={selectedMovie.title}
                />
              ) : null}
            </div>

            <div className="modal-content">
              <span className="section-kicker">YOUR NEXT MOVIE NIGHT</span>
              <h2>{selectedMovie.title}</h2>

              <div className="modal-meta">
                <span>{selectedMovie.year}</span>
                <span>{selectedMovie.genres.join(', ') || selectedMovie.genre}</span>
                <span><Star size={14} fill="currentColor" /> {selectedMovie.rating}</span>
              </div>

              <p>{selectedMovie.description}</p>

              {detailsLoading && (
                <p className="modal-note">Loading more movie details...</p>
              )}

              <button
                className="primary-btn"
                onClick={openTrailer}
                disabled={!selectedTrailer}
                title={selectedTrailer ? 'Watch official trailer on YouTube' : 'No trailer available'}
              >
                <Play size={15} fill="currentColor" />
                {selectedTrailer ? 'Watch Trailer' : 'Trailer Unavailable'}
                <ArrowUpRight size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default App
