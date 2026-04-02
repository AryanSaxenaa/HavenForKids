import Phaser from 'phaser'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BootScene } from './scenes/BootScene'
import { VillageScene } from './scenes/VillageScene'
import { ConversationScene } from './scenes/ConversationScene'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import { CrisisOverlay } from './components/CrisisOverlay'
import { bus } from './events/bus'
import { loadSession } from './store/session'

// ── Phaser game config ────────────────────────────────────────────
const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#87CEEB',
  parent: 'game-container',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, VillageScene, ConversationScene],
  audio: {
    disableWebAudio: false,
  },
}

// ── React root ────────────────────────────────────────────────────
function App({ alreadyBooted }: { alreadyBooted: boolean }) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showCrisis, setShowCrisis] = useState(false)
  // Initialise as true if Phaser was already started at module level (returning child).
  // This prevents a second Phaser instance being created if onboarding somehow shows.
  const [gameStarted, setGameStarted] = useState(alreadyBooted)
  // Stable ref so the module-level crisis listener can trigger the overlay
  // for returning children (Phaser boots before useEffect fires)
  const showCrisisRef = useRef<(() => void) | null>(null)
  showCrisisRef.current = () => setShowCrisis(true)

  useEffect(() => {
    // BootScene emits 'game:ready' when no session exists (new child)
    const onGameReady = () => setShowOnboarding(true)
    bus.on('game:ready', onGameReady)

    // Crisis overlay — covers both new-child and returning-child paths
    const onCrisis = () => showCrisisRef.current?.()
    bus.on('crisis:trigger', onCrisis)

    return () => {
      bus.off('game:ready', onGameReady)
      bus.off('crisis:trigger', onCrisis)
    }
  }, [])

  function handleOnboardingComplete() {
    setShowOnboarding(false)

    if (!gameStarted) {
      setGameStarted(true)
      // Small delay so React teardown is clean before Phaser boots
      setTimeout(() => {
        const game = new Phaser.Game(phaserConfig)
        // After onboarding, BootScene will find the session and go to VillageScene
        void game
      }, 100)
    }
  }

  function handleCrisisDismiss() {
    setShowCrisis(false)
  }

  return (
    <>
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      {showCrisis && <CrisisOverlay onDismiss={handleCrisisDismiss} />}
    </>
  )
}

// ── Bootstrap ─────────────────────────────────────────────────────
// Start Phaser immediately if session already exists (returning child).
// Otherwise React App will show onboarding first, then boot Phaser.
const existingSession = loadSession()

if (existingSession) {
  // Returning child — boot Phaser straight away
  new Phaser.Game(phaserConfig)
}

// Always mount React for overlays (crisis can happen at any time).
// Pass existingSession flag so App knows Phaser is already running.
const appRoot = document.getElementById('app')
if (appRoot) {
  createRoot(appRoot).render(
    <React.StrictMode>
      <App alreadyBooted={!!existingSession} />
    </React.StrictMode>,
  )
}
