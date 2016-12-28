import * as $ from 'jquery';

import * as C from './constants';
import { Box } from './box';
import { State } from './state';
import { Vector } from './vector';

/**
 * All drawing classes and functions.
 */

/**
 * Draws a line on the diagram state.
 */
function drawLine(state: State, startPosition: Vector, endPosition: Vector, clockwise: boolean, opt_value?: string) {
  var value = opt_value || C.SPECIAL_VALUE;

  var box = new Box(startPosition, endPosition);
  var startX = box.startX;
  var startY = box.startY;
  var endX = box.endX;
  var endY = box.endY;

  var midX = clockwise ? endPosition.x : startPosition.x;
  var midY = clockwise ? startPosition.y : endPosition.y;

  while (startX++ < endX) {
    var position = new Vector(startX, midY);
    var context = state.getContext(new Vector(startX, midY));
    // Don't erase any lines that we cross.
    if (value != ' ' || !(context.up && context.down)) {
      state.drawValueIncremental(position, value);
    }
  }
  while (startY++ < endY) {
    var position = new Vector(midX, startY);
    var context = state.getContext(new Vector(midX, startY));
    // Don't erase any lines that we cross.
    if (value != ' ' || !(context.left && context.right)) {
      state.drawValueIncremental(position, value);
    }
  }

  state.drawValue(startPosition, value);
  state.drawValue(endPosition, value);
  state.drawValueIncremental(new Vector(midX, midY), value);
}

/**
 * Common interface for different drawing functions, e.g. box, line, etc.
 */
export interface DrawFunctionInterface {
  state: State;

  /** Start of drawing. */
  start(position: Vector);
  /** Drawing move. */
  move(position: Vector);
  /** End of drawing. */
  end();
  /** Cursor for given cell.
   */
  getCursor(position: Vector): string;
  /** Handle the key with given value being pressed. */
  handleKey(value: string);
};

export class DrawBox implements DrawFunctionInterface {
  state: State;
  startPosition: Vector = null;
  endPosition: Vector = null;

  constructor(state: State) {
    this.state = state;
  };

  start(position: Vector) {
    this.startPosition = position;
  };

  move(position: Vector) {
    this.endPosition = position;
    this.state.clearDraw();
    drawLine(this.state, this.startPosition, position, true);
    drawLine(this.state, this.startPosition, position, false);
  };

  end() {
    this.state.commitDraw(false);
  };

  getCursor(position: Vector) {
    return 'crosshair';
  };

  handleKey(value: string) {};
};

export class DrawLine implements DrawFunctionInterface {
  state: State;
  isArrow: boolean;
  startPosition: Vector = null;

  constructor(state: State, isArrow: boolean) {
    this.state = state;
    this.isArrow = isArrow;
    this.startPosition = null;
  };

  public start(position: Vector) {
    this.startPosition = position;
  };

  public move(position: Vector) {
    this.state.clearDraw();

    // Try to infer line orientation.
    // TODO: Split the line into two lines if we can't satisfy both ends.
    var startContext = this.state.getContext(this.startPosition);
    var endContext = this.state.getContext(position);
    var clockwise = (startContext.up && startContext.down) ||
        (endContext.left && endContext.right);

    drawLine(this.state, this.startPosition, position, clockwise);
    if (this.isArrow) {
      this.state.drawValue(position, C.ALT_SPECIAL_VALUE);
    }
  };

  public end() {
    this.state.commitDraw();
  };

  public getCursor(position: Vector) {
    return 'crosshair';
  };

  public handleKey(value) {};
}

/**
 * @constructor
 * @implements {ascii.DrawFunction}
 * @param {ascii.State} state
 * @param {?string} value
 */
export class DrawFreeform implements DrawFunctionInterface {
  state: State;
  value: string;

  constructor(state: State, value: string) {
    this.state = state;
    this.value = value;
    if (C.TOUCH_ENABLED) {
      $('#freeform-tool-input').val('');
      $('#freeform-tool-input').hide(0, function() {$('#freeform-tool-input').show(0, function() {$('#freeform-tool-input').focus();});});
    }
  };

  public start(position: Vector) {
    this.state.drawValue(position, this.value);
  };

  public move(position: Vector) {
    this.state.drawValue(position, this.value);
  };

  public end() {
    this.state.commitDraw();
  };

  public getCursor(position: Vector) {
    return 'crosshair';
  };

  public handleKey(value: string) {
    if (C.TOUCH_ENABLED) {
      this.value = $('#freeform-tool-input').val().substr(0, 1);
      $('#freeform-tool-input').blur();
      $('#freeform-tool-input').hide(0);
    }
    if (value.length == 1) {
      // The value is not a special character, so lets use it.
      this.value = value;
    }
  };
};

/**
 * @constructor
 * @implements {ascii.DrawFunction}
 * @param {ascii.State} state
 */
export class DrawText implements DrawFunctionInterface {
  state: State;
  startPosition: Vector = null;
  endPosition: Vector = null;

