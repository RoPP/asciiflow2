import * as C from './constants';
import { Box } from './box';
import { Cell } from './cell';
import { CellContext } from './cell-context';
import { MappedCell } from './mapped-cell';
import { MappedValue } from './mapped-value';
import { Vector } from './vector';

/**
 * Holds the entire state of the diagram as a 2D array of cells
 * and provides methods to modify the current state.
 */
export class State {
  cells: Cell[][] = new Array(C.MAX_GRID_WIDTH);
  scratchCells: MappedCell[] = new Array();
  dirty: boolean = true;
  undoStates: MappedValue[][] = new Array();
  redoStates: MappedValue[][] = new Array();

  constructor() {
    for (var i = 0; i < this.cells.length; i++) {
      this.cells[i] = new Array(C.MAX_GRID_HEIGHT);
      for (var j = 0; j < this.cells[i].length; j++) {
        this.cells[i][j] = new Cell();
      }
    }
  }

  /**
   * This clears the entire state, but is undoable.
   */
  public clear() {
    for (var i = 0; i < this.cells.length; i++) {
      for (var j = 0; j < this.cells[i].length; j++) {
        var position = new Vector(i, j);
        if (this.cells[i][j].getRawValue() != null) {
          this.drawValue(new Vector(i, j), C.ERASE_CHAR);
        }
      }
    }
    this.commitDraw();
  };

  /**
   * Returns the cell at the given coordinates.
   */
  public getCell(vector: Vector): Cell {
    return this.cells[vector.x][vector.y];
  };

  /**
   * Sets the cells scratch (uncommitted) value at the given position.
   */
  public drawValue(position: Vector, value: string) {
    var cell = this.getCell(position);
    this.scratchCells.push(new MappedCell(position, cell));
    cell.scratchValue = value;
    this.dirty = true;
  };

  /**
   * Sets the cells scratch (uncommitted) value at the given position
   * iff the value is different to what it already is.
   */
  public drawValueIncremental(position: Vector, value: string) {
    if (this.getCell(position).getRawValue() != value) {
      this.drawValue(position, value);
    }
  };

  /**
   * Clears the current drawing scratchpad.
   */
  public clearDraw() {
    for (var i in this.scratchCells) {
      this.scratchCells[i].cell.scratchValue = null;
    }
    this.scratchCells.length = 0;
  };

  /**
   * Returns the draw value of a cell at the given position.
   */
  public getDrawValue(position: Vector): string {
    var cell = this.getCell(position);
    var value = cell.scratchValue != null ? cell.scratchValue : cell.value;
    var isSpecial = C.SPECIAL_VALUES.indexOf(value) != -1;
    var isAltSpecial = C.ALT_SPECIAL_VALUES.indexOf(value) != -1;
    if (!isSpecial && !isAltSpecial) {
      return value;
    }

    // Because the underlying state only stores actual cell values and there is
    // no underlying representation of shapes, we do a lot of crazy logic here
    // to make diagrams display as expected.
    var context = this.getContext(position);

    if (isSpecial && context.left && context.right && !context.up && !context.down) {
      return C.SPECIAL_LINE_H;
    }
    if (isSpecial && !context.left && !context.right && context.up && context.down) {
      return C.SPECIAL_LINE_V;
    }
    if (context.sum() == 4) {
      return C.SPECIAL_LINE_H;
    }
    if (isAltSpecial && context.sum() == 3) {
      if (!context.left) {
        return C.SPECIAL_ARROW_LEFT;
      }
      if (!context.up) {
        return C.SPECIAL_ARROW_UP;
      }
      if (!context.down) {
        return C.SPECIAL_ARROW_DOWN;
      }
      if (!context.right) {
        return C.SPECIAL_ARROW_RIGHT;
      }
    }
    if ((isSpecial || isAltSpecial) && context.sum() == 3) {
      this.extendContext(position, context);
      if (!context.right && context.leftup && context.leftdown) {
        return C.SPECIAL_LINE_V;
      }
      if (!context.left && context.rightup && context.rightdown) {
        return C.SPECIAL_LINE_V;
      }
      if (!context.down && context.leftup && context.rightup) {
        return C.SPECIAL_LINE_H;
      }
      if (!context.up && context.rightdown && context.leftdown) {
        return C.SPECIAL_LINE_H;
      }
      var leftupempty = this.getCell(position.add(C.DIR_LEFT).add(C.DIR_UP)).isEmpty();
      var rightupempty = this.getCell(position.add(C.DIR_RIGHT).add(C.DIR_UP)).isEmpty();
      if (context.up && context.left && context.right && (!leftupempty || !rightupempty)) {
        return C.SPECIAL_LINE_H;
      }
      var leftdownempty = this.getCell(position.add(C.DIR_LEFT).add(C.DIR_DOWN)).isEmpty();
      var rightdownempty = this.getCell(position.add(C.DIR_RIGHT).add(C.DIR_DOWN)).isEmpty();
      if (context.down && context.left && context.right && (!leftdownempty || !rightdownempty)) {
        return C.SPECIAL_LINE_H;
      }
      return C.SPECIAL_VALUE;
    }

    if (isAltSpecial && context.sum() == 1) {
      if (context.left) {
        return C.SPECIAL_ARROW_RIGHT;
      }
      if (context.up) {
        return C.SPECIAL_ARROW_DOWN;
      }
      if (context.down) {
        return C.SPECIAL_ARROW_UP;
      }
      if (context.right) {
        return C.SPECIAL_ARROW_LEFT;
      }
    }
    return value;
  };

