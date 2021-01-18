import Phaser from 'phaser'
import * as Colors from '../consts/Color'
import { Direction } from '../consts/Direction'
import {
  boxColorToTargetColor,
  targetColorToBoxColor,
} from '../utils/ColorUtils'
import { baseTweenForDirection } from '../utils/TweenUtils'
import { offsetForDirection } from '../utils/TileUtils'

import isAllTargetsCovered from '../targets/isAllTargetsCovered'
import { sharedInstance as levels } from '../levels/LevelsService'

export default class Game extends Phaser.Scene {
  private player?: Phaser.GameObjects.Sprite
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private layer?: Phaser.Tilemaps.TilemapLayer
  private movesCountLabel?: Phaser.GameObjects.Text

  private targetsCoveredByColor: { [key: number]: number } = {}
  private boxesByColor: { [key: number]: Phaser.GameObjects.Sprite[] } = {}

  private movesCount = 0
  private currentLevel = 1

  constructor() {
    super('game')
  }

  init() {
    this.movesCount = 0
  }

  preload(): void {
    this.load.spritesheet('tiles', 'assets/sokoban_tilesheet.png', {
      frameWidth: 64,
      startFrame: 0,
    })
    this.cursors = this.input.keyboard.createCursorKeys()
  }

  create(d: { level: number }): void {
    const data = Object.assign({ level: 1 }, d)
    const level = levels.getLevel(data.level)
    this.currentLevel = data.level

    const map = this.make.tilemap({
      data: level,
      tileWidth: 64,
      tileHeight: 64,
    })
    const tiles = map.addTilesetImage('tiles')
    this.layer = map.createLayer(0, tiles, 0, 0)

    this.player = this.layer
      .createFromTiles(52, 0, { key: 'tiles', frame: 52 })
      .pop()
    this.player?.setOrigin(0)
    this.createPlayerAnims()
    this.extractBoxes(this.layer)
    this.movesCountLabel = this.add.text(540, 10, `Moves: ${this.movesCount}`, {
      fontFamily: 'Poppins',
    })
  }

  private getBoxDataAt(x: number, y: number) {
    const keys = Object.keys(this.boxesByColor)
    for (let i = 0; i < keys.length; i++) {
      const color = keys[i]
      const box = this.boxesByColor[color].find((box) => {
        const rect = box.getBounds()
        return rect.contains(x, y)
      })

      if (box) {
        return {
          box,
          color: parseInt(color),
        }
      }
    }
    return undefined
  }

  update(): void {
    if (!this.cursors || !this.player) {
      return
    }

    const justLeft = Phaser.Input.Keyboard.JustDown(this.cursors.left)
    const justRight = Phaser.Input.Keyboard.JustDown(this.cursors.right)
    const justDown = Phaser.Input.Keyboard.JustDown(this.cursors.down)
    const justUp = Phaser.Input.Keyboard.JustDown(this.cursors.up)
    const justSpace = Phaser.Input.Keyboard.JustDown(this.cursors.space)

    if (justLeft) {
      this.tweenMove(Direction.Left, () => {
        this.player?.anims.play('left', true)
      })
    } else if (justRight) {
      this.tweenMove(Direction.Right, () => {
        this.player?.anims.play('right', true)
      })
    } else if (justUp) {
      this.tweenMove(Direction.Up, () => {
        this.player?.anims.play('up', true)
      })
    } else if (justDown) {
      this.tweenMove(Direction.Down, () => {
        this.player?.anims.play('down', true)
      })
    } else if (justSpace) {
      this.scene.start('game', { level: this.currentLevel })
    }
  }

  private extractBoxes(layer: Phaser.Tilemaps.TilemapLayer) {
    const boxColors = [
      Colors.BoxOrange,
      Colors.BoxRed,
      Colors.BoxBlue,
      Colors.BoxGreen,
      Colors.BoxGrey,
    ]

    boxColors.forEach((color) => {
      this.boxesByColor[color] = layer
        .createFromTiles(color, 0, { key: 'tiles', frame: color })
        .map((box) => box.setOrigin(0))
      if (this.boxesByColor[color].length > 0) {
        const targetColor = boxColorToTargetColor(color)
        this.targetsCoveredByColor[targetColor] = 0
      }
    })
  }

