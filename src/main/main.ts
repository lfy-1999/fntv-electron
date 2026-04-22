import { app, BrowserWindow, dialog, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as winctrl from './common/winctrl';
import { getMainWindow } from './common/mainwin';
import * as fnConfig from '../../config/config';
import * as logger from '../../modules/logger';
import { setupTray } from './tray';
import { setupAutoUpdater } from './updater';

// 定义应用退出状态
declare const app: Electron.App & {
    isQuiting?: boolean;
};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 单例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // 当运行第二个实例时,将会聚焦到 mainWindow 这个窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    // 处理 macOS 激活事件
    app.on('activate', () => {
        if (mainWindow) {
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }
            mainWindow.focus();
        } else {
            createWindow();
        }
    });

    app.whenReady().then(async () => {
        try {
            // 1. 初始化配置和日志
            logger.info('App starting...');
            
            // 2. 创建主窗口
            createWindow();

            // 3. 初始化托盘
            tray = setupTray(mainWindow);

            // 4. 初始化自动更新
            setupAutoUpdater(mainWindow);

            // 5. 处理证书错误 (忽略无效证书)
            app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
                if (url.startsWith('https://')) {
                    event.preventDefault();
                    callback(true);
                } else {
                    callback(false);
                }
            });

        } catch (error) {
            logger.error('App startup error:', error);
            dialog.showErrorBox('启动错误', `应用启动失败: ${error instanceof Error ? error.message : String(error)}`);
            app.quit();
        }
    });
}

// 创建窗口函数
function createWindow(): void {
    mainWindow = getMainWindow();

    // 加载页面
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:4200').catch(err => logger.error('Load URL error:', err));
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html')).catch(err => logger.error('Load File error:', err));
    }

    // 开发环境打开 DevTools
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // 注册窗口控制逻辑
    winctrl.setupFullScreenToggle(mainWindow);
    winctrl.setupInputMethodDisable(mainWindow);
    winctrl.setupWindowShowEvents(mainWindow);
    
    // 恢复 Cookie (如果有这个逻辑)
    winctrl.setupCookieRestore(mainWindow).catch(err => logger.error('Cookie restore error:', err));

    // 设置 IPC 监听
    setupIpcHandlers();

    // 设置窗口事件
    setupWindowEvents(mainWindow);
}

// 设置 IPC 通信监听
function setupIpcHandlers(): void {
    if (!mainWindow) return;

    // 1. 最小化
    ipcMain.on('window-minimize', () => {
        mainWindow?.minimize();
    });

    // 2. 全屏/还原切换 (原 maximize 逻辑修改为全屏)
    ipcMain.on('window-maximize', () => {
        if (mainWindow) {
            // 判断当前是否已经是全屏
            if (mainWindow.isFullScreen()) {
                winctrl.setHalfScreen(mainWindow); // 是全屏 -> 还原
            } else {
                winctrl.setFullScreen(mainWindow); // 是窗口 -> 全屏
            }
        }
    });

    // 3. 关闭
    ipcMain.on('window-close', () => {
        mainWindow?.close();
    });
}

// 设置窗口事件
function setupWindowEvents(mainWindow: BrowserWindow): void {
    // 监听进入全屏
    mainWindow.on('enter-full-screen', () => {
        mainWindow?.webContents.send('window-state-changed', true);
    });

    // 监听退出全屏
    mainWindow.on('leave-full-screen', () => {
        mainWindow?.webContents.send('window-state-changed', false);
    });

    // 窗口关闭事件
    mainWindow.on('close', async (event) => {
        if (!(app as any).isQuiting) {
            event.preventDefault();
            if (process.platform === 'darwin') {
                // macOS 平台处理
                handleMacClose(mainWindow);
            } else {
                // Windows/Linux 平台处理
                handleWinClose(mainWindow);
            }
        }
    });
}

// macOS 关闭处理逻辑
async function handleMacClose(mainWindow: BrowserWindow): Promise<void> {
    const action = fnConfig.getMacCloseAction(); // 假设 config 中有这个方法，如果没有请替换为 'ask'
    
    if (action === 'ask') {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: '关闭窗口',
            message: '您希望如何处理窗口关闭？',
            detail: '在 macOS 上，您可以选择隐藏到程序坞或完全退出应用。',
            buttons: ['隐藏到程序坞', '退出应用', '取消'],
            defaultId: 0,
            cancelId: 2,
            checkboxLabel: '记住我的选择',
            checkboxChecked: false
        });
        
        if (result.response === 0) {
            if (result.checkboxChecked) fnConfig.setMacCloseAction('minimize');
            mainWindow.hide();
            app.dock?.hide();
            showMacNotification();
        } else if (result.response === 1) {
            if (result.checkboxChecked) fnConfig.setMacCloseAction('quit');
            (app as any).isQuiting = true;
            app.quit();
        }
    } else if (action === 'minimize') {
        mainWindow.hide();
        app.dock?.hide();
        showMacNotification();
    } else if (action === 'quit') {
        (app as any).isQuiting = true;
        app.quit();
    }
}

// Windows/Linux 关闭处理逻辑
async function handleWinClose(mainWindow: BrowserWindow): Promise<void> {
    const exitMode = fnConfig.getExitMode();
    
    if (exitMode === 'ask') {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: '退出确认',
            message: '确定要退出应用吗？',
            detail: '您可以选择完全退出应用或最小化到托盘。',
            buttons: ['退出应用', '最小化到托盘', '取消'],
            defaultId: 1,
            cancelId: 2,
            checkboxLabel: '记住我的选择',
            checkboxChecked: false
        });
        
        if (result.response === 0) {
            if (result.checkboxChecked) fnConfig.setExitMode('direct');
            (app as any).isQuiting = true;
            app.quit();
        } else if (result.response === 1) {
            if (result.checkboxChecked) fnConfig.setExitMode('minimize');
            mainWindow.hide();
            showTrayNotification();
        }
    } else if (exitMode === 'minimize') {
        mainWindow.hide();
        showTrayNotification();
    } else {
        (app as any).isQuiting = true;
        app.quit();
    }
}

// macOS 通知显示
function showMacNotification(): void {
    if (!fnConfig.getTrayNotificationShown()) {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: '应用已隐藏',
                body: '应用已隐藏到程序坞，点击图标可以恢复窗口',
                silent: true
            });
            notification.show();
        }
        fnConfig.setTrayNotificationShown(true);
    }
}

// 托盘通知显示
function showTrayNotification(): void {
    if (!fnConfig.getTrayNotificationShown()) {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: '应用已最小化',
                body: '应用已最小化到托盘，双击图标可以恢复窗口',
                silent: true
            });
            notification.show();
        }
        fnConfig.setTrayNotificationShown(true);
    }
}

// 所有窗口关闭时 (macOS 除外)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 退出前清理
app.on('before-quit', () => {
    if (tray) {
        tray.destroy();
        tray = null;
    }
});
