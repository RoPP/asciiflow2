import { ALL_SPECIAL_VALUES, ERASE_CHAR } from './constants';

/**
 * An individual cell within the diagram and it's current value.
 *
 * @constructor
 */
export class Cell {
  value: string;
  scratchValue: string;

  constructor() {
    this.value = null;
    this.scratchValue = null;
  }

  public getRawValue(): string {
    return (this.scratchValue != null ? this.scratchValue : this.value);
  }

  public isSpecial(): boolean {
    return ALL_SPECIAL_VALUES.indexOf(this.getRawValue()) != -1;
  }

  public isEmpty(): boolean {
    return this.value == null && this.scratchValue == null;
  }

  public hasScratch(): boolean {
    return this.scratchValue != null;
  }

  public isErase(): boolean {
    return this.scratchValue == ERASE_CHAR;
  }
};
