import { shapes, getShapeFast, isFive, isFour, getAllShapesOfPoint } from './shape.ts';
import { coordinate2Position, isLine, isAllInLine, hasInLine, position2Coordinate } from './position.ts';
import { config } from './config.ts';

export const FIVE = 10000000;
export const BLOCK_FIVE = FIVE;
export const FOUR = 100000;
export const FOUR_FOUR = FOUR; // 双冲四
export const FOUR_THREE = FOUR; // 冲四活三
export const THREE_THREE = FOUR / 2; // 双三
export const BLOCK_FOUR = 1500;
export const THREE = 1000;
export const BLOCK_THREE = 150;
export const TWO_TWO = 200; // 双活二
export const TWO = 100;
export const BLOCK_TWO = 15;
export const ONE = 10;
export const BLOCK_ONE = 1;

type Role = 1 | -1;
type Direction = [number, number];
type ShapeCache = { [role: number]: { [direction: number]: number[][] } };
type PointsCache = { [role: number]: { [shape: number]: Set<number> } };
type PointsMap = { [shape: number]: Set<number> };

// 形状转换分数，注意这里的分数是当前位置还没有落子的分数
export const getRealShapeScore = (shape: number): number => {
  switch (shape) {
    case shapes.FIVE:
      return FOUR;
    case shapes.BLOCK_FIVE:
      return BLOCK_FOUR;
    case shapes.FOUR:
      return THREE;
    case shapes.FOUR_FOUR:
      return THREE;
    case shapes.FOUR_THREE:
      return THREE;
    case shapes.BLOCK_FOUR:
      return BLOCK_THREE;
    case shapes.THREE:
      return TWO;
    case shapes.THREE_THREE:
      return THREE_THREE / 10;
    case shapes.BLOCK_THREE:
      return BLOCK_TWO;
    case shapes.TWO:
      return ONE;
    case shapes.TWO_TWO:
      return TWO_TWO / 10;
    default:
      return 0;
  }
}

const allDirections: Direction[] = [
  [0, 1],  // Horizontal
  [1, 0],  // Vertical
  [1, 1],  // Diagonal \
  [1, -1]  // Diagonal /
];

const direction2index = (ox: number, oy: number): number => {
  if (ox === 0) return 0; // |
  if (oy === 0) return 1; // -
  if (ox === oy) return 2; // \
  return 3; // /
};

export const performance = {
  updateTime: 0,
  getPointsTime: 0,
}

export default class Evaluate {
  private size: number;
  private board: number[][];
  private blackScores: number[][];
  private whiteScores: number[][];
  private shapeCache!: ShapeCache;
  private pointsCache!: PointsCache;
  private history: [number, Role][];

  constructor(size = 15) {
    this.size = size;
    this.board = Array.from({ length: size + 2 }).map((_, i) =>
      Array.from({ length: size + 2 }).map((_, j) =>
        (i === 0 || j === 0 || i === size + 1 || j === size + 1) ? 2 : 0
      )
    );
    this.blackScores = Array.from({ length: size }).map(() => Array.from({ length: size }).fill(0) as number[]);
    this.whiteScores = Array.from({ length: size }).map(() => Array.from({ length: size }).fill(0) as number[]);
    this.initPoints();
    this.history = []; // 记录历史 [position, role]
  }

  move(x: number, y: number, role: Role): void {
    // 清空记录
    for (const d of [0, 1, 2, 3]) {
      this.shapeCache[role][d][x][y] = 0;
      this.shapeCache[-role][d][x][y] = 0;
    }
    this.blackScores[x][y] = 0;
    this.whiteScores[x][y] = 0;

    // 更新分数
    this.board[x + 1][y + 1] = role; // Adjust for the added wall
    this.updatePoint(x, y);
    this.history.push([coordinate2Position(x, y, this.size), role]);
  }

  undo(x: number, y: number): void {
    this.board[x + 1][y + 1] = 0; // Adjust for the added wall
    this.updatePoint(x, y);
    this.history.pop();
  }

