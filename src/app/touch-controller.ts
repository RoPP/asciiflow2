import * as $ from 'jquery';

import * as C from './constants';
import { Controller } from './controller';
import { Vector } from './vector';

/**
 * Handles touch inputs, and passes them onto the main controller.
 */
export class TouchController {
  controller: Controller;
  pressVector: Vector;
  originalZoom: number;
  zoomLength: number;
  pressTimestamp: number;
  dragStarted: boolean = false;
  zoomStarted: boolean = false;

  constructor(controller: Controller) {
    this.controller = controller;

    this.installBindings();
  };

  public handlePress(position: Vector) {
    this.pressVector = position;
    this.pressTimestamp = $.now();
    this.dragStarted = false;

    // If a drag or zoom didn't start and if we didn't release already, then handle it as a draw.
    window.setTimeout(function() {
      if (!this.dragStarted && !this.zoomStarted && this.pressVector != null) {
        this.controller.startDraw(position);
      }
    }.bind(this), C.DRAG_LATENCY);
  };

  /**
   * The multi-touch version of handlePress.
   */
  public handlePressMulti(positionOne: Vector, positionTwo: Vector) {
    // A second finger as been placed, cancel whatever we were doing.
    this.controller.endAll();
    this.zoomStarted = true;
    this.dragStarted = false;
    this.zoomLength = positionOne.subtract(positionTwo).length();
    this.originalZoom = this.controller.view.zoom;
  };

  public handleMove(position: Vector) {
    // Initiate a drag if we have moved enough, quickly enough.
    if (!this.dragStarted &&
        ($.now() - this.pressTimestamp) < C.DRAG_LATENCY &&
        position.subtract(this.pressVector).length() > C.DRAG_ACCURACY) {
        this.dragStarted = true;
        this.controller.startDrag(position);
    }
    // Pass on the event.
    this.controller.handleMove(position);
  };

  /**
   * The multi-touch version of handleMove, effectively only deals with zooming.
   */
  public handleMoveMulti(positionOne: Vector, positionTwo: Vector) {
    if (this.zoomStarted) {
      var newZoom = this.originalZoom *
          positionOne.subtract(positionTwo).length() / this.zoomLength;
      newZoom = Math.max(Math.min(newZoom, 5), 0.5);
      this.controller.view.setZoom(newZoom);
    }
  };

  /**
   * Ends all current actions, cleans up any state.
   */
  public reset() {
    this.dragStarted = false;
    this.zoomStarted = false;
    this.pressVector = null;
  };

  /**
   * Installs input bindings associated with touch controls.
   */
  public installBindings() {
    var canvas = this.controller.view.canvas;

    $(canvas).bind('touchstart', function(e) {
        e.preventDefault();
        if (e.originalEvent.touches.length == 1) {
          this.handlePress(new Vector(
            e.originalEvent.touches[0].pageX,
            e.originalEvent.touches[0].pageY));
        } else if (e.originalEvent.touches.length > 1) {
          this.handlePressMulti(new Vector(
            e.originalEvent.touches[0].pageX,
            e.originalEvent.touches[0].pageY),
            new Vector(
                e.originalEvent.touches[1].pageX,
                e.originalEvent.touches[1].pageY));
        }
    }.bind(this));

    $(canvas).bind('touchmove', function(e) {
        e.preventDefault();
        if (e.originalEvent.touches.length == 1) {
          this.handleMove(new Vector(
            e.originalEvent.touches[0].pageX,
            e.originalEvent.touches[0].pageY));
        } else if (e.originalEvent.touches.length > 1) {
          this.handleMoveMulti(new Vector(
            e.originalEvent.touches[0].pageX,
            e.originalEvent.touches[0].pageY),
            new Vector(
                e.originalEvent.touches[1].pageX,
                e.originalEvent.touches[1].pageY));
        }
    }.bind(this));

    // Pass through, no special handling.
    $(canvas).bind('touchend', function(e) {
        e.preventDefault();
        this.reset();
        this.controller.endAll();
    }.bind(this));
  };
};
