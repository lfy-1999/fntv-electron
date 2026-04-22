import * as path from 'path';
import * as log from '../../modules/logger';
import { readConfig } from '../../modules/fn_config/config';
import { restoreCookies } from '../../modules/fn_config/cookie';
import { BrowserWindow } from 'electron';

/**
 * 设置窗口为半屏 (退出全屏模式)
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setHalfScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;

    // 1. 强制退出全屏模式
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    }
    
    // 2. 确保没有处于最大化状态（防止状态残留）
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    }

    // 3. 恢复到指定尺寸并居中
    // 使用 setBounds 确保位置和大小绝对准确
    mainWindow.setSize(1200, 800);
    mainWindow.center();
    
    log.info('窗口已恢复为半屏模式');
}

/**
 * 设置窗口为真全屏
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;
    
    // 直接使用 Electron 的原生全屏 API
    // 这会隐藏任务栏和系统标题栏，实现真正的沉浸式全屏
    // 注意：不要混用 maximize() 和 setFullScreen()
    mainWindow.setFullScreen(true);
    
    log.info('窗口已进入全屏模式');
}

/**
 * 设置全屏切换 (F11)
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setupFullScreenToggle(mainWindow: BrowserWindow): void {
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // 检测 F11 按下
        if (input.type === 'keyDown' && input.key === 'F11') {
            // 直接根据当前系统状态取反，不维护额外的变量
            const isCurrentlyFullScreen = mainWindow.isFullScreen();
            
            if (isCurrentlyFullScreen) {
                setHalfScreen(mainWindow);
            } else {
                setFullScreen(mainWindow);
            }
            
            // 阻止默认行为
            event.preventDefault();
        }
    });
}

/**
 * 设置输入法相关功能
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setupInputMethodDisable(mainWindow: BrowserWindow): void {
    mainWindow.webContents.on('dom-ready', () => {
        // 注入CSS来禁用输入法自动切换
        mainWindow.webContents.insertCSS(`
            * {
                ime-mode: disabled !important;
                -webkit-ime-mode: disabled !important;
            }
            input, textarea {
                ime-mode: inactive !important;
                -webkit-ime-mode: inactive !important;
            }
        `);
    });
}

/**
 * 设置窗口显示事件 (在此处强制默认全屏)
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setupWindowShowEvents(mainWindow: BrowserWindow): void {
    mainWindow.once('ready-to-show', () => {
        // 显示窗口
        mainWindow.show();
        
        // 【修改点】：强制默认全屏
        // 窗口显示后立即进入全屏，实现默认全屏启动
        setFullScreen(mainWindow);
    });
}

/**
 * 设置 cookie 恢复
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export async function setupCookieRestore(mainWindow: BrowserWindow): Promise<void> {
    const savedConfig = readConfig();
    if (!savedConfig || !savedConfig.token || !savedConfig.domain) {
        log.warn('没有找到已保存的配置，无法恢复 cookie');
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
        return;
    }

    log.info('恢复登录状态，即将跳转到主页面, domain:', savedConfig.domain, ' token:', savedConfig.token);

    await restoreCookies(savedConfig.domain, savedConfig.token).then((result) => {
        if (result === true) {
            mainWindow.loadURL(`${savedConfig.domain}/v`);
            return;
        }
        log.warn('Cookie 恢复失败，跳转到登录页面');
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    }).catch((error) => {
        log.error('Cookie 恢复过程中出现异常:', error);
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    });
}
