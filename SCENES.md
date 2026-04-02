# HAVEN — Phaser Scene Reference

Exact contract for every Phaser scene: what it does, what it owns, how it communicates.
AI tools: read this before generating any scene code.

---

## Scene Registry

| Scene key | File | Launched by | Purpose |
|---|---|---|---|
| `BootScene` | `game/src/scenes/BootScene.ts` | Phaser config (first) | Preload all assets |
| `VillageScene` | `game/src/scenes/VillageScene.ts` | BootScene → `this.scene.start` | Main game world |
| `ConversationScene` | `game/src/scenes/ConversationScene.ts` | VillageScene → `this.scene.launch` | Chat overlay |
| `CrisisScene` | `game/src/scenes/CrisisScene.ts` | `bus.emit('crisis:trigger')` | Full-screen crisis |

Note: `OnboardingScene` is a React overlay — NOT a Phaser scene. Phaser boots only after
onboarding is complete. React mounts a `<OnboardingOverlay>` component before the Phaser
game div is created.

---

## BootScene

**File**: `game/src/scenes/BootScene.ts`  
**Extends**: `Phaser.Scene`

**Responsibilities**:
- Load ALL assets (sprites, backgrounds, audio) in `preload()`
- Show a simple loading progress bar
- On `create()`: check `localStorage.haven_session` — if exists, go straight to VillageScene; if not, emit `bus.emit('game:ready')` to let React show the onboarding overlay

**Asset keys to preload** (keys used everywhere in the game):
```typescript
// Background
this.load.image('village-bg', 'assets/bg/village.png')

// Player
this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: 16, frameHeight: 16 })

// Characters
this.load.spritesheet('pip', 'assets/sprites/pip.png',     { frameWidth: 16, frameHeight: 16 })
this.load.spritesheet('bramble', 'assets/sprites/bramble.png', { frameWidth: 16, frameHeight: 16 })
this.load.spritesheet('flint', 'assets/sprites/flint.png', { frameWidth: 16, frameHeight: 16 })
this.load.spritesheet('luna', 'assets/sprites/luna.png',   { frameWidth: 16, frameHeight: 16 })
this.load.spritesheet('cleo', 'assets/sprites/cleo.png',   { frameWidth: 16, frameHeight: 16 })

// UI
this.load.image('speech-bubble', 'assets/ui/speech-bubble.png')
this.load.image('panel-bg', 'assets/ui/panel-ninepatch.png')

// Audio
this.load.audio('ambient', 'assets/audio/village-ambient.mp3')
this.load.audio('chat-open', 'assets/audio/chat-open.wav')
this.load.audio('step', 'assets/audio/step.wav')
```

---

## VillageScene

**File**: `game/src/scenes/VillageScene.ts`  
**Extends**: `Phaser.Scene`

**Responsibilities**:
- Place village background image (scaled to fit 960×640 canvas)
- Spawn player avatar at starting position (from `localStorage.haven_session.preferredCharacter`)
- Handle player movement (cursors + WASD + virtual gamepad via phaser3-rex-plugins)
- Place 5 character sprites at positions from `game/src/config/zones.ts`
- Run proximity detection: when player overlaps a character zone, show speech bubble, enable interaction
- Day/night overlay via `DayNightOverlay`
- Emotion weather particle system (bonus feature)
- Listen on `bus.on('conversation:close')` → resume scene input
- On Space/click near character: `this.scene.launch('ConversationScene', { character })` + `this.scene.pause()`

**Does NOT own**:
- Chat panel (ConversationScene)
- Crisis overlay (React)
- Onboarding (React)

**Input handling**:
```typescript
// In create():
this.cursors = this.input.keyboard!.createCursorKeys()
this.wasd = this.input.keyboard!.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' })
this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
```

**Starting positions** (from `zones.ts`):
```typescript
const START_POSITIONS: Record<Character, { x: number; y: number }> = {
  Pip:    { x: 200, y: 180 },
  Bramble:{ x: 760, y: 180 },
  Flint:  { x: 480, y: 140 },
  Luna:   { x: 760, y: 460 },
  Cleo:   { x: 200, y: 460 },
}
```

---

## ConversationScene

**File**: `game/src/scenes/ConversationScene.ts`  
**Extends**: `Phaser.Scene`  
**Launched with data**: `{ character: Character }`

