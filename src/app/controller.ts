import * as $ from 'jquery';

import * as C from './constants';
import { DrawFunctionInterface, DrawBox, DrawLine, DrawFreeform, DrawErase, DrawMove, DrawText } from './draw';
import { DrawSelect } from './draw-select';
import { State } from './state';
import { View } from './view';
import { Vector } from './vector';

/**
 * Different modes of control.
 */
const Mode = {
    NONE: 0,
    DRAG: 1,
    DRAW: 2
};

/**
 * Handles user input events and modifies state.
 */
export class Controller {
  view: View;
  state: State;
  drawFunction: DrawFunctionInterface;
  mode: number = Mode.NONE;
  dragOrigin: Vector;
  dragOriginCell: Vector;
  lastMoveCell: Vector;

  constructor(view: View, state: State) {
    this.view = view;
    this.state = state;
    this.drawFunction = new DrawBox(state);

    this.installBindings();
  };

  public startDraw(position: Vector) {
    this.mode = Mode.DRAW;
    this.drawFunction.start(this.view.screenToCell(position));
  };

  public startDrag(position: Vector) {
    this.mode = Mode.DRAG;
    this.dragOrigin = position;
    this.dragOriginCell = this.view.offset;
  };

  public handleMove(position: Vector) {
    var moveCell = this.view.screenToCell(position);

    // First move event, make sure we don't blow up here.
    if (this.lastMoveCell == null) {
      this.lastMoveCell = moveCell;
    }

    // Update the cursor pointer, depending on the draw function.
    if (!moveCell.equals(this.lastMoveCell)) {
      this.view.canvas.style.cursor = this.drawFunction.getCursor(moveCell);
    }

    // In drawing mode, so pass the mouse move on, but remove duplicates.
    if (this.mode == Mode.DRAW && !moveCell.equals(this.lastMoveCell)) {
      this.drawFunction.move(moveCell);
    }

    // Drag in progress, update the view origin.
    if (this.mode == Mode.DRAG) {
      this.view.setOffset(this.dragOriginCell.add(
          this.dragOrigin
              .subtract(position)
              .scale(1 / this.view.zoom)));
    }
    this.lastMoveCell = moveCell;
  };

  /**
   * Ends the current operation.
   */
  public endAll() {
    if (this.mode == Mode.DRAW) {
      this.drawFunction.end();
    }
    // Cleanup state.
    this.mode = Mode.NONE;
    this.dragOrigin = null;
    this.dragOriginCell = null;
    this.lastMoveCell = null;
  };

  /**
   * Installs input bindings for common use cases devices.
   */
  public installBindings() {
    var controller = this;

    $(window).resize(function(e) { controller.view.resizeCanvas() });

    $('#draw-tools > button.tool').click(function(e) {
      $('#text-tool-widget').hide(0);
      this.handleDrawButton(e.target.id);
    }.bind(this));

    $('#file-tools > button.tool').click(function(e) {
      this.handleFileButton(e.target.id);
    }.bind(this));

    $('button.close-dialog-button').click(function(e) {
      $('.dialog').removeClass('visible');
    }.bind(this));

    $('#import-submit-button').click(function(e) {
      this.state.clear();
      this.state.fromText($('#import-area').val(),
          this.view.screenToCell(new Vector(
              this.view.canvas.width / 2,
              this.view.canvas.height / 2)));
      this.state.commitDraw();
      $('#import-area').val('');
      $('.dialog').removeClass('visible');
    }.bind(this));

    $('#use-lines-button').click(function(e) {
      $('.dialog').removeClass('visible');
      this.view.setUseLines(true);
    }.bind(this));

    $('#use-ascii-button').click(function(e) {
      $('.dialog').removeClass('visible');
      this.view.setUseLines(false);
    }.bind(this));

    $(window).keypress(function(e) {
      this.handleKeyPress(e);
    }.bind(this));

    $(window).keydown(function(e) {
      this.handleKeyDown(e);
    }.bind(this));

    // Bit of a hack, just triggers the text tool to get a new value.
    $('#text-tool-input, #freeform-tool-input').keyup(function(){
        this.drawFunction.handleKey('');
    }.bind(this));
    $('#text-tool-input, #freeform-tool-input').change(function(){
        this.drawFunction.handleKey('');
    }.bind(this));
    $('#text-tool-close').click(function(){
      $('#text-tool-widget').hide();
      this.state.commitDraw();
    }.bind(this));
  };

