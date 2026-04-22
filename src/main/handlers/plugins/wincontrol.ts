import { getMainWindow } from '../../common/mainwin';
import { exitFullScreen, enterFullScreen } from '../../common/winctrl';
import { registerHandler } from '../core/ipcHandler';

/**
 * 窗口控制插件
 * 处理窗口的最小化、全屏和关闭操作
 */

// 窗口最小化处理
function handleMinimize(): void {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
}

// 真全屏切换处理
function handleFullScreenToggle(): void {
    const mainWindow = getMainWindow();
    if (mainWindow) {
        mainWindow.isFullScreen() ? exitFullScreen(mainWindow) : enterFullScreen(mainWindow);
    }
}

// 窗口关闭处理
function handleClose(): void {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.close();
}

// 注册窗口控制处理器
function init(): void {
    registerHandler('window-minimize', handleMinimize);
    registerHandler('window-fullscreen-toggle', handleFullScreenToggle);
    registerHandler('window-close', handleClose);
}

export {
    init
};