  public getContext(position: Vector): CellContext {
    var left = this.getCell(position.add(C.DIR_LEFT)).isSpecial();
    var right = this.getCell(position.add(C.DIR_RIGHT)).isSpecial();
    var up = this.getCell(position.add(C.DIR_UP)).isSpecial();
    var down = this.getCell(position.add(C.DIR_DOWN)).isSpecial();
    return new CellContext(left, right, up, down);
  };

  public extendContext(position: Vector, context: CellContext) {
    context.leftup = this.getCell(position.add(C.DIR_LEFT).add(C.DIR_UP)).isSpecial();
    context.rightup = this.getCell(position.add(C.DIR_RIGHT).add(C.DIR_UP)).isSpecial();
    context.leftdown = this.getCell(position.add(C.DIR_LEFT).add(C.DIR_DOWN)).isSpecial();
    context.rightdown = this.getCell(position.add(C.DIR_RIGHT).add(C.DIR_DOWN)).isSpecial();
  };

  /**
   * Ends the current draw, commiting anything currently drawn the scratchpad.
   */
  public commitDraw(opt_undo?: boolean) {
    var oldValues = [];

    // Dedupe the scratch values, or this causes havoc for history management.
    var positions = this.scratchCells.map(function(value) {
      return value.position.x.toString() + value.position.y.toString();
    });
    var scratchCellsUnique =
        this.scratchCells.filter(function(value, index, arr) {
      return positions.indexOf(positions[index]) == index;
    });

    this.scratchCells.length = 0;

    for (var i in scratchCellsUnique) {
      var position = scratchCellsUnique[i].position;
      var cell = scratchCellsUnique[i].cell;

      // Push the effective old value unto the array.
      oldValues.push(new MappedValue(position,
          cell.value != null ? cell.value : ' '));

      var newValue = cell.getRawValue();
      if (newValue == C.ERASE_CHAR || newValue == ' ') {
        newValue = null;
      }
      // Let's store the actual drawed value, so behaviour matches what the user sees.
      if (cell.isSpecial()) {
        newValue = this.getDrawValue(position);
      }
      cell.scratchValue = null;
      cell.value = newValue;
    }

    var stateStack = opt_undo ? this.redoStates : this.undoStates;
    if (oldValues.length > 0) {
      // If we have too many states, clear one out.
      if (stateStack.length > C.MAX_UNDO) {
        stateStack.shift();
      }
      stateStack.push(oldValues);
    }
    this.dirty = true;
  };

  /**
   * Undoes the last committed state.
   */
  public undo() {
    if (this.undoStates.length == 0) { return; }

    var lastState = this.undoStates.pop();
    for (var i in lastState) {
      var mappedValue = lastState[i];
      this.drawValue(mappedValue.position, mappedValue.value);
    }
    this.commitDraw(true);
  };

  /**
   * Redoes the last undone.
   */
  public redo() {
    if (this.redoStates.length == 0) { return; }

    var lastState = this.redoStates.pop();
    for (var i in lastState) {
      var mappedValue = lastState[i];
      this.drawValue(mappedValue.position, mappedValue.value);
    }
    this.commitDraw();
  };

  /**
   * Outputs the entire contents of the diagram as text.
   */
  public outputText(opt_box?: Box): string {
    // Find the first/last cells in the diagram so we don't output everything.
    var start = new Vector(Number.MAX_VALUE, Number.MAX_VALUE);
    var end = new Vector(-1, -1);

    if (!opt_box) {
      for (var i = 0; i < this.cells.length; i++) {
        for (var j = 0; j < this.cells[i].length; j++) {
          if (this.cells[i][j].getRawValue() != null) {
            if (i < start.x) { start.x = i; }
            if (j < start.y) { start.y = j; }
            if (i > end.x) { end.x = i; }
            if (j > end.y) { end.y = j; }
          }
        }
      }
      if (end.x < 0) { return '' }
    } else {
      start = opt_box.topLeft();
      end = opt_box.bottomRight();
    }

    var output = '';
    for (var j = start.y; j <= end.y; j++) {
      var line = '';
      for (var i = start.x; i <= end.x; i++) {
        var val = this.getDrawValue(new Vector(i, j));
        line += (val == null || val == C.ERASE_CHAR) ? ' ' : val;
      }
      // Trim end whitespace.
      output += line.replace(/\s+$/, '') + '\n';
    }
    return output;
  };

  /**
   * Loads the given text into the diagram starting at the given offset (centered).
   * @param {string} value
   * @param {Vector} offset
   */
  public fromText(value, offset) {
    var lines = value.split('\n');
    var middle = new Vector(0, Math.round(lines.length / 2));
    for (var j = 0; j < lines.length; j++) {
      middle.x = Math.max(middle.x, Math.round(lines[j].length / 2));
    }
    for (var j = 0; j < lines.length; j++) {
      var line = lines[j];
      for (var i = 0; i < line.length; i++) {
        var char = line.charAt(i);
        // Convert special output back to special chars.
        // TODO: This is a horrible hack, need to handle multiple special chars
        // correctly and preserve them through line drawing etc.
        if (C.SPECIAL_VALUES.indexOf(char)  != -1) {
          char = C.SPECIAL_VALUE;
        }
        if (C.ALT_SPECIAL_VALUES.indexOf(char) != -1) {
          char = C.ALT_SPECIAL_VALUE;
        }
        this.drawValue(new Vector(i, j).add(offset).subtract(middle), char);
      }
    }
  };
};