  /**
   * Handles the buttons in the UI.
   * @param {string} id The ID of the element clicked.
   */
  public handleDrawButton(id) {
    $('#draw-tools > button.tool').removeClass('active');
    $('#' + id).toggleClass('active');
    $('.dialog').removeClass('visible');

    // Install the right draw tool based on button pressed.
    if (id == 'box-button') {
      this.drawFunction = new DrawBox(this.state);
    }
    if (id == 'line-button') {
      this.drawFunction = new DrawLine(this.state, false);
    }
    if (id == 'arrow-button') {
      this.drawFunction = new DrawLine(this.state, true);
    }
    if (id == 'freeform-button') {
      this.drawFunction = new DrawFreeform(this.state, "X");
    }
    if (id == 'erase-button') {
      this.drawFunction = new DrawErase(this.state);
    }
    if (id == 'move-button') {
      this.drawFunction = new DrawMove(this.state);
    }
    if (id == 'text-button') {
      this.drawFunction = new DrawText(this.state, this.view);
    }
    if (id == 'select-button') {
      this.drawFunction = new DrawSelect(this.state);
    }
    this.state.commitDraw();
    this.view.canvas.focus();
  };

  /**
   * Handles the buttons in the UI.
   */
  public handleFileButton(id: string) {
    $('.dialog').removeClass('visible');
    $('#' + id + '-dialog').toggleClass('visible');

    if (id == 'import-button') {
      $('#import-area').val('');
      $('#import-area').focus();
    }

    if (id == 'export-button') {
      $('#export-area').val(this.state.outputText());
      $('#export-area').select();
    }
    if (id == 'clear-button') {
      this.state.clear();
    }
    if (id == 'undo-button') {
      this.state.undo();
    }
    if (id == 'redo-button') {
      this.state.redo();
    }
  };

  /**
   * Handles key presses.
   */
  public handleKeyPress(event) {
    if (!event.ctrlKey && !event.metaKey && event.keyCode != 13) {
      this.drawFunction.handleKey(String.fromCharCode(event.keyCode));
    }
  };

  /**
   * Handles key down events.
   */
  public handleKeyDown(event) {
    // Override some special characters so that they can be handled in one place.
    var specialKeyCode = null;

    if (event.ctrlKey || event.metaKey) {
      if (event.keyCode == 67) { specialKeyCode = C.KEY_COPY; }
      if (event.keyCode == 86) { specialKeyCode = C.KEY_PASTE; }
      if (event.keyCode == 90) { this.state.undo(); }
      if (event.keyCode == 89) { this.state.redo(); }
      if (event.keyCode == 88) { specialKeyCode = C.KEY_CUT; }
    }

    if (event.keyCode == 8) { specialKeyCode = C.KEY_BACKSPACE; }
    if (event.keyCode == 13) { specialKeyCode = C.KEY_RETURN; }
    if (event.keyCode == 38) { specialKeyCode = C.KEY_UP; }
    if (event.keyCode == 40) { specialKeyCode = C.KEY_DOWN; }
    if (event.keyCode == 37) { specialKeyCode = C.KEY_LEFT; }
    if (event.keyCode == 39) { specialKeyCode = C.KEY_RIGHT; }

    if (specialKeyCode != null) {
      //event.preventDefault();
      //event.stopPropagation();
      this.drawFunction.handleKey(specialKeyCode);
    }
  };
};
