import { useEffect, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

const VERSION_URL = 'https://cineverse-49q.pages.dev/api/version.json'

export default function UpdateChecker() {
  const [update, setUpdate] = useState(null)
  const [currentVersion, setCurrentVersion] = useState('')
  const [checking, setChecking] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return
    }

    let active = true

    async function checkForUpdate() {
      setChecking(true)

      try {
        const appInfo = await CapApp.getInfo()
        if (!active) return

        const installedCode = Number(appInfo.build)
        setCurrentVersion(appInfo.version || '')

        const response = await fetch(
          `${VERSION_URL}?t=${Date.now()}`,
          { cache: 'no-store' }
        )

        if (!response.ok) {
          throw new Error(`Version check failed: ${response.status}`)
        }

        const latest = await response.json()
        if (!active) return

        if (
          Number.isFinite(installedCode) &&
          Number(latest.versionCode) > installedCode &&
          latest.apkUrl
        ) {
          setUpdate(latest)
        }
      } catch (error) {
        console.warn('CineVerse update check unavailable:', error)
      } finally {
        if (active) setChecking(false)
      }
    }

    checkForUpdate()

    return () => {
      active = false
    }
  }, [])

  if (!update || dismissed) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cineverse-update-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background: 'rgba(0,0,0,.78)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 24,
          borderRadius: 20,
          color: '#fff',
          background: '#15151d',
          border: '1px solid rgba(255,255,255,.14)',
          boxShadow: '0 24px 80px rgba(0,0,0,.45)',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>

        <h2 id="cineverse-update-title" style={{ margin: '0 0 8px' }}>
          CineVerse update available
        </h2>

        <p style={{ color: '#b9b9c8', lineHeight: 1.6 }}>
          Version {update.versionName} is ready to download.
        </p>

        {currentVersion && (
          <p style={{ color: '#9999aa', fontSize: 13 }}>
            Installed version: {currentVersion}
          </p>
        )}

        {update.releaseNotes && (
          <p style={{ lineHeight: 1.6 }}>{update.releaseNotes}</p>
        )}

        <a
          href={update.apkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '13px 16px',
            marginTop: 20,
            borderRadius: 12,
            background: '#7c5cff',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Download update
        </a>

        {!update.mandatory && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            style={{
              width: '100%',
              marginTop: 10,
              padding: 12,
              border: 0,
              background: 'transparent',
              color: '#b9b9c8',
              cursor: 'pointer',
            }}
          >
            Later
          </button>
        )}

        {checking && (
          <p style={{ color: '#9999aa', fontSize: 12 }}>
            Checking for updates…
          </p>
        )}
      </div>
    </div>
  )
}

