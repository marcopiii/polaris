import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // TODO: Load audio assets when ready
    // this.load.audio('shoot', 'assets/audio/sfx/shoot.mp3');
    // etc.
  }

  create() {
    // Wait for Rajdhani font to be available before showing menu
    document.fonts.ready.then(() => {
      this.scene.start('MainMenuScene');
    });
  }
}
