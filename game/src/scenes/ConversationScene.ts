import Phaser from 'phaser'
import { bus } from '../events/bus'
import { chatRequest, endConversation } from '../api/client'
import { loadSession } from '../store/session'
import { CHARACTER_MAP } from '../config/characters'
import type { Character, Message, Tone } from '../../../shared/src/types'

interface ConversationSceneData {
  character: Character
}

const PANEL_WIDTH = 320
const PANEL_HEIGHT = 480
const PANEL_PADDING = 16

export class ConversationScene extends Phaser.Scene {
  private character!: Character
  private history: Message[] = []
  private tones: Tone[] = []
  private chatInput!: HTMLInputElement
  private chatLog: string[] = []
  private logText!: Phaser.GameObjects.Text
  private typingTimer?: Phaser.Time.TimerEvent | undefined
  private isWaitingForResponse = false
  private closeButton!: Phaser.GameObjects.Text
  // Store the bound handler so it can be properly removed
  private _boundOnInputKeyDown!: (e: KeyboardEvent) => void
  private _boundOnInputInput!: (e: Event) => void
  private _charCountText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'ConversationScene' })
  }

  init(data: ConversationSceneData): void {
    this.character = data.character
    this.history = []
    this.tones = []
    this.chatLog = []
    this.isWaitingForResponse = false
    this._inputHidden = false   // reset so _hideInput works fresh each visit
    this._stopped = false       // reset so async guards work fresh each visit
    this.typingTimer = undefined // ensure no stale timer from a previous visit
  }

  create(): void {
    const { width, height } = this.scale
    const panelX = width - PANEL_WIDTH - 20
    const panelY = (height - PANEL_HEIGHT) / 2
    const charDef = CHARACTER_MAP[this.character]

    // ── Dim overlay ───────────────────────────────────────────────
    this.add.rectangle(0, 0, width, height, 0x000000, 0.4).setOrigin(0).setDepth(98)

    // ── Chat panel background ─────────────────────────────────────
    this.add
      .rectangle(panelX, panelY, PANEL_WIDTH, PANEL_HEIGHT, 0xfff8f0)
      .setOrigin(0)
      .setDepth(99)
      .setStrokeStyle(2, charDef.color)

    // ── Character name ────────────────────────────────────────────
    this.add
      .text(panelX + PANEL_WIDTH / 2, panelY + PANEL_PADDING, `${this.character}`, {
        fontSize: '16px',
        color: '#2d2d2d',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(100)

    this.add
      .text(panelX + PANEL_WIDTH / 2, panelY + PANEL_PADDING + 22, charDef.emotionalZone, {
        fontSize: '10px',
        color: `#${charDef.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
      .setDepth(100)

    // ── Close button ──────────────────────────────────────────────
    this.closeButton = this.add
      .text(panelX + PANEL_WIDTH - PANEL_PADDING, panelY + PANEL_PADDING, '✕', {
        fontSize: '16px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })

    this.closeButton.on('pointerdown', () => this._endConversation())

    // ── Chat log area ─────────────────────────────────────────────
    const logY = panelY + 70
    const logHeight = PANEL_HEIGHT - 70 - 60

    this.add
      .rectangle(panelX + PANEL_PADDING, logY, PANEL_WIDTH - PANEL_PADDING * 2, logHeight, 0xfff0e8)
      .setOrigin(0)
      .setDepth(99)

    this.logText = this.add
      .text(panelX + PANEL_PADDING + 4, logY + 4, '', {
        fontSize: '11px',
        color: '#2d2d2d',
        fontFamily: 'monospace',
        wordWrap: { width: PANEL_WIDTH - PANEL_PADDING * 2 - 8 },
        lineSpacing: 4,
      })
      .setOrigin(0)
      .setDepth(100)

    // ── Send button ───────────────────────────────────────────────
    const btnY = panelY + PANEL_HEIGHT - 44
    const sendBtn = this.add
      .rectangle(panelX + PANEL_WIDTH - PANEL_PADDING - 40, btnY, 44, 32, charDef.color)
      .setOrigin(0, 0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })

    this.add
      .text(panelX + PANEL_WIDTH - PANEL_PADDING - 18, btnY + 16, '▶', {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(101)

    sendBtn.on('pointerdown', () => this._submitMessage())

    // ── Position HTML chat input ──────────────────────────────────
    this.chatInput = document.getElementById('chat-input') as HTMLInputElement
    const canvasRect = this.game.canvas.getBoundingClientRect()
    const scaleX = canvasRect.width / width
    const scaleY = canvasRect.height / height

    this.chatInput.style.left = `${canvasRect.left + (panelX + PANEL_PADDING) * scaleX}px`
    this.chatInput.style.top = `${canvasRect.top + (panelY + PANEL_HEIGHT - 48) * scaleY}px`
    this.chatInput.style.width = `${(PANEL_WIDTH - PANEL_PADDING * 2 - 52) * scaleX}px`
    this.chatInput.style.display = 'block'
    this.chatInput.focus()

    // Enter to submit
    this._boundOnInputKeyDown = this._onInputKeyDown.bind(this)
    this.chatInput.addEventListener('keydown', this._boundOnInputKeyDown)

    // Live character counter — show warning text when nearing the 500-char limit
    this._charCountText = this.add
      .text(panelX + PANEL_WIDTH - PANEL_PADDING, panelY + PANEL_HEIGHT - 52, '', {
        fontSize: '9px',
        color: '#c0392b',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setDepth(101)
      .setVisible(false)

    this._boundOnInputInput = this._onInputInput.bind(this)
    this.chatInput.addEventListener('input', this._boundOnInputInput)

    // Escape to close — only if not in crisis (crisis overlay handles Escape itself)
    this.input.keyboard!.on('keydown-ESC', () => this._endConversation())

    // Play open sound
    if (this.cache.audio.has('chat-open')) {
      this.sound.play('chat-open', { volume: 0.5 })
    }

    // Opening greeting from character (uses a special greeting prompt, not sent to API as empty string)
    this._appendLog(`${this.character}: ...`)
    this._sendGreeting()
  }

  private _sendGreeting(): void {
    // Block input while greeting loads — prevents submitting before character has spoken
    this.isWaitingForResponse = true
    const session = loadSession()
    // Pass the child's name so the character can greet them personally.
    // The GREETING:<name> token is recognised by every character's system prompt.
    const greetingMessage = session ? `GREETING:${session.childName}` : 'GREETING:friend'
    void this._sendToCharacter(greetingMessage, true)
  }

  private _onInputKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      this._submitMessage()
    }
  }

  private _onInputInput(_e: Event): void {
    const remaining = 500 - this.chatInput.value.length
    if (remaining <= 100) {
      this._charCountText.setText(`${remaining} left`)
      this._charCountText.setVisible(true)
    } else {
      this._charCountText.setVisible(false)
    }
  }

  private async _submitMessage(): Promise<void> {
    const text = this.chatInput.value.trim()
    if (!text || this.isWaitingForResponse) return

    this.chatInput.value = ''
    this.isWaitingForResponse = true

    this._appendLog(`You: ${text}`)

    this.history.push({ role: 'user', content: text })
    await this._sendToCharacter(text)
  }

  private async _sendToCharacter(message: string, isGreeting = false): Promise<void> {
    const session = loadSession()
    if (!session) {
      this._endConversation()
      return
    }

    let crisisTriggered = false

    try {
      const response = await chatRequest({
        sessionId: session.sessionId,
        character: this.character,
        message,
        history: this.history,
      })

      // Scene may have been closed by the user while the API call was in flight.
      // Bail out to avoid manipulating destroyed scene objects.
      if (this._stopped) return

      if (response.crisis) {
        crisisTriggered = true
        this._appendLog(`${this.character}: ${response.message}`)
        // Brief delay so child sees the compassionate response before overlay
        this.time.delayedCall(1500, () => {
          this._hideInput()
          // Resume the village scene before stopping (ConversationScene was launched
          // via scene.launch which doesn't pause VillageScene automatically, but
          // _startConversation calls scene.pause — we must resume it now)
          this.scene.resume('VillageScene')
          bus.emit('crisis:trigger', undefined)
          this.scene.stop()
        })
        return
      }

      // Always record the assistant reply in history for context continuity.
      // Don't record the greeting exchange at all — the greeting user token
      // (GREETING:<name>) has no matching user history push, so adding the
      // assistant reply alone would start history with an assistant turn,
      // which is an invalid Mistral conversation format.
      if (!isGreeting) {
        this.tones.push(response.tone)
        this.history.push({ role: 'assistant', content: response.message })
      }
      this._animateResponse(response.message)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('404') || msg.includes('Session not found')) {
        // Session no longer exists on server — close cleanly
        this._endConversation()
        return
      }
      if (msg.includes('429')) {
        // Rate limited — let child know and re-enable input
        this._appendLog(`${this.character}: Just a moment... (try again in a little while)`)
      } else {
        this._appendLog(`${this.character}: I'm here. Take your time.`)
      }
    } finally {
      // Do not re-enable input if a crisis exit is pending
      if (!crisisTriggered) {
        this.isWaitingForResponse = false
      }
    }
  }

  private _animateResponse(text: string): void {
    const prefix = `${this.character}: `

    // Always add a new placeholder line that the typewriter will fill in
    this._appendLog(prefix + '...')

    let i = 0
    this.typingTimer = this.time.addEvent({
      delay: 30,
      repeat: text.length - 1,
      callback: () => {
        i++
        this.chatLog[this.chatLog.length - 1] = prefix + text.substring(0, i)
        this._renderLog()
      },
    })
  }

  private _appendLog(line: string): void {
    this.chatLog.push(line)
    // Keep last 14 lines — panel is ~350px tall; 11px font + 4px spacing ≈ 23px/line
    if (this.chatLog.length > 14) this.chatLog.shift()
    this._renderLog()
  }

  private _renderLog(): void {
    this.logText.setText(this.chatLog.join('\n'))
  }

  private _endConversation(): void {
    this._stopped = true
    this._hideInput()

    const userMessages = this.history.filter((m) => m.role === 'user')
    if (userMessages.length > 0) {
      const session = loadSession()
      if (session) {
        // Fire-and-forget tone scoring
        endConversation({
          sessionId: session.sessionId,
          character: this.character,
          messageCount: userMessages.length,
          tones: this.tones.length > 0 ? this.tones : ['neutral'],
        }).catch(() => {
          // Non-critical — ignore failures
        })
      }
    }

    bus.emit('conversation:close', undefined)
    this.scene.stop()
  }

  private _inputHidden = false
  private _stopped = false

  private _hideInput(): void {
    if (this._inputHidden) return
    this._inputHidden = true
    if (this.chatInput) {
      this.chatInput.style.display = 'none'
      this.chatInput.removeEventListener('keydown', this._boundOnInputKeyDown)
      this.chatInput.removeEventListener('input', this._boundOnInputInput)
    }
    this._charCountText?.setVisible(false)
    this.typingTimer?.remove()
    this.typingTimer = undefined
  }

  shutdown(): void {
    this._hideInput()
  }
}
