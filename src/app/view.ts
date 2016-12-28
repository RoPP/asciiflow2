import * as C from './constants';
import { State } from './state';
import { Vector } from './vector';

/**
 * Handles view operations, state and management of the screen.
 */
export class View {
  state: State;
  canvas;
  context;
  zoom: number = 1;
  offset: Vector;
  dirty: boolean = true;
  // TODO: Should probably save this setting in a cookie or something.
  useLines: boolean = false;

  constructor(state: State) {
    this.state = state;
    this.canvas = document.getElementById('ascii-canvas');
    this.context = this.canvas.getContext('2d');
    this.offset = new Vector(
      C.MAX_GRID_WIDTH * C.CHAR_PIXELS_H / 2,
      C.MAX_GRID_HEIGHT * C.CHAR_PIXELS_V / 2);
    this.resizeCanvas();
  }

  /**
   * Resizes the canvas, should be called if the viewport size changes.
   */
  public resizeCanvas() {
    this.canvas.width = document.documentElement.clientWidth;
    this.canvas.height = document.documentElement.clientHeight;
    this.dirty = true;
  };

  /**
   * Starts the animation loop for the canvas. Should only be called once.
   */
  public animate() {
    if (this.dirty || this.state.dirty) {
      this.dirty = false;
      this.state.dirty = false;
      this.render();
    }
    var view = this;
    window.requestAnimationFrame(function() { view.animate(); });
  };

  /**
   * Renders the given state to the canvas.
   * TODO: Room for efficiency here still. Drawing should be incremental,
   *       however performance is currently very acceptable on test devices.
   */
  public render() {
    var context = this.context;

    context.setTransform(1, 0, 0, 1, 0, 0);
    // Clear the visible area.
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    context.scale(this.zoom, this.zoom);
    context.translate(
        this.canvas.width / 2 / this.zoom,
        this.canvas.height / 2 / this.zoom);

    // Only render grid lines and cells that are visible.
    var startOffset = this.screenToCell(new Vector(
        0,
        0))
        .subtract(new Vector(
        C.RENDER_PADDING_CELLS, C.RENDER_PADDING_CELLS));
    var endOffset = this.screenToCell(new Vector(
        this.canvas.width,
        this.canvas.height))
        .add(new Vector(
        C.RENDER_PADDING_CELLS, C.RENDER_PADDING_CELLS));

    startOffset.x = Math.max(0, Math.min(startOffset.x, C.MAX_GRID_WIDTH));
    endOffset.x = Math.max(0, Math.min(endOffset.x, C.MAX_GRID_WIDTH));
    startOffset.y = Math.max(0, Math.min(startOffset.y, C.MAX_GRID_HEIGHT));
    endOffset.y = Math.max(0, Math.min(endOffset.y, C.MAX_GRID_HEIGHT));

    // Render the grid.
    context.lineWidth = '1';
    context.strokeStyle = '#EEEEEE';
    context.beginPath();
    for (var i = startOffset.x; i < endOffset.x; i++) {
      context.moveTo(
          i * C.CHAR_PIXELS_H - this.offset.x,
          0 - this.offset.y);
      context.lineTo(
          i * C.CHAR_PIXELS_H - this.offset.x,
          this.state.cells.length * C.CHAR_PIXELS_V - this.offset.y);
    }
    for (var j = startOffset.y; j < endOffset.y; j++) {
      context.moveTo(
          0 - this.offset.x,
          j * C.CHAR_PIXELS_V - this.offset.y);
      context.lineTo(
          this.state.cells.length * C.CHAR_PIXELS_H - this.offset.x,
          j * C.CHAR_PIXELS_V - this.offset.y);
    }
    this.context.stroke();
    this.renderText(context, startOffset, endOffset, !this.useLines);
    if (this.useLines) {
      this.renderCellsAsLines(context, startOffset, endOffset);
    }
  };

  public renderText = function(context, startOffset, endOffset, drawSpecials) {
    // Render cells.
    context.font = '15px Courier New';
    for (var i = startOffset.x; i < endOffset.x; i++) {
      for (var j = startOffset.y; j < endOffset.y; j++) {
        var cell = this.state.getCell(new Vector(i, j));
        // Highlight the cell if it is special (grey) or it is part
        // of a visible edit (blue).
        if (cell.isSpecial() ||
            (cell.hasScratch() && cell.getRawValue() != ' ')) {
          this.context.fillStyle = cell.hasScratch() ? '#DEF' : '#F5F5F5';
          context.fillRect(
              i * C.CHAR_PIXELS_H - this.offset.x,
              (j - 1) * C.CHAR_PIXELS_V - this.offset.y,
              C.CHAR_PIXELS_H, C.CHAR_PIXELS_V);
        }
        var cellValue = this.state.getDrawValue(new Vector(i, j));
        if (cellValue != null && (!cell.isSpecial() || drawSpecials)) {
          this.context.fillStyle = '#000000';
          context.fillText(cellValue,
              i * C.CHAR_PIXELS_H - this.offset.x,
              j * C.CHAR_PIXELS_V - this.offset.y - 3);
        }
      }
    }
  }

