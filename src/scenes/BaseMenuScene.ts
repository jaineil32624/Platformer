import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { Button, ButtonOptions, FocusGroup } from '../ui/Button';
import { drawPanel, textStyle, TextKind, uiScale } from '../ui/theme';
import { Platform } from '../utils/platform';

/**
 * Shared scaffolding for every menu/overlay:
 *  - responsive: the whole menu is rebuilt (cheaply) on resize/orientation change
 *  - keyboard/gamepad focus navigation and a Back action
 *  - fade transitions and small layout helpers
 * Subclasses implement `build()` and return the buttons that can take focus.
 */
export abstract class BaseMenuScene<D extends object = object> extends Phaser.Scene {
  protected s = 1;
  protected focus!: FocusGroup;
  protected params = {} as D;
  /** Overlays dim the scene underneath instead of replacing it. */
  protected overlay = false;
  private resizeTimer: Phaser.Time.TimerEvent | null = null;
  private leaving = false;

  init(data: D): void {
    this.params = data ?? ({} as D);
    this.leaving = false;
  }

  create(): void {
    // Overlays must render above the gameplay scenes regardless of registration order.
    if (this.overlay) this.scene.bringToTop();
    this.focus = new FocusGroup(this, () => this.onBack());
    this.rebuild(true);
    const onResize = () => {
      this.resizeTimer?.remove();
      this.resizeTimer = this.time.delayedCall(120, () => this.rebuild(false));
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    if (!this.overlay) this.cameras.main.fadeIn(260, 27, 31, 59);
  }

  protected rebuild(first: boolean): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.s = uiScale(this);
    if (this.overlay) this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0d0f22, 0.62).setOrigin(0).setInteractive();
    const buttons = this.build(first);
    this.focus.set(buttons, !Platform.isMobileLike());
  }

  protected abstract build(first: boolean): Button[];

  /** Esc / B / Android back. */
  protected onBack(): void {}

  get W(): number {
    return this.scale.width;
  }
  get H(): number {
    return this.scale.height;
  }

  /** Fade out and start another (non-overlay) scene. */
  protected goto(key: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(220, 27, 31, 59);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  protected text(x: number, y: number, str: string, kind: TextKind, color?: string, scaleMul = 1): Phaser.GameObjects.Text {
    return this.add.text(x, y, str, textStyle(kind, this.s * scaleMul, color)).setOrigin(0.5);
  }

  protected heading(str: string, y = 70): Phaser.GameObjects.Text {
    const t = this.text(this.W / 2, y * this.s, str, 'heading', COLORS.text, 1.15);
    t.setAlpha(0).setY(t.y - 20 * this.s);
    this.tweens.add({ targets: t, alpha: 1, y: t.y + 20 * this.s, duration: 350, ease: 'Back.easeOut' });
    return t;
  }

  protected button(x: number, y: number, opts: Omit<ButtonOptions, 'scale' | 'width' | 'height'> & { width?: number; height?: number }, delay = 0): Button {
    const b = new Button(this, x, y, { width: 300 * this.s, height: 70 * this.s, ...opts, scale: this.s });
    b.setAlpha(0).setScale(0.85);
    this.tweens.add({ targets: b, alpha: b.disabled ? 0.6 : 1, scale: 1, duration: 260, delay, ease: 'Back.easeOut' });
    return b;
  }

  protected backButton(): Button {
    const size = 64 * this.s;
    return this.button(24 * this.s + size / 2, 24 * this.s + size / 2, {
      icon: 'back',
      width: size,
      height: size,
      onClick: () => this.onBack(),
    });
  }

  protected panel(x: number, y: number, w: number, h: number, fill?: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics({ x, y });
    drawPanel(g, w, h, this.s, { fill });
    return g;
  }

  /** Simple confirm dialog built from the same components. */
  protected confirm(message: string, onYes: () => void, yesLabel = 'Yes', alt?: { label: string; onClick: () => void }): void {
    const s = this.s;
    const layer = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(0, 0, this.W, this.H, 0x000000, 0.6).setOrigin(0).setInteractive();
    const w = Math.min(560 * s, this.W * 0.9);
    const h = 260 * s;
    const p = this.add.graphics({ x: this.W / 2, y: this.H / 2 });
    drawPanel(p, w, h, s);
    const msg = this.text(this.W / 2, this.H / 2 - 45 * s, message, 'body').setWordWrapWidth(w - 60 * s).setAlign('center');
    const close = () => {
      layer.destroy();
      this.focus.set(prev, !Platform.isMobileLike());
    };
    const prev = [...this.focus.buttons];
    const yes = new Button(this, this.W / 2 - 110 * s, this.H / 2 + 60 * s, {
      label: yesLabel,
      width: 190 * s,
      height: 64 * s,
      scale: s,
      color: /delete|quit|reset|erase/i.test(yesLabel) ? COLORS.danger : COLORS.accentDark,
      onClick: () => {
        close();
        onYes();
      },
    });
    const no = new Button(this, this.W / 2 + 110 * s, this.H / 2 + 60 * s, { label: 'Cancel', width: 190 * s, height: 64 * s, scale: s, onClick: close });
    layer.add([dim, p, msg, yes, no]);
    const focusable = [no, yes];
    if (alt) {
      const b = new Button(this, this.W / 2, this.H / 2 + h / 2 + 50 * s, {
        label: alt.label,
        width: 300 * s,
        height: 60 * s,
        scale: s,
        onClick: () => {
          close();
          alt.onClick();
        },
      });
      layer.add(b);
      focusable.push(b);
    }
    this.focus.set(focusable, !Platform.isMobileLike());
  }
}
