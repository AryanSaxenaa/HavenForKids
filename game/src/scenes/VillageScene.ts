import Phaser from 'phaser'
import { CHARACTER_ZONES, START_POSITIONS } from '../config/zones'
import { DayNightOverlay } from '../ui/DayNightOverlay'
import { bus } from '../events/bus'
import { loadSession } from '../store/session'
import type { Character } from '../../../shared/src/types'

interface VillageSceneData {
  preferredCharacter?: Character
}

export class VillageScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>
  private spaceKey!: Phaser.Input.Keyboard.Key
  private speechBubble!: Phaser.GameObjects.Image
  private dayNight!: DayNightOverlay
  private nearbyCharacter: Character | null = null
  private characterSprites: Map<Character, Phaser.GameObjects.Sprite> = new Map()
  private ambientSound?: Phaser.Sound.BaseSound
  private readonly SPEED = 120
  private _conversationOpen = false
  private _dayNightTick = 0          // throttle day/night updates to once per minute
  private _proximityTick = 0         // throttle proximity checks to every 100 ms
  // Store bound handlers so we can remove them correctly
  private _boundOnConversationClose!: () => void

  constructor() {
    super({ key: 'VillageScene' })
  }

  init(data: VillageSceneData): void {
    // data.preferredCharacter is passed when launching from onboarding
    void data
  }

  create(): void {
    const { width, height } = this.scale

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.image(width / 2, height / 2, 'village-bg')
    // setScale is cheaper than setDisplaySize — avoids per-frame size recalculation
    bg.setScale(width / bg.width, height / bg.height)
    bg.setDepth(0)

    // ── Player spawn ─────────────────────────────────────────────
    const session = loadSession()
    const startChar: Character = session?.preferredCharacter ?? 'Cleo'
    const startPos = START_POSITIONS[startChar]

    // Spawn slightly below the preferred character so the player doesn't
    // land inside the interaction zone and immediately open a conversation
    this.player = this.add.sprite(startPos.x, startPos.y + 80, 'player')
    this.player.setScale(3)
    this.player.setDepth(20)
    this.player.play('player-idle')

    // ── Camera ───────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, width, height)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // ── Character sprites ─────────────────────────────────────────
    for (const zone of CHARACTER_ZONES) {
      const sprite = this.add.sprite(zone.spriteX, zone.spriteY, zone.character.toLowerCase())
      sprite.setScale(3)
      sprite.setDepth(15)
      sprite.play(`${zone.character.toLowerCase()}-idle`)
      this.characterSprites.set(zone.character, sprite)

      // Click to interact
      sprite.setInteractive({ useHandCursor: true })
      sprite.on('pointerdown', () => {
        if (this.nearbyCharacter === zone.character) {
          this._startConversation(zone.character)
        }
      })
    }

    // ── Speech bubble ─────────────────────────────────────────────
    this.speechBubble = this.add.image(0, 0, 'speech-bubble')
    this.speechBubble.setScale(2)
    this.speechBubble.setDepth(25)
    this.speechBubble.setVisible(false)

    // ── Input ────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' }) as Record<string, Phaser.Input.Keyboard.Key>
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // ── Day/night overlay ─────────────────────────────────────────
    this.dayNight = new DayNightOverlay(this, width, height)

    // ── Ambient audio ─────────────────────────────────────────────
    if (this.cache.audio.has('ambient')) {
      this.ambientSound = this.sound.add('ambient', { loop: true, volume: 0.3 })
      this.ambientSound.play()
    }

    // ── Bus listeners ─────────────────────────────────────────────
    this._boundOnConversationClose = this._onConversationClose.bind(this)
    bus.on('conversation:close', this._boundOnConversationClose)
  }

  update(): void {
    const left  = this.cursors.left?.isDown  || (this.wasd['left']?.isDown  ?? false)
    const right = this.cursors.right?.isDown || (this.wasd['right']?.isDown ?? false)
    const up    = this.cursors.up?.isDown    || (this.wasd['up']?.isDown    ?? false)
    const down  = this.cursors.down?.isDown  || (this.wasd['down']?.isDown  ?? false)

    let vx = 0
    let vy = 0

    if (left)  vx = -this.SPEED
    if (right) vx =  this.SPEED
    if (up)    vy = -this.SPEED
    if (down)  vy =  this.SPEED

    // Normalise diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707
      vy *= 0.707
    }

    const delta = this.game.loop.delta
    const dt = delta / 1000
    this.player.x += vx * dt
    this.player.y += vy * dt

    // Clamp to canvas bounds
    const { width, height } = this.scale
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, width - 16)
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, height - 16)

    // Animations
    if (left)       this.player.play('player-walk-left',  true)
    else if (right) this.player.play('player-walk-right', true)
    else if (up)    this.player.play('player-walk-up',    true)
    else if (down)  this.player.play('player-walk-down',  true)
    else            this.player.play('player-idle',       true)

    // Proximity detection — throttled to every 100 ms (no need to check 60× per second)
    this._proximityTick += delta
    if (this._proximityTick >= 100) {
      this._proximityTick = 0
      this._checkProximity()
    }

    // Day/night overlay — update once per minute
    this._dayNightTick += delta
    if (this._dayNightTick >= 60_000) {
      this._dayNightTick = 0
      this.dayNight.update()
    }

    // Space to start conversation
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.nearbyCharacter) {
      this._startConversation(this.nearbyCharacter)
    }
  }

  private _checkProximity(): void {
    let closest: Character | null = null
    let closestDist = Infinity

    for (const zone of CHARACTER_ZONES) {
      const px = this.player.x
      const py = this.player.y
      const inZone =
        px >= zone.x &&
        px <= zone.x + zone.width &&
        py >= zone.y &&
        py <= zone.y + zone.height

      if (inZone) {
        const dist = Phaser.Math.Distance.Between(px, py, zone.spriteX, zone.spriteY)
        if (dist < closestDist) {
          closestDist = dist
          closest = zone.character
        }
      }
    }

    this.nearbyCharacter = closest

    if (closest) {
      const sprite = this.characterSprites.get(closest)
      if (sprite) {
        this.speechBubble.setPosition(sprite.x, sprite.y - 48)
        this.speechBubble.setVisible(true)
      }
    } else {
      this.speechBubble.setVisible(false)
    }
  }

  private _startConversation(character: Character): void {
    if (this._conversationOpen) return
    this._conversationOpen = true
    this.scene.pause()
    this.scene.launch('ConversationScene', { character })
  }

  private _onConversationClose(): void {
    this._conversationOpen = false
    this.scene.resume()
  }

  shutdown(): void {
    bus.off('conversation:close', this._boundOnConversationClose)
    this.ambientSound?.stop()
    this.dayNight.destroy()
  }
}
