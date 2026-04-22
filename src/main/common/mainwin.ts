import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';

const mainwinConfig: BrowserWindowConstructorOptions = {
    width: 1400,
    height: 800,
    minWidth: 800,
    minHeight: 800,
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '../../../build/icon.ico'),
    frame: false,
    fullscreen: true,  // 默认真全屏
    webPreferences: {
        webgl: true,
        partition: 'persist:fntv',
        preload: path.join(__dirname, '../../preload/index.js'),
        nodeIntegration: true,
        contextIsolation: false,
        spellcheck: false,
    }
};

let mainwin: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow {
    if (!mainwin) {
        mainwin = new BrowserWindow(mainwinConfig);
    }
    return mainwin;
}
