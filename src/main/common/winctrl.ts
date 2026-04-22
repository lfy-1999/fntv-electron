import * as path from 'path';
import * as log from '../../modules/logger';
import { readConfig } from '../../modules/fn_config/config';
import { restoreCookies } from '../../modules/fn_config/cookie';
import { BrowserWindow, ipcMain } from 'electron';

/**
 * 设置窗口为半屏 (退出全屏模式)
 */
export function setHalfScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;

    log.info('执行：退出全屏/最大化，恢复窗口');

    // 1. 强制退出全屏
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    }

    // 2. 强制取消最大化
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    }

    // 3. 确保窗口可见且居中
    mainWindow.show();
    mainWindow.setSize(1200, 800);
    mainWindow.center();
}

/**
 * 【修复】设置窗口为真全屏
 * 去掉多余的“先退出再进入”逻辑，直接强制全屏
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;

    log.info('执行：进入全屏模式');

    // 1. 确保窗口是显示的
    mainWindow.show();

    // 2. 直接执行全屏
    // 不要先 setFullScreen(false)，那会导致状态闪烁
    mainWindow.setFullScreen(true);
}

/**
 * 设置 IPC 监听器
 */
export function setupIpcHandlers(mainWindow: BrowserWindow): void {
    // 监听右上角按钮点击
    ipcMain.on('window-maximize', () => {
        if (!mainWindow) return;

        log.info('收到 window-maximize 信号');
        
        // 核心逻辑：如果当前已经是全屏，就退出；否则进入全屏
        const isCurrentlyFullScreen = mainWindow.isFullScreen();
        
        if (isCurrentlyFullScreen) {
            log.info('当前是全屏，执行退出');
            setHalfScreen(mainWindow);
            // 通知渲染进程更新图标
            mainWindow.webContents.send('window-state-changed', false);
        } else {
            log.info('当前是窗口化，执行全屏');
            setFullScreen(mainWindow);
            // 通知渲染进程更新图标
            mainWindow.webContents.send('window-state-changed', true);
        }
    });

    // 监听最小化
    ipcMain.on('window-minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    // 监听关闭
    ipcMain.on('window-close', () => {
        if (mainWindow) mainWindow.close();
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
        // 这里不需要强制全屏，因为 mainwin.ts 已经配置了 fullscreen: true
        // 如果这里再调用一次，可能会导致启动时闪烁
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
