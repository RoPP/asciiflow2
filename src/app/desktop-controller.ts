import * as $ from 'jquery';

import { Controller } from './controller';
import { Vector } from './vector';

/**
 * Handles desktop inputs, and passes them onto the main controller.
 */
export class DesktopController {
  controller: Controller;
  isDragging: boolean = false;

  constructor(controller: Controller) {
    this.controller = controller;

    this.installBindings();
  };

  public handleZoom(delta: number) {
    var newzoom = this.controller.view.zoom * (delta > 0 ? 1.1 : 0.9);
    newzoom = Math.max(Math.min(newzoom, 5), 0.2);
    this.controller.view.setZoom(newzoom);
  };

  /**
   * Installs input bindings associated with keyboard controls.
   */
  public installBindings() {
    var canvas = this.controller.view.canvas;
    $(canvas).bind('mousewheel', function(e) {
        this.handleZoom(e.originalEvent.wheelDelta);
    }.bind(this));

    $(canvas).mousedown(function(e) {
        // Can drag by holding either the control or meta (Apple) key.
        if (e.ctrlKey || e.metaKey) {
          this.controller.startDrag(new Vector(e.clientX, e.clientY));
        } else {
          this.controller.startDraw(new Vector(e.clientX, e.clientY));
        }
    }.bind(this));

    // Pass these events through to the main controller.
    $(canvas).mouseup(function(e) {
        this.controller.endAll();
    }.bind(this));

    $(canvas).mouseleave(function(e) {
        this.controller.endAll();
    }.bind(this));

    $(canvas).mousemove(function(e) {
        this.controller.handleMove(new Vector(e.clientX, e.clientY));
    }.bind(this));
  };
};
