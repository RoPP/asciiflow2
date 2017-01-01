import * as $ from 'jquery';
import * as mustache from 'mustache';

import * as template from './options-dialog.html';

export class OptionsDialog {
  public render(node) {
    $(node).html(
      mustache.render(template, {})
    );
  }
}
