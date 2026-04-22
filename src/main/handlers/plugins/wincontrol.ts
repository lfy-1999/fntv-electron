import { getMainWindow } from '../../common/mainwin';
import { setHalfScreen, setFullScreen } from '../../common/winctrl';
import { registerHandler } from '../core/ipcHandler';

/**
 * 窗口控制插件
 */

// 窗口最小化处理
function handleMinimize(): void {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
}

// 窗口全屏/还原处理
function handleMaximize(): void {
    const mainWindow = getMainWindow();
    if (mainWindow) {
        // 【修改】判断是否全屏，而不是判断是否最大化
        if (mainWindow.isFullScreen()) {
            setHalfScreen(mainWindow); // 如果是全屏，就退出
        } else {
            setFullScreen(mainWindow); // 如果是窗口，就全屏
        }
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
    registerHandler('window-maximize', handleMaximize);
    registerHandler('window-close', handleClose);
}

export {
    init
};
