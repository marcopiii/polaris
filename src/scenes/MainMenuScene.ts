import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

const LOGO_FONT_SIZE = 128;
const LOGO_FONT_FAMILY = "'Rajdhani', sans-serif";
const LOGO_LETTER_SPACING_EM = 0.22;

// O-symbol dimensions (matching the HTML reference)
const O_RING_DIAMETER = 88;
const O_DOT_DIAMETER = 34;
const O_SYMBOL_MARGIN = 20;

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.createLogo(centerX, centerY - 120);
    this.createStartButton(centerX, centerY + 80);
  }

  private createLogo(centerX: number, centerY: number) {
    const letterSpacingPx = LOGO_FONT_SIZE * LOGO_LETTER_SPACING_EM;

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: `${LOGO_FONT_SIZE}px`,
      color: '#ffffff',
      fontFamily: LOGO_FONT_FAMILY,
      fontStyle: '300',
    };

    // Create text objects offscreen to measure, then reposition
    const pText = this.add.text(0, -9999, 'P', textStyle).setOrigin(0, 0.5);
    const larisText = this.add.text(0, -9999, 'LARIS', textStyle).setOrigin(0, 0.5);

    // Apply letter spacing before measuring LARIS
    larisText.setLetterSpacing(letterSpacingPx);

    const pWidth = pText.width;
    const larisWidth = larisText.width;

    // O symbol total width = margin + ring + margin
    const oTotalWidth = O_SYMBOL_MARGIN + O_RING_DIAMETER + O_SYMBOL_MARGIN;

    // Total logo width
    const totalWidth = pWidth + oTotalWidth + larisWidth;
    const startX = centerX - totalWidth / 2;

    // Position all elements
    pText.setPosition(startX, centerY);
    larisText.setPosition(startX + pWidth + oTotalWidth, centerY);

    const oX = startX + pWidth + O_SYMBOL_MARGIN + O_RING_DIAMETER / 2;
    // Slight upward offset to visually align with text baseline (like margin-bottom: 6px in HTML)
    const oY = centerY - 6;

    // Apply text glow
    this.applyTextGlow(pText);
    this.applyTextGlow(larisText);

    // Draw O-symbol (red ring + red dot with glow)
    this.drawOSymbol(oX, oY);
  }

  private applyTextGlow(text: Phaser.GameObjects.Text) {
    text.setShadow(0, 0, '#ffffff', 16, true, true);
  }

  private drawOSymbol(cx: number, cy: number) {
    const gfx = this.add.graphics();

    // Outer glow layers for the ring
    const glowLayers = [
      { radius: O_RING_DIAMETER / 2 + 35, alpha: 0.05, width: 70 },
      { radius: O_RING_DIAMETER / 2 + 17, alpha: 0.1, width: 35 },
      { radius: O_RING_DIAMETER / 2 + 6, alpha: 0.2, width: 12 },
    ];

    for (const layer of glowLayers) {
      gfx.lineStyle(layer.width, 0xba0000, layer.alpha);
      gfx.strokeCircle(cx, cy, layer.radius);
    }

    // Main ring
    gfx.lineStyle(2, 0xba0000, 1);
    gfx.strokeCircle(cx, cy, O_RING_DIAMETER / 2);

    // Dot glow layers
    const dotGlowLayers = [
      { radius: 30, alpha: 0.08 },
      { radius: 22, alpha: 0.15 },
      { radius: 15, alpha: 0.25 },
    ];

    for (const layer of dotGlowLayers) {
      gfx.fillStyle(0xba0000, layer.alpha);
      gfx.fillCircle(cx, cy, layer.radius);
    }

    // Main dot
    gfx.fillStyle(0xba0000, 1);
    gfx.fillCircle(cx, cy, O_DOT_DIAMETER / 2);
  }

  private createStartButton(centerX: number, centerY: number) {
    const startButton = this.add.text(centerX, centerY, 'START GAME', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: LOGO_FONT_FAMILY,
      backgroundColor: '#444444',
      padding: { x: 20, y: 10 },
    });
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setStyle({ backgroundColor: '#666666' });
    });

    startButton.on('pointerout', () => {
      startButton.setStyle({ backgroundColor: '#444444' });
    });

    startButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });
  }
}
