import Phaser from 'phaser';

/**
 * Shared touch state written by the on-screen controls (UIScene) and read by
 * the InputManager. A plain object keeps the two scenes decoupled.
 */
export const touchState = {
  /** Horizontal joystick axis, -1..1. */
  x: 0,
  /** Vertical joystick axis, -1..1 (down is positive). */
  y: 0,
  jump: false,
  sprint: false,
  pause: false,
  /** True once the player has touched the screen this session. */
  used: false,
};

export function resetTouchState(): void {
  touchState.x = 0;
  touchState.y = 0;
  touchState.jump = false;
  touchState.sprint = false;
  touchState.pause = false;
}

/**
 * Unifies keyboard, gamepad and touch into one per-frame snapshot so gameplay
 * code never cares which device the player is using.
 */
export class InputManager {
  axisX = 0;
  axisY = 0;
  jumpHeld = false;
  jumpPressed = false;
  sprint = false;
  pausePressed = false;
  /** Last device that produced input — used to pick tutorial text. */
  lastDevice: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';

  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private prevJump = false;
  private prevPause = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys(
        {
          left: K.LEFT,
          right: K.RIGHT,
          up: K.UP,
          down: K.DOWN,
          a: K.A,
          d: K.D,
          w: K.W,
          s: K.S,
          space: K.SPACE,
          z: K.Z,
          shift: K.SHIFT,
          esc: K.ESC,
          p: K.P,
        },
        false,
      ) as Record<string, Phaser.Input.Keyboard.Key>;
      // Stop the browser from scrolling the page with arrows / space.
      kb.addCapture([K.SPACE, K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    }
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    if (!gp || gp.total === 0) return null;
    return gp.getPad(0) ?? null;
  }

  update(): void {
    const k = this.keys;
    const down = (name: string) => !!k[name]?.isDown;

    let x = 0;
    let y = 0;
    let jump = false;
    let sprint = false;
    let pause = false;

    // Keyboard
    const kx = (down('right') || down('d') ? 1 : 0) - (down('left') || down('a') ? 1 : 0);
    const ky = (down('down') || down('s') ? 1 : 0);
    const kJump = down('space') || down('up') || down('w') || down('z');
    if (kx || ky || kJump || down('shift')) this.lastDevice = 'keyboard';
    x += kx;
    y += ky;
    jump ||= kJump;
    sprint ||= down('shift');
    pause ||= down('esc') || down('p');

    // Gamepad (standard mapping)
    const pad = this.pad();
    if (pad) {
      const sx = Math.abs(pad.leftStick.x) > 0.3 ? pad.leftStick.x : 0;
      const dx = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      const gx = dx || sx;
      const gy = pad.down || pad.leftStick.y > 0.5 ? 1 : 0;
      const gJump = pad.A || pad.B;
      const gSprint = pad.X || pad.Y || pad.R1 > 0.5 || pad.R2 > 0.5;
      const gPause = pad.isButtonDown(9);
      if (gx || gJump || gSprint) this.lastDevice = 'gamepad';
      if (!kx) x += gx;
      y = Math.max(y, gy);
      jump ||= gJump;
      sprint ||= gSprint;
      pause ||= gPause;
    }

    // Touch
    if (touchState.x || touchState.jump || touchState.sprint) this.lastDevice = 'touch';
    if (!x && touchState.x) x = touchState.x;
    if (touchState.y > 0.6) y = 1;
    jump ||= touchState.jump;
    sprint ||= touchState.sprint;
    pause ||= touchState.pause;
    touchState.pause = false;

    this.axisX = Phaser.Math.Clamp(x, -1, 1);
    this.axisY = y;
    this.jumpPressed = jump && !this.prevJump;
    this.jumpHeld = jump;
    this.sprint = sprint;
    this.pausePressed = pause && !this.prevPause;
    this.prevJump = jump;
    this.prevPause = pause;
  }

  /** Forget held state (e.g. after unpausing) so nothing fires by accident. */
  reset(): void {
    this.prevJump = true;
    this.prevPause = true;
    this.jumpPressed = false;
    this.pausePressed = false;
  }
}
