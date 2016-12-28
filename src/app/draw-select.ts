import * as C from './constants';
import { Box } from './box';
import { DrawFunctionInterface, DrawErase } from './draw';
import { MappedValue } from './mapped-value';
import { State } from './state';
import { Vector } from './vector';

/**
 * @constructor
 * @implements {DrawFunction}
 * @param {State} state
 */
export class DrawSelect implements DrawFunctionInterface {
  state: State;
  startPosition: Vector = null;
  endPosition: Vector = null;
  dragStart: Vector = null;
  dragEnd: Vector = null;
  finished: boolean = true;
  selectedCells: MappedValue[] = null;

  constructor(state: State) {
    this.state = state;
  };

  public start(position: Vector) {
    // Must be dragging.
    if (this.startPosition != null &&
        this.endPosition != null &&
        this.getSelectedBox().contains(position)) {
      this.dragStart = position;
      this.copyArea();
      this.dragMove(position);
    } else {
      this.startPosition = position;
      this.endPosition = null;
      this.finished = false;
      this.move(position);
    }
  };

  public getSelectedBox(): Box {
    return new Box(this.startPosition, this.endPosition);
  };

  public copyArea() {
    var nonEmptyCells = this.state.scratchCells.filter(function(value) {
      var rawValue = value.cell.getRawValue();
      return value.cell.getRawValue() != null && value.cell.getRawValue() != C.ERASE_CHAR;
    });
    var topLeft = this.getSelectedBox().topLeft();
    this.selectedCells = nonEmptyCells.map(function(value) {
      return new MappedValue(value.position.subtract(topLeft), value.cell.getRawValue());
    });
  };

  public move(position: Vector) {
    if (this.dragStart != null) {
      this.dragMove(position);
      return;
    }

    if (this.finished == true) {
      return;
    }
    this.endPosition = position;
    this.state.clearDraw();

    var box = new Box(this.startPosition, position);

    for (var i = box.startX; i <= box.endX; i++) {
      for (var j = box.startY; j <= box.endY; j++) {
        var current = new Vector(i, j);
        // Effectively highlights the cell.
        var currentValue = this.state.getCell(current).getRawValue();
        this.state.drawValue(current,
            currentValue == null ? C.ERASE_CHAR : currentValue);
      }
    }
  };

  public dragMove(position: Vector) {
    this.dragEnd = position;
    this.state.clearDraw();
    var eraser = new DrawErase(this.state);
    eraser.start(this.startPosition);
    eraser.move(this.endPosition);
    var startPos = this.dragEnd.subtract(this.dragStart).add(this.getSelectedBox().topLeft());
    this.drawSelected(startPos);
  };

  public drawSelected(startPos: Vector) {
  for (var i in this.selectedCells) {
      this.state.drawValue(this.selectedCells[i].position.add(startPos), this.selectedCells[i].value);
    }
  };

  public end() {
    if (this.dragStart != null) {
      this.state.commitDraw();
      this.startPosition = null;
      this.endPosition = null;
    }
    this.dragStart = null;
    this.dragEnd = null;
    this.finished = true;
  };

  public getCursor(position: Vector) {
    if (this.startPosition != null &&
        this.endPosition != null &&
        new Box(this.startPosition, this.endPosition).contains(position)) {
      return 'pointer';
    }
    return 'default';
  };

  public handleKey(value: string) {
    if (this.startPosition != null &&
        this.endPosition != null) {
      if (value == C.KEY_COPY || value == C.KEY_CUT) {
        this.copyArea();
      }
      if (value == C.KEY_CUT) {
        var eraser = new DrawErase(this.state);
        eraser.start(this.startPosition);
        eraser.move(this.endPosition);
        this.state.commitDraw();
      }
    }
    if (value == C.KEY_PASTE) {
      this.drawSelected(this.startPosition);
      this.state.commitDraw();
    }
  };
};