  public renderCellsAsLines(context, startOffset, endOffset) {
    context.lineWidth = '1';
    context.strokeStyle = '#000000';
    context.beginPath();
    for (var i = startOffset.x; i < endOffset.x; i++) {
      var startY = 0;
      for (var j = startOffset.y; j < endOffset.y; j++) {
        var cell = this.state.getCell(new Vector(i, j));
        if ((!cell.isSpecial() || j == endOffset.y - 1) && startY) {
          context.moveTo(
              i * C.CHAR_PIXELS_H - this.offset.x + C.CHAR_PIXELS_H/2,
              startY * C.CHAR_PIXELS_V - this.offset.y - C.CHAR_PIXELS_V/2);
          context.lineTo(
              i * C.CHAR_PIXELS_H - this.offset.x + C.CHAR_PIXELS_H/2,
              (j - 1) * C.CHAR_PIXELS_V - this.offset.y - C.CHAR_PIXELS_V/2);
          startY = 0;
        }
        if (cell.isSpecial() && !startY) {
          startY = j;
        }
      }
    }
    for (var j = startOffset.y; j < endOffset.y; j++) {
      var startX = 0;
      for (var i = startOffset.x; i < endOffset.x; i++) {
        var cell = this.state.getCell(new Vector(i, j));
        if ((!cell.isSpecial() || i == endOffset.x - 1) && startX) {
          context.moveTo(
              startX * C.CHAR_PIXELS_H - this.offset.x + C.CHAR_PIXELS_H/2,
              j * C.CHAR_PIXELS_V - this.offset.y - C.CHAR_PIXELS_V/2);
          context.lineTo(
              (i -1) * C.CHAR_PIXELS_H - this.offset.x + C.CHAR_PIXELS_H/2,
              j * C.CHAR_PIXELS_V - this.offset.y - C.CHAR_PIXELS_V/2);
          startX = 0;
        }
        if (cell.isSpecial() && !startX) {
          startX = i;
        }
      }
    }
    this.context.stroke();
  };

  public setZoom(zoom: number) {
    this.zoom = zoom;
    this.dirty = true;
  };

  public setOffset(offset: Vector) {
    this.offset = offset;
    this.dirty = true;
  };

  public setUseLines(useLines: boolean) {
    this.useLines = useLines;
    this.dirty = true;
  };

  /**
   * Given a screen coordinate, find the frame coordinates.
   */
  public screenToFrame(vector: Vector): Vector {
    return new Vector(
        (vector.x - this.canvas.width / 2) / this.zoom + this.offset.x,
        (vector.y - this.canvas.height / 2) / this.zoom + this.offset.y);
  };

  /**
   * Given a frame coordinate, find the screen coordinates.
   */
  public frameToScreen(vector: Vector): Vector {
    return new Vector(
        (vector.x - this.offset.x) * this.zoom + this.canvas.width / 2,
        (vector.y - this.offset.y) * this.zoom + this.canvas.height / 2);
  };

  /**
   * Given a frame coordinate, return the indices for the nearest cell.
   * @param {ascii.Vector} vector
   * @return {ascii.Vector}
   */
  public frameToCell(vector: Vector): Vector {
    // We limit the edges in a bit, as most drawing needs a full context to work.
    return new Vector(
      Math.min(Math.max(1,
          Math.round((vector.x - C.CHAR_PIXELS_H / 2) / C.CHAR_PIXELS_H)),
          C.MAX_GRID_WIDTH - 2),
      Math.min(Math.max(1,
          Math.round((vector.y + C.CHAR_PIXELS_V / 2) / C.CHAR_PIXELS_V)),
          C.MAX_GRID_HEIGHT - 2));
  };

  /**
   * Given a cell coordinate, return the frame coordinates.
   * @param {Vector} vector
   * @return {Vector}
   */
  public cellToFrame(vector: Vector): Vector {
    return new Vector(
        Math.round(vector.x * C.CHAR_PIXELS_H),
        Math.round(vector.y * C.CHAR_PIXELS_V));
  };

  /**
   * Given a screen coordinate, return the indices for the nearest cell.
   * @param {Vector} vector
   * @return {Vector}
   */
  public screenToCell(vector: Vector): Vector {
    return this.frameToCell(this.screenToFrame(vector));
  };

  /**
   * Given a cell coordinate, return the on screen coordinates.
   * @param {Vector} vector
   * @return {Vector}
   */
  public cellToScreen(vector: Vector): Vector {
    return this.frameToScreen(this.cellToFrame(vector));
  };
};
