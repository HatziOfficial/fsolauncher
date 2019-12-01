const Modal = require('../Modal');
const HttpDownload = require('../http-download');

class RemeshesInstaller {
  constructor(path, FSOLauncher, parentComponent = "FreeSO") {
    this.FSOLauncher = FSOLauncher;
    this.id = Math.floor(Date.now() / 1000);
    this.path = path;
    this.haltProgress = false;
    this.tempPath = `temp/artifacts-remeshes-${this.id}.zip`;
    this.parentComponent = parentComponent;
    const location = FSOLauncher.remeshInfo.location
      ? FSOLauncher.remeshInfo.location
      : 'http://beta.freeso.org/remeshes.docx';

    this.dl = new HttpDownload(
      location,
      this.tempPath
    );
  }

  createProgressItem(Message, Percentage) {
    this.FSOLauncher.View.addProgressItem(
      'FSOProgressItem' + this.id,
      'Remesh Pack Download for ' + this.parentComponent,
      'Installing in ' + this.path,
      Message,
      Percentage
    );
  }

  install() {
    return this.step1()
      .then(() => this.step2())
      .then(() => this.step3())
      .then(() => this.end())
      .catch(ErrorMessage => this.error(ErrorMessage));
  }

  step1() {
    return this.download();
  }

  step2() {
    return this.setupDir(this.path);
  }

  step3() {
    return this.extract();
  }

  error(ErrorMessage) {
    this.haltProgress = true;
    this.createProgressItem(global.locale.FSO_FAILED_INSTALLATION, 100);
    this.FSOLauncher.View.stopProgressItem('FSOProgressItem' + this.id);
    this.FSOLauncher.removeActiveTask('RMS');
    Modal.showFailedInstall('Remesh Package', ErrorMessage);
    return Promise.reject(ErrorMessage);
  }

  end() {
    this.createProgressItem(global.locale.INSTALLATION_FINISHED, 100);
    this.FSOLauncher.View.stopProgressItem('FSOProgressItem' + this.id);
    this.FSOLauncher.updateInstalledPrograms();
    this.FSOLauncher.removeActiveTask('RMS');
    Modal.showInstalled('Remesh Package');
  }

  download() {
    return new Promise((resolve, reject) => {
      this.dl.run();
      this.dl.on('error', () => {});
      this.dl.on('end', _fileName => {
        if (this.dl.failed) {
          this.cleanup();
          return reject(global.locale.FSO_NETWORK_ERROR);
        }
        resolve();
      });
      this.updateDownloadProgress();
    });
  }

  setupDir(dir) {
    return new Promise((resolve, reject) => {
      require('mkdirp')(dir, function(err) {
        if(err) return reject(err);
        resolve();
      });
    });
  }

  updateDownloadProgress() {
    setTimeout(() => {
      const p = this.dl.getProgress(),
        mb = this.dl.getProgressMB(),
        size = this.dl.getSizeMB();

      if (p < 100) {
        if (!this.haltProgress) {
          this.createProgressItem(
            `${global.locale.DL_CLIENT_FILES} ${mb} MB ${global.locale.X_OUT_OF_X} ${size} MB (${p}%)`, p
          );
        }
        return this.updateDownloadProgress();
      }
    }, 1000);
  }

  extract() {
    const unzipStream = require('node-unzip-2').Extract({ path: this.path });
    this.createProgressItem(global.locale.EXTRACTING_CLIENT_FILES, 100);
    return new Promise((resolve, reject) => {
      require('fs')
        .createReadStream(this.tempPath)
        .pipe(unzipStream)
        .on('entry', entry => {
          this.createProgressItem(
            global.locale.EXTRACTING_CLIENT_FILES + ' ' + entry.path,
            100
          );
        });
      unzipStream.on('error', err => { return reject(err); });
      unzipStream.on('close', _err => {
        this.cleanup();
        return resolve();
      });
    });
  }

  cleanup() {
    const fs = require('fs');
    fs.stat(this.tempPath, (err, _stats) => {
      if (err) { return; }
      fs.unlink(this.tempPath, function(err) {
        if (err) return console.log(err);
      });
    });
  }
}

module.exports = RemeshesInstaller;
