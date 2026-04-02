import Phaser from 'phaser'
import { bus } from '../events/bus'
import { loadSession } from '../store/session'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    const { width, height } = this.scale

    // ── Progress bar ──────────────────────────────────────────────
    const barBg = this.add.rectangle(width / 2, height / 2 + 20, 300, 20, 0x333355)
    const bar = this.add.rectangle(width / 2 - 150, height / 2 + 20, 0, 20, 0x7c6af5)
    bar.setOrigin(0, 0.5)

    this.add
      .text(width / 2, height / 2 - 20, 'Loading HAVEN...', {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)

    this.load.on('progress', (value: number) => {
      bar.width = 300 * value
      barBg.width = 300 // keep it stable
    })

    // ── Background ────────────────────────────────────────────────
    this.load.image('village-bg', 'assets/bg/village.png')

    // ── Player ────────────────────────────────────────────────────
    this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: 16, frameHeight: 16 })

    // ── Characters (48×48 frames — 2-frame idle sheet = 96×48) ──────
    this.load.spritesheet('pip',     'assets/sprites/pip.png',     { frameWidth: 48, frameHeight: 48 })
    this.load.spritesheet('bramble', 'assets/sprites/bramble.png', { frameWidth: 48, frameHeight: 48 })
    this.load.spritesheet('flint',   'assets/sprites/flint.png',   { frameWidth: 48, frameHeight: 48 })
    this.load.spritesheet('luna',    'assets/sprites/luna.png',    { frameWidth: 48, frameHeight: 48 })
    this.load.spritesheet('cleo',    'assets/sprites/cleo.png',    { frameWidth: 48, frameHeight: 48 })

    // ── UI ────────────────────────────────────────────────────────
    this.load.image('speech-bubble', 'assets/ui/speech-bubble.png')
    this.load.image('panel-bg',      'assets/ui/panel-ninepatch.png')

    // ── Audio ─────────────────────────────────────────────────────
    // village-ambient.mp3 — add a CC0 ambient loop from freesound.org
    this.load.audio('ambient',   'assets/audio/village-ambient.mp3')
    this.load.audio('chat-open', 'assets/audio/chat-open.ogg')
    this.load.audio('step',      'assets/audio/step.ogg')
  }

  create(): void {
    // ── Register all animations here so they're available globally ─
    this._createAnimations()

    const session = loadSession()

    if (session) {
      // Returning child — go straight to village
      this.scene.start('VillageScene')
    } else {
      // New child — signal React to show onboarding overlay
      bus.emit('game:ready', undefined)
    }
  }

  private _createAnimations(): void {
    // Player — 4-directional walk + idle
    this.anims.create({ key: 'player-walk-down',  frames: this.anims.generateFrameNumbers('player', { start: 0,  end: 2  }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'player-walk-left',  frames: this.anims.generateFrameNumbers('player', { start: 3,  end: 5  }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'player-walk-right', frames: this.anims.generateFrameNumbers('player', { start: 6,  end: 8  }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'player-walk-up',    frames: this.anims.generateFrameNumbers('player', { start: 9,  end: 11 }), frameRate: 8, repeat: -1 })
    this.anims.create({ key: 'player-idle',       frames: this.anims.generateFrameNumbers('player', { start: 0,  end: 0  }), frameRate: 1, repeat: -1 })

    // Characters — 2-frame idle loop
    const charKeys = ['pip', 'bramble', 'flint', 'luna', 'cleo'] as const
    for (const key of charKeys) {
      this.anims.create({
        key: `${key}-idle`,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      })
    }
  }
}
