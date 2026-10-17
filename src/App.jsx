import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Search, ArrowUpRight, Play, Sparkles, Clapperboard,
  Star, X, ChevronDown, Film, Compass
} from 'lucide-react'
import './App.css'

const movies = [
  { title: 'Dune: Part Two', year: 2024, rating: '8.5', genre: 'Sci-Fi', image: '1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.' },
  { title: 'Interstellar', year: 2014, rating: '8.7', genre: 'Drama', image: 'gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', description: 'A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.' },
  { title: 'Oppenheimer', year: 2023, rating: '8.3', genre: 'Drama', image: 'ptpr0kGAckfQkJeJIt8st5dglvd.jpg', description: 'The story of J. Robert Oppenheimer and the extraordinary scientific effort that changed the world.' },
  { title: 'Spider-Man: Across the Spider-Verse', year: 2023, rating: '8.6', genre: 'Animation', image: '8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', description: 'Miles Morales is swept into a multiverse of Spider-People and faces a choice that could change everything.' },
  { title: 'The Batman', year: 2022, rating: '7.8', genre: 'Action', image: '74xTEgt7R36Fpooo50r9T25onhq.jpg', description: 'Batman investigates a trail of corruption and a series of riddles threatening Gotham City.' },
  { title: 'Avatar: The Way of Water', year: 2022, rating: '7.5', genre: 'Adventure', image: 't6HIqrRAclMCA60NsSmeqe9tL2A.jpg', description: 'Jake Sully and his family seek safety among the ocean clans of Pandora.' },
]