  private initPoints(): void {
    // 缓存每个点位的分数，避免重复计算
    // 结构： [role][direction][x][y] = shape
    this.shapeCache = {};
    for (let role of [1, -1]) {
      this.shapeCache[role] = {};
      for (let direction of [0, 1, 2, 3]) {
        this.shapeCache[role][direction] = Array.from({ length: this.size }).map(() => Array.from({ length: this.size }).fill(shapes.NONE) as number[]);
      }
    }
    // 缓存每个形状对应的点位
    // 结构： pointsCache[role][shape] = Set(direction1, direction2);
    this.pointsCache = {}
    for (let role of [1, -1]) {
      this.pointsCache[role] = {};
          for (let key of Object.keys(shapes)) {
      const shape = shapes[key as keyof typeof shapes];
      this.pointsCache[role][shape] = new Set();
    }
    }
  }

  // 只返回和最后几步在一条直线上的点位。
  getPointsInLine(role: Role): PointsMap | false {
    let pointsInLine: PointsMap = {}; // 在一条线上的点位
    let hasPointsInLine = false;
    Object.keys(shapes).forEach((key) => {
      pointsInLine[shapes[key as keyof typeof shapes]] = new Set();
    });
    let last2Points = this.history.slice(-config.inlineCount).map(([position, role]) => position);
    const processed: { [position: number]: number } = {}; // 已经处理过的点位
    // 在last2Points中查找是否有点位在一条线上
    for (let r of [role, -role]) {
      for (let point of last2Points) {
        const [x, y] = position2Coordinate(point, this.size);
        for (let [ox, oy] of allDirections) {
          for (let sign of [1, -1]) { // -1 for negative direction, 1 for positive direction
            for (let step = 1; step <= config.inLineDistance; step++) {
              const [nx, ny] = [x + sign * step * ox, y + sign * step * oy]; // +1 to adjust for wall
              const position = coordinate2Position(nx, ny, this.size);

              // 检测是否到达边界
              if (nx < 0 || nx >= this.size || ny < 0 || ny >= this.size) {
                break;
              }
              if (this.board[nx + 1][ny + 1] !== 0) {
                continue;
              }
              if (processed[position] === r) continue;
              processed[position] = r;
              for (let direction of [0, 1, 2, 3]) {
                const shape = this.shapeCache[r][direction][nx][ny];
                // 到达边界停止，但是注意到达对方棋子不能停止
                if (shape) {
                  pointsInLine[shape].add(coordinate2Position(nx, ny, this.size));
                  hasPointsInLine = true;
                }
              }
            }
          }
        }
      }
    }
    if (hasPointsInLine) {
      return pointsInLine;
    }
    return false;
  }

