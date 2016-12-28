import { Vector } from './vector';
import { Cell } from './cell';

/**
 * A pair of a vector and a cell. Used in history management.
 */
export class MappedCell {
  position: Vector;
  cell: Cell;

  constructor(position: Vector, cell: Cell) {
    this.position = position;
    this.cell = cell;
  }
};