  constructor(state: State, view) {
    this.state = state;
  };

  public start(position: Vector) {
    this.state.commitDraw();
    $('#text-tool-input').val('');
    this.startPosition = position;

    // Not working yet, needs fixing so that it can remove the underlying text completely.
    //this.loadExistingText(position);

    // Effectively highlights the starting cell.
    var currentValue = this.state.getCell(this.startPosition).getRawValue();
    this.state.drawValue(this.startPosition,
        currentValue == null ? C.ERASE_CHAR : currentValue);
  };

  public move(position: Vector) {};

  public end() {
    if (this.startPosition != null) {
      this.endPosition = this.startPosition;
      this.startPosition = null;
      // Valid end click/press, show the textbox and focus it.
      $('#text-tool-widget').hide(0, function() {$('#text-tool-widget').show(0, function() {$('#text-tool-input').focus();});});
    }
  };

  public getCursor(position: Vector) {
    return 'pointer';
  };

  public handleKey(value: string) {
    var text = $('#text-tool-input').val();
    this.state.clearDraw();
    var x = 0, y = 0;
    for(var i = 0; i < text.length; i++) {
      if (text[i] == '\n') {
        y++;
        x = 0;
        continue;
      }
      this.state.drawValue(this.endPosition.add(new Vector(x, y)), text[i]);
      x++;
    }
  };

  /**
   * Loads any existing text if it is present.
   * TODO: This is horrible, and does not quite work, fix it.
   */
  public loadExistingText(position: Vector) {
    var currentPosition = new Vector(position.x, position.y);
    var cell = this.state.getCell(position);
    var spacesCount = 0;
    // Go back to find the start of the line.
    while ((!cell.isSpecial() && cell.getRawValue() != null) || spacesCount < 1) {
      if (cell.getRawValue() == null) {
        spacesCount++;
      } else if (!cell.isSpecial()) {
        spacesCount = 0;
      }
      currentPosition.x--;
      cell = this.state.getCell(currentPosition);
    }
    this.startPosition = currentPosition.add(new Vector(spacesCount + 1, 0));
    var text = '';
    spacesCount = 0;
    currentPosition = this.startPosition.clone();
    // Go forward to load the text.
    while ((!cell.isSpecial() && cell.getRawValue() != null) || spacesCount < 1) {
      cell = this.state.getCell(currentPosition);
      if (cell.getRawValue() == null) {
        spacesCount++;
        text += ' ';
      } else if (!cell.isSpecial()) {
        spacesCount = 0;
        text += cell.getRawValue();
        this.state.drawValue(currentPosition, cell.getRawValue());
      }
      currentPosition.x++;
    }
    $('#text-tool-input').val(text.substr(0, text.length - 1));
  };
};

/**
 * @constructor
 * @implements {ascii.DrawFunction}
 * @param {ascii.State} state
 */
export class DrawErase implements DrawFunctionInterface {
  state: State;
  startPosition: Vector = null;
  endPosition: Vector = null;

  constructor(state: State) {
    this.state = state;
  };

  public start(position: Vector) {
    this.startPosition = position;
    this.move(position);
  };

  public move(position: Vector) {
    this.state.clearDraw();
    this.endPosition = position;

    var startX = Math.min(this.startPosition.x, this.endPosition.x);
    var startY = Math.min(this.startPosition.y, this.endPosition.y);
    var endX = Math.max(this.startPosition.x, this.endPosition.x);
    var endY = Math.max(this.startPosition.y, this.endPosition.y);

    for (var i = startX; i <= endX; i++) {
      for (var j = startY; j <= endY; j++) {
        this.state.drawValue(new Vector(i, j), C.ERASE_CHAR);
      }
    }
  };

  public end() {
    this.state.commitDraw();
  };

  public getCursor(position: Vector) {
    return 'crosshair';
  };

  public handleKey(value: string) {};
};

export class DrawMove implements DrawFunctionInterface {
  state: State;
  startPosition: Vector = null;
  ends: Array<any>;

  constructor(state: State) {
    this.state = state;
  };