  private hasWallAt(x: number, y: number) {
    if (!this.layer) {
      return false
    }
    const tile = this.layer.getTileAtWorldXY(x, y)
    if (!tile) {
      return false
    }
    return tile.index === 100
  }

  private tweenMove(direction: Direction, onStart: () => void) {
    const baseTween = baseTweenForDirection(direction)
    if (this.tweens.isTweening(this.player!)) {
      return
    }
    const nextOffset = offsetForDirection(direction)

    const nextX = this.player!.x + nextOffset.x
    const nextY = this.player!.y + nextOffset.y

    const hasWall = this.hasWallAt(nextX, nextY)
    if (hasWall) {
      this.sound.play('error')
      return
    }
    // the box at the nextX and nextY (if it exists) is the next box we are pushing
    const boxData = this.getBoxDataAt(nextX, nextY)
    if (boxData) {
      const { box, color } = boxData

      // Get the next square in front of the box we are pushing
      const nextBoxX = box.x + nextOffset.x
      const nextBoxY = box.y + nextOffset.y
      const nextBoxData = this.getBoxDataAt(nextBoxX, nextBoxY)

      if (nextBoxData || this.hasWallAt(nextBoxX, nextBoxY)) {
        this.sound.play('error')
        return
      }

      const targetColor = boxColorToTargetColor(color)
      const coveredTarget = this.hasTargetAt(box.x, box.y, targetColor)
      if (coveredTarget) {
        this.changeTargetCoveredCountForColor(targetColor, -1)
      }

      this.sound.play('move')

      this.tweens.add({
        targets: box,
        onComplete: () => {
          const coveredTarget = this.hasTargetAt(box.x, box.y, targetColor)
          if (coveredTarget) {
            this.changeTargetCoveredCountForColor(targetColor, 1)
          }
        },
        ...baseTween,
      })
    }
    this.tweens.add({
      targets: this.player,
      onComplete: () => {
        this.handlePlayerStopped()
      },
      onStart,
      ...baseTween,
    })
  }

  private handlePlayerStopped() {
    this.movesCount++
    this.stopPlayerAnimation()
    this.updateMovesCount()
    const levelFinished = isAllTargetsCovered(
      this.targetsCoveredByColor,
      this.boxesByColor
    )
    if (levelFinished) {
      this.scene.start('level-finished', {
        moves: this.movesCount,
        currentLevel: this.currentLevel,
      })
    }
  }

  private hasTargetAt(x: number, y: number, tileIndex: number) {
    if (!this.layer) {
      return false
    }
    const tile = this.layer.getTileAtWorldXY(x, y)
    if (!tile) {
      return false
    }
    return tile.index === tileIndex
  }

  private updateMovesCount() {
    if (!this.movesCountLabel) {
      return
    }
    this.movesCountLabel.text = `Moves: ${this.movesCount}`
  }

  private stopPlayerAnimation() {
    if (!this.player) {
      return
    }
    const key = this.player?.anims.currentAnim?.key
    if (key?.split('-').length === 1) {
      this.player?.anims.play(`idle-${key}`, true)
    }
  }

  private changeTargetCoveredCountForColor(color: number, change: number) {
    if (!(color in this.targetsCoveredByColor)) {
      this.targetsCoveredByColor[color] = 0
    }
    this.targetsCoveredByColor[color] += change
    if (change > 0) {
      this.sound.play('confirmation')
    }
  }

  private createPlayerAnims() {
    this.anims.create({
      key: 'idle-down',
      frames: [{ key: 'tiles', frame: 52 }],
    })

    this.anims.create({
      key: 'idle-left',
      frames: [{ key: 'tiles', frame: 81 }],
    })

    this.anims.create({
      key: 'idle-right',
      frames: [{ key: 'tiles', frame: 78 }],
    })

    this.anims.create({
      key: 'idle-up',
      frames: [{ key: 'tiles', frame: 55 }],
    })

    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('tiles', { start: 81, end: 83 }),
      frameRate: 10,
      repeat: -1,
    })

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('tiles', { start: 78, end: 80 }),
      frameRate: 10,
      repeat: -1,
    })

    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('tiles', { start: 55, end: 57 }),
      frameRate: 10,
      repeat: -1,
    })

    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('tiles', { start: 52, end: 54 }),
      frameRate: 10,
      repeat: -1,
    })
  }
}