const reveal = {
  hidden: { opacity: 0, y: 35 },
  visible: { opacity: 1, y: 0 },
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
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={reduceMotion ? {} : { y: -8 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="poster-wrap">
        <img
          src={`https://image.tmdb.org/t/p/w500/${movie.image}`}
          alt={movie.title}
          loading="lazy"
        />
        <div className="poster-shade" />
        <span className="rating"><Star size={12} fill="currentColor" /> {movie.rating}</span>
        <span className="poster-open"><Play size={17} fill="currentColor" /></span>
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

  const genres = ['All', ...new Set(movies.map((movie) => movie.genre))]
  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = `${movie.title} ${movie.year} ${movie.genre}`.toLowerCase().includes(search.toLowerCase())
    const matchesGenre = selectedGenre === 'All' || movie.genre === selectedGenre
    return matchesSearch && matchesGenre
  })

  return (
    <div className="app">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="navbar">
        <a className="logo" href="#" aria-label="CineVerse home">
          <span className="logo-mark"><Clapperboard size={19} /></span>
          CINE<span>VERSE</span><i>.</i>
        </a>

        <nav className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
          <a className="active" href="#" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#trending" onClick={() => setMenuOpen(false)}>Movies</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Discover</a>
          <a href="#upcoming" onClick={() => setMenuOpen(false)}>About</a>
        </nav>

        <a className="profile-btn" href="#trending">Explore <ArrowUpRight size={15} /></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
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
              <a className="primary-btn" href="#trending"><Play size={15} fill="currentColor" /> Explore Movies</a>
              <a className="secondary-btn" href="#categories">Discover your vibe <ArrowUpRight size={15} /></a>
            </motion.div>

            <div className="hero-meta">
              <span><span className="live-dot" /> YOUR CINEMA, REIMAGINED</span>
              <span>SCROLL TO EXPLORE ↓</span>
            </div>
          </div>

          <motion.div
            className="hero-art"
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div className="orbit orbit-one" animate={{ rotate: 360 }} transition={{ duration: 38, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="orbit orbit-two" animate={{ rotate: -360 }} transition={{ duration: 48, repeat: Infinity, ease: 'linear' }} />
            <motion.div className="hero-glow" animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 5, repeat: Infinity }} />
            <motion.div className="hero-core" animate={{ y: [0, -12, 0], rotateY: [0, 8, 0], rotateX: [0, -5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
              <div className="core-ring" />
              <div className="core-letter">C<span>.</span></div>
              <div className="core-shine" />
            </motion.div>
            <motion.div className="floating-chip chip-top" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
              <Star size={13} fill="currentColor" /> CINEMATIC
            </motion.div>
            <motion.div className="floating-chip chip-bottom" animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity }}>
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
              <span className="section-kicker"><span className="live-dot" /> HANDPICKED FOR YOU</span>
              <h2>Find your next <span>favorite.</span></h2>
              <p className="section-description">Some stories stay with you long after the credits roll.</p>
            </div>
            <span className="view-all">THE COLLECTION <ArrowUpRight size={14} /></span>
          </Reveal>

          <Reveal className="search-panel">
            <div className="search-box">
              <Search size={19} />
              <input
                type="search"
                placeholder="Search a movie, year, or genre..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search movies"
              />
              {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={17} /></button>}
            </div>
            <div className="genre-filters">
              {genres.map((genre) => (
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

          <div className="movie-grid">
            {filteredMovies.map((movie, index) => (
              <MovieCard key={movie.title} movie={movie} index={index} onSelect={setSelectedMovie} />
            ))}
          </div>

          {filteredMovies.length === 0 && (
            <div className="empty-state">
              <Compass size={32} />
              <h3>No stories found. Yet.</h3>
              <p>Try another title or genre. Your next favorite is out there.</p>
              <button className="secondary-btn" onClick={() => { setSearch(''); setSelectedGenre('All') }}>Reset discovery</button>
            </div>
          )}
          <p className="catalog-note">A small collection to start your journey. More discoveries coming soon.</p>
        </section>

        <Reveal className="discovery-banner" >
          <div className="banner-orb" />
          <div className="banner-content">
            <span className="section-kicker"><Sparkles size={13} /> YOUR NEXT FAVORITE IS OUT THERE</span>
            <h2>Every mood has<br />a <span>movie.</span></h2>
          </div>
          <div className="banner-copy">
            <p>Some nights call for an edge-of-your-seat thriller. Others need a world you can disappear into.</p>
            <p>Whatever you're feeling, the perfect story is waiting. Let's find it together.</p>
            <a className="text-link" href="#trending">Find your story <ArrowUpRight size={15} /></a>
          </div>
        </Reveal>

        <Reveal className="upcoming-section" >
          <span className="section-kicker"><Film size={13} /> THE JOURNEY CONTINUES</span>
          <h2>There is always<br />another <span>world.</span></h2>
          <p>We're building a bigger universe of films, stories, trailers, and discoveries. This is only the opening scene.</p>
          <a className="primary-btn" href="#trending">Explore the collection <ArrowUpRight size={15} /></a>
        </Reveal>
      </main>

      <footer className="footer">
        <a className="logo" href="#"><span className="logo-mark"><Clapperboard size={16} /></span> CINE<span>VERSE</span><i>.</i></a>
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
            <button className="modal-close" onClick={() => setSelectedMovie(null)} aria-label="Close details"><X size={20} /></button>
            <div className="modal-poster">
              <img src={`https://image.tmdb.org/t/p/w500/${selectedMovie.image}`} alt={selectedMovie.title} />
            </div>
            <div className="modal-content">
              <span className="section-kicker">YOUR NEXT MOVIE NIGHT</span>
              <h2>{selectedMovie.title}</h2>
              <div className="modal-meta"><span>{selectedMovie.year}</span><span>{selectedMovie.genre}</span><span><Star size={14} fill="currentColor" /> {selectedMovie.rating}</span></div>
              <p>{selectedMovie.description}</p>
              <p className="modal-note">Movie overview and ratings are starter content. Live catalog data will be connected in a later step.</p>
              <button className="primary-btn" onClick={() => setSelectedMovie(null)}>Back to discovery <ArrowUpRight size={15} /></button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default App