  public start(position: Vector) {
    this.startPosition =
        C.TOUCH_ENABLED ? this.snapToNearest(position) : position;
    this.ends = [];

    // If this isn't a special cell then quit, or things get weird.
    if (!this.state.getCell(this.startPosition).isSpecial()) {
      return;
    }
    var context = this.state.getContext(this.startPosition);

    var ends = [];
    for (var i in C.DIRECTIONS) {
      var midPoints = this.followLine(this.startPosition, C.DIRECTIONS[i]);
      for (var k in midPoints) {
        var midPoint = midPoints[k];

        // Clockwise is a lie, it is true if we move vertically first.
        var clockwise = (C.DIRECTIONS[i].x != 0);
        var startIsAlt = C.ALT_SPECIAL_VALUES.indexOf(this.state.getCell(position).getRawValue()) != -1;
        var midPointIsAlt = C.ALT_SPECIAL_VALUES.indexOf(this.state.getCell(midPoint).getRawValue()) != -1;

        var midPointContext = this.state.getContext(midPoint);
        // Special case, a straight line with no turns.
        if (midPointContext.sum() == 1) {
          ends.push({position: midPoint, clockwise: clockwise, startIsAlt: startIsAlt, endIsAlt: midPointIsAlt});
          continue;
        }
        // Continue following lines from the midpoint.
        for (var j in C.DIRECTIONS) {
          if (C.DIRECTIONS[i].add(C.DIRECTIONS[j]).length() == 0 ||
            C.DIRECTIONS[i].add(C.DIRECTIONS[j]).length() == 2) {
            // Don't go back on ourselves, or don't carry on in same direction.
            continue;
          }
          var secondEnds = this.followLine(midPoint, C.DIRECTIONS[j]);
          // Ignore any directions that didn't go anywhere.
          if (secondEnds.length == 0) {
            continue;
          }
          var secondEnd = secondEnds[0];
          var endIsAlt = C.ALT_SPECIAL_VALUES.indexOf(this.state.getCell(secondEnd).getRawValue()) != -1;
          // On the second line we don't care about multiple
          // junctions, just the last.
          ends.push({position: secondEnd,
              clockwise: clockwise, startIsAlt: startIsAlt, midPointIsAlt: midPointIsAlt, endIsAlt: endIsAlt});
        }
      }
    }
    this.ends = ends;
    // Redraw the new lines after we have cleared the existing ones.
    this.move(this.startPosition);
  };

  public move(position) {
    this.state.clearDraw();
    // Clear all the lines so we can draw them afresh.
    for (var i in this.ends) {
      drawLine(this.state, this.startPosition, this.ends[i].position,
          this.ends[i].clockwise, ' ');
    }
    for (var i in this.ends) {
      drawLine(this.state, position, this.ends[i].position, this.ends[i].clockwise);
    }
    for (var i in this.ends) {
      // If the ends or midpoint of the line was a alt character (arrow), need to preserve that.
      if (this.ends[i].startIsAlt) {
        this.state.drawValue(position, C.ALT_SPECIAL_VALUE);
      }
      if (this.ends[i].endIsAlt) {
        this.state.drawValue(this.ends[i].position, C.ALT_SPECIAL_VALUE);
      }
      if (this.ends[i].midPointIsAlt) {
        var midX = this.ends[i].clockwise ? this.ends[i].position.x : position.x;
        var midY = this.ends[i].clockwise ? position.y : this.ends[i].position.y;
        this.state.drawValue(new Vector(midX, midY), C.ALT_SPECIAL_VALUE);
      }
    }
  };

  public end() {
    this.state.commitDraw();
  };

  /**
   * Follows a line in a given direction from the startPosition.
   * Returns a list of positions that were line 'junctions'. This is a bit of a
   * loose definition, but basically means a point around which we resize things.
   */
  public followLine(startPosition: Vector, direction: Vector): Vector[] {
    var endPosition = startPosition.clone();
    var junctions = [];
    while (true) {
      var nextEnd = endPosition.add(direction);
      if (!this.state.getCell(nextEnd).isSpecial()) {
        // Junctions: Right angles and end T-Junctions.
        if (!startPosition.equals(endPosition)) {
          junctions.push(endPosition);
        }
        return junctions;
      }

      endPosition = nextEnd;
      var context = this.state.getContext(endPosition);
      // Junctions: Side T-Junctions.
      if (context.sum() == 3) {
        junctions.push(endPosition);
      }
    }
  };

  /**
   * For a given position, finds the nearest cell that is of any interest to the
   * move tool, e.g. a corner or a line. Will look up to 1 cell in each direction
   * including diagonally.
   */
  public snapToNearest(position: Vector): Vector {
    if (this.state.getCell(position).isSpecial()) {
      return position;
    }
    var allDirections = C.DIRECTIONS.concat([
      C.DIR_LEFT.add(C.DIR_UP),
      C.DIR_LEFT.add(C.DIR_DOWN),
      C.DIR_RIGHT.add(C.DIR_UP),
      C.DIR_RIGHT.add(C.DIR_DOWN)]);

    var bestDirection = null;
    var bestContextSum = 0;
    for (var i in allDirections) {
      // Find the most connected cell, essentially.
      var newPos = position.add(allDirections[i]);
      var contextSum = this.state.getContext(newPos).sum();
      if (this.state.getCell(newPos).isSpecial() &&
          contextSum > bestContextSum) {
        bestDirection = allDirections[i];
        bestContextSum = contextSum;
      }
    }
    if (bestDirection == null) {
      // Didn't find anything, so just return the current cell.
      return position;
    }
    return position.add(bestDirection);
  };

  public getCursor(position: Vector): string {
    if (this.state.getCell(position).isSpecial()) {
      return 'pointer';
    } else {
      return 'default';
    }
  };

  public handleKey(value: string) {};
};
