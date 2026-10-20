import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { TextureFactory } from '../gfx/TextureFactory';

/**
 * First scene: waits for the bundled font, then paints every texture in small
 * slices (so the progress bar animates and the browser never freezes), then
 * starts the always-on Background scene and the main menu.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = this.scale;
    const barW = Math.min(420, width * 0.6);
    const g = this.add.graphics();
    const label = this.add
      .text(width / 2, height / 2 + 40, 'Painting the world…', { fontFamily: 'Poppins, sans-serif', fontSize: '18px', color: COLORS.textDim })
      .setOrigin(0.5);
    const draw = (p: number) => {
      g.clear();
      g.fillStyle(0x0d0f22, 1).fillRoundedRect(width / 2 - barW / 2, height / 2 - 8, barW, 16, 8);
      g.fillStyle(COLORS.accent, 1).fillRoundedRect(width / 2 - barW / 2, height / 2 - 8, Math.max(16, barW * p), 16, 8);
    };
    draw(0);

    const fontReady = (document as Document & { fonts?: FontFaceSet }).fonts
      ? Promise.race([
          Promise.all([document.fonts.load('700 32px Poppins'), document.fonts.load('500 24px Poppins')]),
          new Promise((r) => setTimeout(r, 2500)),
        ])
      : Promise.resolve();

    void fontReady.then(() => {
      const jobs = new TextureFactory(this).jobs();
      let i = 0;
      const step = () => {
        try {
          jobs[i].run();
        } catch (err) {
          console.error(`[boot] failed while building "${jobs[i].label}"`, err);
        }
        i++;
        draw(i / jobs.length);
        if (i < jobs.length) {
          label.setText(`Painting the world… ${jobs[i].label}`);
          this.time.delayedCall(0, step);
        } else this.finish();
      };
      step();
    });
  }

  private finish(): void {
    document.getElementById('boot-loader')?.classList.add('hidden');
    setTimeout(() => document.getElementById('boot-loader')?.remove(), 600);
    this.scene.launch('Background');
    this.scene.start('MainMenu');
  }
}
