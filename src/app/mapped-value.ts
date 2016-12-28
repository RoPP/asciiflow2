import { Vector } from './vector';

/**
 * A pair of a vector and a string value. Used in history management.
 */
export class MappedValue {
  position: Vector;
  value: string|null;

  constructor (position: Vector, value: string|null) {
    this.position = position;
    this.value = value;
  }
};
