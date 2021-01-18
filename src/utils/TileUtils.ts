import { Direction } from '../consts/Direction'

export const offsetForDirection = (direction: Direction) => {
  switch (direction) {
    case Direction.Left:
      return {
        x: -32,
        y: 32,
      }
    case Direction.Right:
      return {
        x: 96,
        y: 32,
      }
    case Direction.Up:
      return {
        x: 32,
        y: -32,
      }
    case Direction.Down:
      return {
        x: 32,
        y: 96,
      }
    default:
      return { x: 0, y: 0 }
  }
}