  getPoints(role: Role, depth: number, vct?: boolean, vcf?: boolean): PointsMap {
    const first = depth % 2 === 0 ? role : -role; // 先手
    const start = new Date();
    if (config.onlyInLine && this.history.length >= config.inlineCount) {
      const pointsInLine = this.getPointsInLine(role);
      if (pointsInLine) {
        performance.getPointsTime += Number(new Date()) - Number(start);
        return pointsInLine;
      }
    }

    let points: PointsMap = {};
    Object.keys(shapes).forEach((key) => {
      points[shapes[key as keyof typeof shapes]] = new Set();
    });

    const lastPoints = this.history.slice(-4).map(([position, role]) => position);

    for (let r of [role, -role]) {
      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          let fourCount = 0, blockFourCount = 0, threeCount = 0;
          for (let direction of [0, 1, 2, 3]) {
            if (this.board[i + 1][j + 1] !== 0) continue;
            const shape = this.shapeCache[r][direction][i][j];
            if (!shape) continue;
            if (vcf) {
              if (r === first && !isFour(shape) && !isFive(shape)) continue;
              if (r === -first && isFive(shape)) continue
            }
            const point = i * this.size + j;
            if (vct) {
              if (depth % 2 === 0) {
                if (depth === 0 && r !== first) continue;
                if (shape !== shapes.THREE && !isFour(shape) && !isFive(shape)) continue;
                if (shape === shapes.THREE && r !== first) continue;
                if (depth === 0 && r !== first) continue;
                if (depth > 0) {
                  if (shape === shapes.THREE && getAllShapesOfPoint(this.shapeCache, i, j, r as Role).length === 1) continue;
                  if (shape === shapes.BLOCK_FOUR && getAllShapesOfPoint(this.shapeCache, i, j, r as Role).length === 1) continue;
                }
              }
              else {
                if (shape !== shapes.THREE && !isFour(shape) && !isFive(shape)) continue;
                if (shape === shapes.THREE && r === -first) continue;
                if (depth > 1) {
                  if (shape === shapes.BLOCK_FOUR && getAllShapesOfPoint(this.shapeCache, i, j).length === 1) continue;
                  if (shape === shapes.BLOCK_FOUR && !hasInLine(point, lastPoints, this.size)) continue;
                }
              }
            }
            if (vcf) {
              if (!isFour(shape) && !isFive(shape)) continue;
            }
            if (depth > 2 && (shape === shapes.TWO || shape === shapes.TWO_TWO || shape === shapes.BLOCK_THREE) && !hasInLine(point, lastPoints, this.size)) continue;
            points[shape].add(point);
            if (shape === shapes.FOUR) fourCount++;
            else if (shape === shapes.BLOCK_FOUR) blockFourCount++;
            else if (shape === shapes.THREE) threeCount++;
            let unionShape = undefined;
            if (fourCount >= 2) {
              unionShape = shapes.FOUR_FOUR;
            } else if (blockFourCount && threeCount) {
              unionShape = shapes.FOUR_THREE;
            } else if (threeCount >= 2) {
              unionShape = shapes.THREE_THREE;
            }
            if (unionShape) {
              points[unionShape].add(point);
            }
          }
        }
      }
    }

    performance.getPointsTime += Number(new Date()) - Number(start);

    return points;
  }

  updatePoint(x: number, y: number): void {
    const start = new Date();
    this.updateSinglePoint(x, y, 1);
    this.updateSinglePoint(x, y, -1);

    for (let [ox, oy] of allDirections) {
      for (let sign of [1, -1]) {
        for (let step = 1; step <= 5; step++) {
          let reachEdge = false;
          for (let role of [1, -1] as Role[]) {
            const [nx, ny] = [x + sign * step * ox + 1, y + sign * step * oy + 1];
            if (this.board[nx][ny] === 2) {
              reachEdge = true;
              break;
            } else if (this.board[nx][ny] === -role) {
              continue;
            } else if (this.board[nx][ny] === 0) {
              this.updateSinglePoint(nx - 1, ny - 1, role, [sign * ox, sign * oy]);
            }
          }
          if (reachEdge) break;
        }
      }
    }
    performance.updateTime += Number(new Date()) - Number(start);
  }

  updateSinglePoint(x: number, y: number, role: Role, direction: Direction | undefined = undefined): number | undefined {
    if (this.board[x + 1][y + 1] !== 0) return;

    this.board[x + 1][y + 1] = role;

    let directions: Direction[] = [];
    if (direction) {
      directions.push(direction);
    } else {
      directions = allDirections;
    }
    const shapeCache = this.shapeCache[role];

    for (let [ox, oy] of directions) {
      shapeCache[direction2index(ox, oy)][x][y] = shapes.NONE;
    }

    let score = 0;
    let blockfourCount = 0;
    let threeCount = 0;
    let twoCount = 0;
    for (let intDirection of [0, 1, 2, 3]) {
      const shape = shapeCache[intDirection][x][y];
      if (shape > shapes.NONE) {
        score += getRealShapeScore(shape);
        if (shape === shapes.BLOCK_FOUR) blockfourCount += 1;
        if (shape === shapes.THREE) threeCount += 1;
        if (shape === shapes.TWO) twoCount += 1;
      }
    }
    for (let [ox, oy] of directions) {
      const intDirection = direction2index(ox, oy);
      let [shape, selfCount] = getShapeFast(this.board, x, y, ox, oy, role);
      if (!shape) continue;
      if (shape) {
        shapeCache[intDirection][x][y] = shape;
        if (shape === shapes.BLOCK_FOUR) blockfourCount += 1;
        if (shape === shapes.THREE) threeCount += 1;
        if (shape === shapes.TWO) twoCount += 1;
        if (blockfourCount >= 2) {
          shape = shapes.FOUR_FOUR;
        } else if (blockfourCount && threeCount) {
          shape = shapes.FOUR_THREE;
        } else if (threeCount >= 2) {
          shape = shapes.THREE_THREE;
        } else if (twoCount >= 2) {
          shape = shapes.TWO_TWO;
        }
        score += getRealShapeScore(shape);
      }
    }

    this.board[x + 1][y + 1] = 0;

    if (role === 1) {
      this.blackScores[x][y] = score;
    } else {
      this.whiteScores[x][y] = score;
    }

    return score;
  }

  evaluate(role: Role): number {
    let blackScore = 0;
    let whiteScore = 0;
    for (let i = 0; i < this.blackScores.length; i++) {
      for (let j = 0; j < this.blackScores[i].length; j++) {
        blackScore += this.blackScores[i][j];
      }
    }
    for (let i = 0; i < this.whiteScores.length; i++) {
      for (let j = 0; j < this.whiteScores[i].length; j++) {
        whiteScore += this.whiteScores[i][j];
      }
    }
    const score = role == 1 ? blackScore - whiteScore : whiteScore - blackScore;
    return score;
  }

  getMoves(role: Role, depth: number, onThree = false, onlyFour = false): [number, number][] {
    const moves = Array.from(this._getMoves(role, depth, onThree, onlyFour)).map((move) => [Math.floor(move / this.size), move % this.size] as [number, number]);
    return moves;
  }

  private _getMoves(role: Role, depth: number, onlyThree = false, onlyFour = false): Set<number> {
    const points = this.getPoints(role, depth, onlyThree, onlyFour);
    const fives = points[shapes.FIVE];
    const blockFives = points[shapes.BLOCK_FIVE];
    if (fives?.size || blockFives?.size) return new Set([...fives, ...blockFives]);
    const fours = points[shapes.FOUR];
    const blockfours = points[shapes.BLOCK_FOUR];
    if (onlyFour || fours?.size) {
      return new Set([...fours, ...blockfours]);
    }
    const four_fours = points[shapes.FOUR_FOUR];
    if (four_fours.size) return new Set([...four_fours, ...blockfours]);
    const threes = points[shapes.THREE];
    const four_threes = points[shapes.FOUR_THREE];
    if (four_threes?.size) return new Set([...four_threes, ...blockfours, ...threes]);
    const three_threes = points[shapes.THREE_THREE];
    if (three_threes?.size) return new Set([...three_threes, ...blockfours, ...threes]);
    if (onlyThree) return new Set([...blockfours, ...threes]);
    const blockthrees = points[shapes.BLOCK_THREE];
    const two_twos = points[shapes.TWO_TWO];
    const twos = points[shapes.TWO];
    const res = new Set([...blockfours, ...threes, ...blockthrees, ...two_twos, ...twos].slice(0, config.pointsLimit));
    return res;
  }

  display(): void {
    let result = '';
    for (let i = 1; i < this.size + 1; i++) {
      for (let j = 1; j < this.size + 1; j++) {
        switch (this.board[i][j]) {
          case 1:
            result += 'O ';
            break;
          case -1:
            result += 'X ';
            break;
          default:
            result += '- ';
            break;
        }
      }
      result += '\n';
    }
    console.log(result);
  }
}