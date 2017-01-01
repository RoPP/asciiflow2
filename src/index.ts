import "./styles.scss";

import { State } from './app/state';
import { View } from './app/view';
import { Controller } from './app/controller';
import { DesktopController } from './app/desktop-controller';
import { TouchController } from './app/touch-controller';
import { DriveController } from './app/drive-controller';

import { OptionsDialog } from './app/components/options-dialog/options-dialog';


if (document.querySelectorAll('options-dialog').length) {
  let optionsDialog = new OptionsDialog();
  optionsDialog.render('options-dialog');
}

/**
 * Runs the application.
 */
function launch() {
  let state = new State();
  let view = new View(state);
  let controller = new Controller(view, state);
  let touchController = new TouchController(controller);
  let desktopController = new DesktopController(controller);
  let driveController = new DriveController(state, view);
  view.animate();
};

launch();
