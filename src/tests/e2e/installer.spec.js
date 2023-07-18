const { _electron: electron } = require( 'playwright' );
const { test, expect } = require( '@playwright/test' );
const { findLatestBuild, parseElectronApp, stubDialog } = require( 'electron-playwright-helpers' );

const path = require( 'path' );
const fs = require( 'fs-extra' );

const stubConstants = require( '../stubs/constants' );

const INSTALL_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WINDOWS_INSTALL_PATH_WITH_SPECIAL_CHARS = 'C:\\Users\\Public\\TéstFõldér';

/** @type {import('playwright').Page} */
let window;

/** @type {import('playwright').ElectronApplication} */
let electronApp;

test.beforeEach( async () => {
  const latestBuild = findLatestBuild( '../release' );
  const appInfo = parseElectronApp( latestBuild );
  const exeDir = path.dirname( appInfo.executable );

  // Stub constants file for tests
  stubConstants( exeDir );

  const { appData } = require( '../../fsolauncher/constants' );

  fs.existsSync( `${appData}/FSOLauncher.ini` ) && fs.unlinkSync( `${appData}/FSOLauncher.ini` );

  // Pass in --test-mode for headless testing
  electronApp = await electron.launch( {
    cwd: exeDir,
    args: [ appInfo.main, '--test-mode=true' ], // Main file from package.json
    executablePath: appInfo.executable // Path to the Electron executable
  } );

  // Log main process
  electronApp.process().stdout.on( 'data', data => console.info( `[Main] ${data}` ) );
  electronApp.process().stderr.on( 'data', error => console.info( `[Main] ${error}` ) );

  window = await electronApp.firstWindow();
  // Log renderer process
  window.on( 'console', log => console.info( `[Renderer] ${log.text()}` ) );

  await window.waitForLoadState( 'load' ); // Waits for the page to be completely loaded
} );

test.afterEach( async () => {
  await electronApp.evaluate( async ( { _app } ) => global.willQuit = true );
  await electronApp.close();
} );

test( 'should launch the app', () => {
  // Setup and teardown
} );

test( 'should do a complete install', async () => {
  // Go to installer
  await window.click( '[page-trigger="installer"]' );
  await window.waitForSelector( '#full-install-button' );

  // Open the installer modal
  await window.click( '#full-install-button' );

  // Click modal
  const modalSelector = process.platform === 'win32' ?
    '.oneclick-install' : '[data-response-id="FULL_INSTALL_CONFIRM"]';
  await window.waitForSelector( modalSelector );

  if ( process.platform === 'win32' ) {
    // Reproduce installation flow on Windows
    // Stub the file dialog
    await stubDialog( electronApp, 'showOpenDialog', { filePaths: [
      WINDOWS_INSTALL_PATH_WITH_SPECIAL_CHARS
    ] } );

    // Click the 'select folder' button
    await window.click( '.oneclick-install-select' );
    await window.waitForSelector( '.oneclick-install-confirm' );

    // Click the 'confirm selected folder' button
    await window.click( '.oneclick-install-confirm' );
  } else {
    // Reproduce the installation on macOS
    // Click the 'YES' button
    await window.click( '[data-response-id="FULL_INSTALL_CONFIRM"] .yes-button' );
  }

  // Wait for full install to start
  await window.waitForSelector( '#full-install' );

  // Full install was started!
  console.info( 'test: full install was reached' );
  test.setTimeout( INSTALL_TIMEOUT_MS ); // Allow whole test to run for 10 mins

  // Wait for the full install to finish
  await window.waitForSelector( '#full-install', { state: 'hidden', timeout: INSTALL_TIMEOUT_MS } );

  if ( await window.isVisible( '.modal-error' ) ) {
    // An error appeared (will be console.logged)
    throw new Error( 'Error modal appeared' );
  }
  // Actually check that the programs are installed using the launcher's
  // registry utility
  const { getInstalled } = require( '../../fsolauncher/lib/registry' );

  const programs = await getInstalled();
  const isInstalled = programs.reduce( ( status, program ) => {
    status[ program.key ] = program.isInstalled;
    return status;
  }, {} );
  expect( isInstalled.FSO ).toBeTruthy();
  expect( isInstalled.TSO ).toBeTruthy();
} );