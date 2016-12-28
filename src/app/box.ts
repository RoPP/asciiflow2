import { Vector } from './vector';

/**
 * Represents a box with normalized position vectors.
 */
export class Box {
  startX: number;
  startY: number;
  endX: number;
  endY: number;

  constructor(a: Vector, b: Vector) {
    this.startX = Math.min(a.x, b.x);
    this.startY = Math.min(a.y, b.y);
    this.endX = Math.max(a.x, b.x);
    this.endY = Math.max(a.y, b.y);
  }

  public topLeft(): Vector {
    return new Vector(this.startX, this.startY);
  };

  public bottomRight(): Vector {
    return new Vector(this.endX, this.endY);
  };

  public contains(position: Vector): boolean {
    return position.x >= this.startX && position.x <= this.endX && position.y >= this.startY && position.y <= this.endY;
  };
};
