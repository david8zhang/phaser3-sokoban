import { Direction } from '../consts/Direction'

interface BaseTween {
  x?: number | string
  y?: number | string
  duration?: number
}

export const baseTweenForDirection = (direction: Direction) => {
  const baseTween: BaseTween = {
    duration: 350,
  }
  switch (direction) {
    case Direction.Down: {
      baseTween.y = '+=64'
      break
    }
    case Direction.Up: {
      baseTween.y = '-=64'
      break
    }
    case Direction.Left: {
      baseTween.x = '-=64'
      break
    }
    case Direction.Right: {
      baseTween.x = '+=64'
      break
    }
  }
  return baseTween
}
