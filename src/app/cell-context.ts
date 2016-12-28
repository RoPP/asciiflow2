/**
 * The context for a cell, i.e. the status of the cells around it.
 */
export class CellContext {
  left: boolean = false;
  right: boolean = false;
  up: boolean = false;
  down: boolean = false;
  leftup: boolean = false;
  rightup: boolean = false;
  leftdown: boolean = false;
  rightdown: boolean = false;

  constructor(left: boolean, right: boolean, up: boolean, down: boolean) {
    this.left = left;
    this.right = right;
    this.up = up;
    this.down = down;
  }

  /**
   * Returns the total number of surrounding special cells.
   */
  public sum(): number {
    let res = 0;
    for (let dir of [this.left, this.right, this.up, this.down]) {
      if (dir) res++
    }
    return res;
  }

  /**
   * Returns the total number of surrounding special cells.
   */
  public extendedSum(): number {
    let res = 0;
    for (let dir of [this.left, this.right, this.up, this.down, this.leftup, this.leftdown, this.rightup, this.rightdown]) {
      if (dir) res++
    }
    return res;
  }
};
