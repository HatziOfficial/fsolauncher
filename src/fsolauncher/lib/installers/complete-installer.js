const Modal = require( '../modal' );
const { captureWithSentry } = require( '../utils' );

/**
 * Installs OpenAL, .NET, Mono, SDL, TSO and FreeSO.
 */
class CompleteInstaller {
  /**
   * @param {import('../../fsolauncher')} FSOLauncher The FSOLauncher instance.
   */
  constructor( FSOLauncher ) {
    this.FSOLauncher = FSOLauncher;
  }

  /**
   * Runs steps sequentially.
   * 
   * @param {string} folder The folder to install everything to.
   */
  async run( folder ) {
    try {
      await this.step1();
      await this.step2();
      await this.step3( folder );
      await this.step4( folder );
      this.end();
    } catch ( errorMessage ) {
      captureWithSentry( errorMessage, { installer: 'complete' } );
      this.error( errorMessage );
    }
  }

  /**
   * Install OpenAL.
   *
   * @returns {Promise<void>} A promise that resolves when the installation is finished.
   */
  step1() {
    this.FSOLauncher.IPC.fullInstallProgressItem(
      process.platform === 'win32' ? global.locale.INS_OAL : global.locale.INS_SDL,
      global.locale.INS_WINDOW,
      process.platform === 'win32' ? global.locale.INS_OAL_WINDOW : global.locale.INS_SDL_WINDOW,
      10
    );
    if ( process.platform === 'darwin' ) {
      // Skip SDL if already installed.
      if ( this.FSOLauncher.isInstalled['SDL'] ) {
        return Promise.resolve();
      }
      return this.FSOLauncher.install( 'SDL', { fullInstall: true } );
    }
    if ( this.FSOLauncher.isInstalled['OpenAL'] ) {
      return Promise.resolve();
    }
    return this.FSOLauncher.install( 'OpenAL' );
  }

  /**
   * Install .NET Framework.
   *
   * @returns {Promise<void>} A promise that resolves when the installation is finished.
   */
  step2() {
    this.FSOLauncher.IPC.fullInstallProgressItem(
      process.platform === 'win32' ? global.locale.INS_NET : global.locale.INS_MONO,
      global.locale.INS_WINDOW,
      process.platform === 'win32' ? global.locale.INS_NET_WINDOW : global.locale.INS_MONO_WINDOW,
      25
    );
    if ( process.platform === 'darwin' ) {
      // Skip Mono if already installed.
      if ( this.FSOLauncher.isInstalled['Mono'] ) {
        return Promise.resolve();
      }
      return this.FSOLauncher.install( 'Mono', { fullInstall: true } );
    }
    // Skip .NET if already installed.
    if ( this.FSOLauncher.isInstalled['NET'] ) {
      return Promise.resolve();
    }
    return this.FSOLauncher.install( 'NET' );
  }

  /**
   * Installs The Sims Online.
   * 
   * @param {string} folder The folder to install TSO to.
   *
   * @returns {Promise<void>} A promise that resolves when the installation is finished.
   */
  step3( folder ) {
    this.FSOLauncher.IPC.fullInstallProgressItem(
      global.locale.INS_TSO,
      global.locale.INS_DLEX,
      global.locale.INS_INFO,
      50
    );
    folder = folder + '/' + this.FSOLauncher.getPrettyName( 'TSO' );
    return this.FSOLauncher.install( 'TSO', { fullInstall: true, dir: folder } );
  }

  /**
   * Installs FreeSO.
   * 
   * @param {string} folder The folder to install FreeSO to.
   *
   * @returns {Promise<void>} A promise that resolves when the installation is finished.
   */
  step4( folder ) {
    this.FSOLauncher.IPC.fullInstallProgressItem(
      global.locale.INS_FSO,
      global.locale.INS_DLEX,
      global.locale.INS_INFO,
      75
    );
    folder = folder + '/' + this.FSOLauncher.getPrettyName( 'FSO' );
    return this.FSOLauncher.install( 'FSO', { fullInstall: true, dir: folder } );
  }

  /**
   * When the installation finished.
   */
  end() {
    this.FSOLauncher.IPC.fullInstallProgressItem(
      global.locale.INS_FINISHED,
      global.locale.INS_PLAY,
      global.locale.INS_PLAY_CLICK,
      100
    );
    Modal.sendNotification(
      'FreeSO Launcher',
      global.locale.INS_FINISHED_LONG,
      null,
      true,
      this.FSOLauncher.isDarkMode()
    );
    setTimeout( () => {
      this.FSOLauncher.removeActiveTask( 'FULL' );
      this.FSOLauncher.IPC.fullInstallProgressItem();
    }, 5000 );
  }

  /**
   * Communicates that an error happened.
   */
  error( errorMessage ) {
    this.FSOLauncher.IPC.fullInstallProgressItem(
      global.locale.INS_ERROR,
      global.locale.INS_ERROR_DESCR + ' ' + errorMessage,
      global.locale.INS_CLOSE,
      100
    );
    setTimeout( () => {
      this.FSOLauncher.removeActiveTask( 'FULL' );
      this.FSOLauncher.IPC.fullInstallProgressItem();
    }, 5000 );
  }
}

module.exports = CompleteInstaller;
