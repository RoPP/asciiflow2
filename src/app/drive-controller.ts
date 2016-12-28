import * as $ from 'jquery';

import { State   } from './state';
import { Vector } from './vector';
import { View } from './view';

const CLIENT_ID = '125643747010-9s9n1ne2fnnuh5v967licfkt83r4vba5.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive';
const DEVELOPER_KEY = 'AIzaSyBbKO_v9p-G9StQjYmtUYLP6Px4MkGions';

/**
 *
 * @constructor
 */
export class DriveController {
  driveEnabled: boolean = false;
  state: State;
  view: View;
  // This is a file resource, as defined by the Drive API.
  file = null;
  cachedText: string = '';

  constructor(state, view) {
    this.state = state;
    this.view = view;

    this.tryInitialAuth();

    $('#drive-button').click(function() {
      if (!this.driveEnabled) {
        // Haven't been able to immediately auth yet, so try full auth.
        this.checkAuth(false);
        this.waitForFullAuth();
      } else {
        this.loadDialog();
      }
    }.bind(this));

    $('#drive-filename').click(function() {
      var currentTitle = '' + $('#drive-filename').text();
      var title = prompt('Enter new filename:', currentTitle);
      this.file['title'] = title;
      this.save();
      this.loadFileList();
    }.bind(this));

    this.loopSave();

    $(window).bind('hashchange', function() {
      this.loadFromHash();
    }.bind(this));

    $('#drive-new-file-button').click(function() {
      this.file = null;
      this.state.clear();
      window.location.hash = '';
      this.save();
      $('#drive-dialog').removeClass('visible');
    }.bind(this));
  };

  /**
   * Check if the current user has authorized the application.
   */
  public checkAuth(immediate) {
    window['gapi']['auth']['authorize']({
        'client_id': CLIENT_ID,
        'scope': SCOPES,
        'immediate': immediate},
        function(result) {
          if (result && !result.error && !this.driveEnabled) {
            this.driveEnabled = true;
            $('#drive-button').addClass('active');
            // We are authorized, so let's se if we can load from the URL hash.
            // This seems to fail if we do it too early.
            window.setTimeout(function() { this.loadFromHash(); }.bind(this), 500);
          }
        }.bind(this));
  };

  public tryInitialAuth() {
    if (window['gapi'] && window['gapi']['auth'] && window['gapi']['auth']['authorize']) {
      this.checkAuth(true);
    } else {
      window.setTimeout(function() {
        this.tryInitialAuth();
      }.bind(this), 500);
    }
  };

  public waitForFullAuth() {
    window.setTimeout(function() {
      if (!this.driveEnabled) {
        this.checkAuth(true);
        this.waitForFullAuth();
      } else {
        this.loadDialog();
      }
    }.bind(this), 1000);
  };

  /**
   * Handles a file resource being returned from Drive.
   */
  public handleFile(file) {
    this.file = file;
    $('#drive-filename').text(file['title']);
    window.location.hash = file['id'];
  };


  /**
   * Loads the drive dialog.
   */
  public loadDialog() {
    $('#drive-dialog').addClass('visible');

    var text = this.state.outputText();
    // Don't save diagram if empty, just get's annoying.
    if (text.length > 5 && text != this.cachedText) {
      this.save();
    }
    this.loadFileList();
  };

  public loadFileList() {
    this.safeExecute(this.getListRequest(), function(result) {
      $('#drive-file-list').children().remove();
      var items = result['items'];
      for (var i in items) {
        var entry = document.createElement('li');
        var title = document.createElement('a');
        entry.appendChild(title);
        title.href = '#' + items[i]['id'];
        $(title).click(function() { $('#drive-dialog').removeClass('visible'); });
        title.innerHTML = items[i]['title'];
        $('#drive-file-list').append(entry);
      }
    }.bind(this));
  }

  public safeExecute(request, callback) {
    // Could make the API call, don't blow up tho (mobiles n stuff).
    try {
      request['execute'](function(result) {
        if (!result['error']) {
          callback(result);
        }
      });
    } catch (e) {}
  };

  /**
   * Repeatedly save the diagram if it is editable and loaded.
   */
  public loopSave() {
    var text = this.state.outputText();
    if (text != this.cachedText && this.file && this.file['editable']) {
      this.save();
    }
    window.setTimeout(function() {
      this.loopSave();
    }.bind(this), 5000);
  }

  /**
   * Saves the current diagram to drive.
   */
  public save() {
    var text = this.state.outputText();
    $('#drive-save-state').text('Saving...');
    this.safeExecute(this.getSaveRequest(text), function(result) {
      this.handleFile(result);
      $('#drive-save-state').text('Saved');
      this.cachedText = text;
    }.bind(this));
  };

  public loadFromHash() {
    if (window.location.hash.length > 1) {
      $('#drive-save-state').text('Loading...');
      var fileId = window.location.hash.substr(1, window.location.hash.length - 1);
      this.safeExecute(this.getLoadRequest(fileId), function(result) {
        this.handleFile(result);
        this.reloadFileContent();
      }.bind(this));
    }
  };

  public reloadFileContent() {
    this.downloadFile(this.file['downloadUrl'], function(content) {
      $('#drive-save-state').text('Loaded');
      this.state.clear();
      this.state.fromText(content, this.view.screenToCell(new Vector(
              this.view.canvas.width / 2,
              this.view.canvas.height / 2)));
      this.state.commitDraw();
      this.cachedText = this.state.outputText();
    }.bind(this));
  };

  public getSaveRequest(text) {
    var boundary = '-------314159265358979323846';
    var delimiter = "\r\n--" + boundary + "\r\n";
    var close_delim = "\r\n--" + boundary + "--";

    var title = this.file == null ? 'Untitled ASCII Diagram' : this.file['title'];

    var metadata = {
        'title': title,
        'mimeType': 'text/plain'
    };

    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + 'text/plain' + '\r\n' +
        '\r\n' +
        text +
        close_delim;

    // Choose upload path and method depending on whether we have create a file already.
    var fileId = this.file == null ? '' : '/' + this.file['id'];
    var method = this.file == null ? 'POST' : 'PUT';

    return window['gapi']['client']['request']({
        'path': '/upload/drive/v2/files' + fileId,
        'method': method,
        'params': {'uploadType': 'multipart'},
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody});
  };

  public getLoadRequest(fileId) {
    return window['gapi']['client']['request']({
        'path': '/drive/v2/files/' + fileId,
        'method': 'GET'});
  };

  public getListRequest() {
    return window['gapi']['client']['request']({
        'path': '/drive/v2/files',
        'params' : { 'q': 'mimeType = \'text/plain\' and trashed = false' },
        'method': 'GET'});
  };

  /**
   * Download a file's content.
   */
  public downloadFile(url: string, callback) {
    var accessToken = window['gapi']['auth']['getToken']()['access_token'];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.onload = function() {
      callback(xhr.responseText);
    };
    xhr.onerror = function() {
      callback(null);
    };
    xhr.send();
  }
};
