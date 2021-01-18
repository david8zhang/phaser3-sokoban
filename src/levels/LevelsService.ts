import level1 from './level1'
import level2 from './level2'
import level3 from './level3'

class LevelsService {
  private levels = [level1, level2, level3]

  get levelsCount() {
    return this.levels.length
  }
  getLevel(level: number) {
    return this.levels[level - 1]
  }
}

const sharedInstance = new LevelsService()
export { sharedInstance }
