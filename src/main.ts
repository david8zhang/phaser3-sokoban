import Phaser from 'phaser'

import Game from './scenes/Game'
import LevelFinishedScene from './scenes/LevelFinishedScene'
import Preloader from './scenes/Preload'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser',
  dom: {
    createContainer: true,
  },
  width: 640,
  height: 512,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: true,
    },
  },
  scene: [Preloader, Game, LevelFinishedScene],
}

export default new Phaser.Game(config)