**Responsibilities**:
- Render the chat panel (right-side slide-in panel using NinePatch from phaser3-rex-plugins)
- Show character portrait + name at top of panel
- Render conversation history (scrollable, BBCodeText)
- Position an HTML `<input>` element over the canvas for child to type in
- On message submit: call `game/src/api/client.ts` → `POST /api/v1/chat`
- Typewriter-animate the character's response (animate character-by-character using a tween or timer)
- If `crisis: true` in response: `bus.emit('crisis:trigger')`, then `this.scene.stop()`
- On Escape / ✕ click:
  1. Collect `{ tones[] }` from conversation
  2. Call `POST /api/v1/conversation/end` (fire-and-forget, don't block)
  3. `bus.emit('conversation:close')`
  4. `this.scene.stop()`
  5. VillageScene resumes

**HTML input positioning**:
```typescript
// In create() — position the input below the chat history
const input = document.getElementById('chat-input') as HTMLInputElement
const canvasRect = this.game.canvas.getBoundingClientRect()
input.style.left = `${canvasRect.left + panelX}px`
input.style.top = `${canvasRect.top + panelY + panelHeight - 48}px`
input.style.display = 'block'
```

**Typewriter effect** (do NOT stream from server — animate the full returned string):
```typescript
animateText(target: BBCodeText, text: string) {
  let i = 0
  const timer = this.time.addEvent({
    delay: 30,
    repeat: text.length - 1,
    callback: () => {
      target.setText(text.substring(0, ++i))
    }
  })
}
```

**Does NOT own**:
- Actual AI calls (delegated to `api/client.ts`)
- Crisis overlay (React listens to bus)
- VillageScene state

---

## CrisisScene

**NOT a Phaser scene.** This is a React component.

**File**: `game/src/components/CrisisOverlay.tsx`

**Triggered by**: `bus.on('crisis:trigger')` in the React root component

**Behaviour**:
- Renders as a React portal into `document.body` (above the Phaser canvas)
- Full viewport, pastel background (`bg-rose-50`)
- Text: *"It sounds like things are really hard right now. You are not alone and you are safe."*
- Shows: Childline UK 0800 1111
- Two buttons: "I'm okay" → `bus.emit('conversation:close')` + unmount; "Get help" → `window.open('https://www.childline.org.uk', '_blank')`
- `onKeyDown` listener prevents Escape from closing
- `aria-live="assertive"` on the message for screen readers

---

## Character Zone Config

**File**: `game/src/config/zones.ts`

```typescript
import { Character } from '../../../shared/src/types'

export interface Zone {
  character: Character
  x: number       // top-left x of interaction zone (world coordinates)
  y: number       // top-left y
  width: number
  height: number
  spriteX: number // where the character sprite sits (centre)
  spriteY: number
}

export const CHARACTER_ZONES: Zone[] = [
  { character: 'Pip',     x: 140, y: 120, width: 120, height: 120, spriteX: 200, spriteY: 180 },
  { character: 'Bramble', x: 700, y: 120, width: 120, height: 120, spriteX: 760, spriteY: 180 },
  { character: 'Flint',   x: 420, y: 80,  width: 120, height: 120, spriteX: 480, spriteY: 140 },
  { character: 'Luna',    x: 700, y: 400, width: 120, height: 120, spriteX: 760, spriteY: 460 },
  { character: 'Cleo',    x: 140, y: 400, width: 120, height: 120, spriteX: 200, spriteY: 460 },
]
```

---

## DayNightOverlay

**File**: `game/src/ui/DayNightOverlay.ts`  
**Used in**: VillageScene

```typescript
// Hour → tint colour + alpha
const TIME_OF_DAY = [
  { hours: [6,  17], tint: 0xFFFFFF, alpha: 0 },    // daytime — no overlay
  { hours: [17, 20], tint: 0xFF8C42, alpha: 0.25 },  // golden hour
  { hours: [20, 22], tint: 0x2C3E6B, alpha: 0.35 },  // dusk
  { hours: [22, 6],  tint: 0x0A0F2C, alpha: 0.55 },  // night
]
```

Creates a full-canvas `Phaser.GameObjects.Rectangle` with matching tint and alpha.
Updates once on scene create — does not update in real time during a session.

---

## Animations Reference

Define all animations in BootScene (or VillageScene `create()`):

```typescript
// Player — 4-directional, 3 frames each
this.anims.create({ key: 'player-walk-down',  frames: this.anims.generateFrameNumbers('player', { start: 0,  end: 2  }), frameRate: 8, repeat: -1 })
this.anims.create({ key: 'player-walk-left',  frames: this.anims.generateFrameNumbers('player', { start: 3,  end: 5  }), frameRate: 8, repeat: -1 })
this.anims.create({ key: 'player-walk-right', frames: this.anims.generateFrameNumbers('player', { start: 6,  end: 8  }), frameRate: 8, repeat: -1 })
this.anims.create({ key: 'player-walk-up',    frames: this.anims.generateFrameNumbers('player', { start: 9,  end: 11 }), frameRate: 8, repeat: -1 })
this.anims.create({ key: 'player-idle',       frames: this.anims.generateFrameNumbers('player', { start: 0,  end: 0  }), frameRate: 1, repeat: -1 })

// Characters — 2-frame idle loop
['pip','bramble','flint','luna','cleo'].forEach(key => {
  this.anims.create({ key: `${key}-idle`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 1 }), frameRate: 2, repeat: -1 })
})
```
