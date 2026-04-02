import Phaser from 'phaser'

interface TimeSlot {
  startHour: number
  endHour: number
  tint: number
  alpha: number
}

const TIME_SLOTS: TimeSlot[] = [
  { startHour: 6,  endHour: 17, tint: 0xFFFFFF, alpha: 0    },  // daytime — no overlay
  { startHour: 17, endHour: 20, tint: 0xFF8C42, alpha: 0.25 },  // golden hour
  { startHour: 20, endHour: 22, tint: 0x2C3E6B, alpha: 0.35 },  // dusk
  { startHour: 22, endHour: 6,  tint: 0x0A0F2C, alpha: 0.55 },  // night (wraps midnight)
]

function getTimeSlot(hour: number): TimeSlot {
  for (const slot of TIME_SLOTS) {
    if (slot.startHour < slot.endHour) {
      if (hour >= slot.startHour && hour < slot.endHour) return slot
    } else {
      // Wraps midnight (e.g. 22–6)
      if (hour >= slot.startHour || hour < slot.endHour) return slot
    }
  }
  return TIME_SLOTS[0]!
}

export class DayNightOverlay {
  private overlay: Phaser.GameObjects.Rectangle

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.overlay = scene.add
      .rectangle(0, 0, width, height, 0xFFFFFF, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50)

    this._applySlot(getTimeSlot(new Date().getHours()))
  }

  /** Call each frame (or each minute) to keep the overlay in sync with real time. */
  update(): void {
    this._applySlot(getTimeSlot(new Date().getHours()))
  }

  private _applySlot(slot: TimeSlot): void {
    this.overlay.setFillStyle(slot.tint, slot.alpha)
  }

  destroy(): void {
    this.overlay.destroy()
  }
}
