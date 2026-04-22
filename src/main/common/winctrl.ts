import { BrowserWindow } from 'electron';
import * as log from '../../modules/logger';

/**
 * 退出全屏 (还原窗口)
 */
export function setHalfScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;
    mainWindow.setFullScreen(false);
    // 退出全屏后，给一个默认大小并居中，防止窗口跑到屏幕外
    mainWindow.setSize(1200, 800);
    mainWindow.center();
}

/**
 * 进入全屏
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (mainWindow) {
        mainWindow.setFullScreen(true);
    }
}

/**
 * 设置全屏切换 (F11 监听)
 */
export function setupFullScreenToggle(mainWindow: BrowserWindow): void {
    let isFullScreen = false;
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F11') {
            if (isFullScreen) {
                setHalfScreen(mainWindow);
            } else {
                setFullScreen(mainWindow);
            }
            isFullScreen = !isFullScreen;
            event.preventDefault();
        }
    });
}

/**
 * 禁用输入法 (保持原有逻辑)
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
 * 窗口显示事件
 */
export function setupWindowShowEvents(mainWindow: BrowserWindow): void {
    mainWindow.once('ready-to-show', () => mainWindow.show());
}

/**
 * Cookie 恢复逻辑 (保持原有逻辑)
 */
export async function setupCookieRestore(mainWindow: BrowserWindow): Promise<void> {
    // 这里保留你的原有逻辑，为了篇幅省略具体实现，请把你原来的代码粘贴回来
    // const savedConfig = readConfig(); ...
}
