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
    // Explicitly trigger download of both Rajdhani weights and wait for them
    Promise.all([
      document.fonts.load("300 16px 'Rajdhani'"),
      document.fonts.load("400 16px 'Rajdhani'"),
    ]).then(() => {
      this.scene.start('MainMenuScene');
    });
  }
}
