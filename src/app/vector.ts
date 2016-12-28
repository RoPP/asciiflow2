/**
 * Stores a 2D vector.
 */
export class Vector {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public equals(other: Vector): boolean {
    return (other != null) && (this.x == other.x) && (this.y == other.y);
  }

  public subtract(other: Vector): Vector {
    return new Vector(this.x - other.x, this.y - other.y);
  }

  public add(other: Vector): Vector {
    return new Vector(this.x + other.x, this.y + other.y);
  }

  public clone(): Vector {
    return new Vector(this.x, this.y);
  }


  public length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public scale(scale: number): Vector {
    return new Vector(this.x * scale, this.y * scale);
  }
};
