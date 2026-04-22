import * as path from 'path';
import * as log from '../../modules/logger';
import { readConfig } from '../../modules/fn_config/config';
import { restoreCookies } from '../../modules/fn_config/cookie';
import { BrowserWindow } from 'electron';

/**
 * 退出全屏 (原 setHalfScreen)
 */
export function setHalfScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;
    // 【修改】退出真全屏模式
    mainWindow.setFullScreen(false);
    // 退出全屏后，恢复一个默认大小并居中，防止窗口跑到奇怪的地方
    mainWindow.setSize(1200, 800);
    mainWindow.center();
}

/**
 * 进入全屏 (原 setFullScreen)
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (mainWindow) {
        // 【修改】进入真全屏模式
        mainWindow.setFullScreen(true);
    }
}

/**
 * 设置全屏切换 (F11 监听)
 */
export function setupFullScreenToggle(mainWindow: BrowserWindow): void {
    let isFullScreen = false; // 本地状态记录
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
    mainWindow.once('ready-to-show', () => mainWindow.show());
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

    log.info('恢复登录状态，即将跳转到主页面, domain:', savedConfig.domain);
    await restoreCookies(savedConfig.domain, savedConfig.token).then((result) => {
        if (result === true) {
            mainWindow.loadURL(`${savedConfig.domain}/v`);
        } else {
            log.warn('Cookie 恢复失败，跳转到登录页面');
            mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
        }
    }).catch((error) => {
        log.error('Cookie 恢复过程中出现异常:', error);
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    });
}
