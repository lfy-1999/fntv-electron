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

    // 1. 退出 Electron 的原生全屏模式
    if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false);
    }
    
    // 2. 取消最大化状态（防止窗口卡在最大化）
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    }

    // 3. 恢复到指定尺寸并居中
    mainWindow.setSize(1200, 800);
    mainWindow.center();
}

/**
 * 设置窗口为真全屏
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setFullScreen(mainWindow: BrowserWindow): void {
    if (!mainWindow) return;
    
    // 直接使用 Electron 的原生全屏 API
    // 这会隐藏任务栏和系统标题栏，实现真正的沉浸式全屏
    mainWindow.setFullScreen(true);
}

/**
 * 设置全屏切换 (F11)
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setupFullScreenToggle(mainWindow: BrowserWindow): void {
    // 监听键盘事件
    mainWindow.webContents.on('before-input-event', (event, input) => {
        // 检测 F11 按下
        if (input.type === 'keyDown' && input.key === 'F11') {
            // 根据当前状态切换
            if (mainWindow.isFullScreen()) {
                setHalfScreen(mainWindow);
            } else {
                setFullScreen(mainWindow);
            }
            // 阻止默认行为（防止浏览器自带的 F11 行为干扰）
            event.preventDefault();
        }
    });
}

/**
 * 设置输入法相关功能
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setupInputMethodDisable(mainWindow: BrowserWindow): void {
    // 禁用输入法相关功能
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
 * 设置窗口显示事件
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export function setupWindowShowEvents(mainWindow: BrowserWindow): void {
    mainWindow.once('ready-to-show', () => mainWindow.show());
}

/**
 * 设置 cookie 恢复
 * @param {Electron.BrowserWindow} mainWindow - 主窗口实例
 */
export async function setupCookieRestore(mainWindow: BrowserWindow): Promise<void> {
    // 从配置中恢复 cookie
    const savedConfig = readConfig();
    if (!savedConfig || !savedConfig.token || !savedConfig.domain) {
        log.warn('没有找到已保存的配置，无法恢复 cookie');
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
        return;
    }

    // 恢复 cookie 并跳转到对应的 URL
    log.info('恢复登录状态，即将跳转到主页面, domain:', savedConfig.domain, ' token:', savedConfig.token);

    // 恢复 cookie
    await restoreCookies(savedConfig.domain, savedConfig.token).then((result) => {
        if (result === true) {
            // cookie 恢复成功，跳转到主页面
            mainWindow.loadURL(`${savedConfig.domain}/v`);
            return;
        }

        // cookie 恢复失败，跳转到登录页面
        log.warn('Cookie 恢复失败，跳转到登录页面');
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    }).catch((error) => {
        // 出现异常，也跳转到登录页面
        log.error('Cookie 恢复过程中出现异常:', error);
        mainWindow.loadFile(path.join(__dirname, '../../../resource/login/index.html'));
    });
}
