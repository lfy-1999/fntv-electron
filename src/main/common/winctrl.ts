import * as path from 'path';
import * as log from '../../modules/logger';
import { readConfig } from '../../modules/fn_config/config';
import { restoreCookies } from '../../modules/fn_config/cookie';
import { BrowserWindow, ipcMain } from 'electron'; // 引入 ipcMain

/**
 * 设置窗口为半屏 (退出全屏模式)
 */
export function setHalfScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;

    // 1. 强制退出全屏模式
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    }
    
    // 2. 确保没有处于最大化状态
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    }

    // 3. 恢复到指定尺寸并居中
    mainWindow.setSize(1200, 800);
    mainWindow.center();
    
    log.info('窗口已恢复为半屏模式');
}

/**
 * 设置窗口为真全屏
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;
    
    // 进入全屏
    mainWindow.setFullScreen(true);
    log.info('窗口已进入全屏模式');
}

/**
 * 【新增】设置 IPC 监听器 - 必须调用这个才能让按钮生效
 */
export function setupIpcHandlers(mainWindow: BrowserWindow): void {
    // 监听右上角“最大化/还原”按钮的点击
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isFullScreen()) {
            setHalfScreen(mainWindow);
        } else {
            setFullScreen(mainWindow);
        }
    });

    // 监听最小化
    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    // 监听关闭
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
 * 设置窗口显示事件 (修复默认全屏逻辑)
 */
export function setupWindowShowEvents(mainWindow: BrowserWindow): void {
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // 【修复】强制默认全屏
        // 这里直接调用，确保窗口显示出来就是全屏
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

    log.info('恢复登录状态，即将跳转到主页面');

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
