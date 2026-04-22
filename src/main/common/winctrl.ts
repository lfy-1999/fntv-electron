import * as path from 'path';
import * as log from '../../modules/logger';
import { readConfig } from '../../modules/fn_config/config';
import { restoreCookies } from '../../modules/fn_config/cookie';
import { BrowserWindow, ipcMain } from 'electron'; // 必须引入 ipcMain

/**
 * 设置窗口为半屏 (退出全屏模式)
 */
export function setHalfScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;

    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    }
    
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    }

    mainWindow.setSize(1200, 800);
    mainWindow.center();
    
    log.info('窗口已恢复为半屏模式');
}

/**
 * 设置窗口为真全屏
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;
    
    mainWindow.setFullScreen(true);
    log.info('窗口已进入全屏模式');
}

/**
 * 【核心修改】设置 IPC 监听器
 */
export function setupIpcHandlers(mainWindow: BrowserWindow): void {
    // 1. 监听右上角按钮点击
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isFullScreen()) {
            setHalfScreen(mainWindow);
        } else {
            setFullScreen(mainWindow);
        }
    });

    // 2. 监听最小化
    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    // 3. 监听关闭
    ipcMain.on('window-close', () => {
        mainWindow.close();
    });
}

/**
 * 设置全屏切换 (F11)
 */
export function setupFullScreenToggle(mainWindow: BrowserWindow): void {
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            if (mainWindow.isFullScreen()) {
                setHalfScreen(mainWindow);
            } else {
                setFullScreen(mainWindow);
            }
            event.preventDefault();
        }
    });
}

/**
 * 设置输入法相关功能
 */
export function setupInputMethodDisable(mainWindow: BrowserWindow): void {
    mainWindow.webContents.on('dom-ready', () => {
        mainWindow.webContents.insertCSS(`
            * { ime-mode: disabled !important; -webkit-ime-mode: disabled !important; }
            input, textarea { ime-mode: inactive !important; -webkit-ime-mode: inactive !important; }
        `);
    });
}

/**
 * 设置窗口显示事件
 */
export function setupWindowShowEvents(mainWindow: BrowserWindow): void {
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        setFullScreen(mainWindow);
    });
}

/**
 * 设置 cookie 恢复
 */
export async function setupCookieRestore(mainWindow: BrowserWindow): Promise<void> {
    const savedConfig = readConfig();
    if (!savedConfig || !savedConfig.token || !savedConfig.domain) {
        log.warn('没有找到已保存的配置，无法恢复 cookie');
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
        return;
    }

    log.info('恢复登录状态');

    await restoreCookies(savedConfig.domain, savedConfig.token).then((result) => {
        if (result === true) {
            mainWindow.loadURL(`${savedConfig.domain}/v`);
            return;
        }
        log.warn('Cookie 恢复失败');
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    }).catch((error) => {
        log.error('Cookie 恢复异常:', error);
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    });
}
