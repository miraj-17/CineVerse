const STORAGE_KEY = 'cineverse-watch-library-v1'
const MAX_ITEMS = 100

function readLibrary() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      history: Array.isArray(value.history) ? value.history : [],
      myList: Array.isArray(value.myList) ? value.myList : [],
    }
  } catch {
    return { history: [], myList: [] }
  }
}

function writeLibrary(library) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    return true
  } catch (error) {
    console.error('Could not save CineVerse library:', error)
    return false
  }
}

function sameMedia(a, b) {
  return String(a.id) === String(b.id) &&
    a.mediaType === b.mediaType &&
    Number(a.season || 0) === Number(b.season || 0) &&
    Number(a.episode || 0) === Number(b.episode || 0)
}

export function getWatchLibrary() {
  return readLibrary()
}

export function addToHistory(item, episodeInfo = {}) {
  if (!item?.id || !item?.mediaType) return false

  const library = readLibrary()
  const entry = {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title || 'Untitled',
    year: item.year || '',
    image: item.image || '',
    backdrop: item.backdrop || '',
    rating: item.rating || '',
    description: item.description || '',
    season: episodeInfo.season || null,
    episode: episodeInfo.episode || null,
    watchedAt: Date.now(),
  }

  library.history = [
    entry,
    ...library.history.filter(existing => !sameMedia(existing, entry)),
  ].slice(0, MAX_ITEMS)

  return writeLibrary(library)
}

export function removeFromHistory(item) {
  const library = readLibrary()
  library.history = library.history.filter(entry => !sameMedia(entry, item))
  return writeLibrary(library)
}

export function clearHistory() {
  const library = readLibrary()
  library.history = []
  return writeLibrary(library)
}

export function addToMyList(item) {
  if (!item?.id || !item?.mediaType) return false

  const library = readLibrary()
  if (library.myList.some(entry => sameMedia(entry, item))) return true

  library.myList = [
    {
      id: item.id,
      mediaType: item.mediaType,
      title: item.title || 'Untitled',
      year: item.year || '',
      image: item.image || '',
      backdrop: item.backdrop || '',
      rating: item.rating || '',
      description: item.description || '',
      addedAt: Date.now(),
    },
    ...library.myList,
  ].slice(0, MAX_ITEMS)

  return writeLibrary(library)
}

export function removeFromMyList(item) {
  const library = readLibrary()
  library.myList = library.myList.filter(entry => !sameMedia(entry, item))
  return writeLibrary(library)
}

export function isInMyList(item) {
  return readLibrary().myList.some(entry => sameMedia(entry, item))
}
