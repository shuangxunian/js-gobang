/* global BigInt */
type Role = 1 | -1;
type ZobristTable = { [role: string]: bigint }[][];

export default class ZobristCache {
  private size: number;
  private zobristTable: ZobristTable;
  private hash: bigint;

  constructor(size: number) {
    this.size = size;
    this.zobristTable = this.initializeZobristTable(size);
    this.hash = BigInt(0);
  }

  private initializeZobristTable(size: number): ZobristTable {
    let table: ZobristTable = [];
    for (let i = 0; i < size; i++) {
      table[i] = [];
      for (let j = 0; j < size; j++) {
        table[i][j] = {
          "1": BigInt(this.randomBitString(64)), // black
          "-1": BigInt(this.randomBitString(64))  // white
        };
      }
    }
    return table;
  }

  private randomBitString(length: number): string {
    let str = "0b";
    for (let i = 0; i < length; i++) {
      str += Math.round(Math.random()).toString();
    }
    return str;
  }

  togglePiece(x: number, y: number, role: Role): void {
    this.hash ^= this.zobristTable[x][y][role.toString()];
  }

  getHash(): bigint {
    return this.hash;
  }
}