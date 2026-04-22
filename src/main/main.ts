import { app, BrowserWindow, dialog, ipcMain, Notification } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { registerAllPlugins } from './handlers';
import { getInstance as getUpdateChecker } from '../modules/updater/updateChecker';
import * as winctrl from './common/winctrl'; // 引入 winctrl
import { createTray, showTrayNotification, destroyTray } from './common/tray';
import { getMacCloseAction, setMacCloseAction, getTrayNotificationShown, setTrayNotificationShown } from './common/preferences';
import * as fnConfig from '../modules/fn_config/config';
import * as log from '../modules/logger';
import { getMainWindow } from './common/mainwin';
import { isTrusted } from '../modules/cert_trust';
import { startProxyProcess, shutdownProxyProcess } from './common/proxy';

// 系统级配置
app.commandLine.appendSwitch('--lang', 'en-US');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--log-level', '3');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');

let mainWindow: BrowserWindow | null = null;
let proxyProcess: ChildProcess | null = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        try {
            log.info('=== 飞牛影视启动 ===');

            // SSL 证书信任处理
            app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
                if (isTrusted(url)) {
                    event.preventDefault();
                    callback(true);
                } else {
                    callback(false);
                }
            });

            // 1. 启动代理
            proxyProcess = await startProxyProcess();

            // 2. 创建窗口
            mainWindow = getMainWindow();

            // 3. 注册插件和托盘
            registerAllPlugins();
            await createTray(mainWindow);

            // 4. 设置窗口事件 (关闭逻辑等)
            setupWindowEvents(mainWindow);

            // 5. 初始化窗口控制 (F11, 输入法, 全屏监听)
            // 【修改】直接调用函数，不再实例化类
            winctrl.setupFullScreenToggle(mainWindow);
            winctrl.setupInputMethodDisable(mainWindow);
            winctrl.setupWindowShowEvents(mainWindow);

            // 6. 恢复登录状态
            await winctrl.setupCookieRestore(mainWindow);

            // 7. 窗口显示事件
            mainWindow.once('ready-to-show', () => {
                mainWindow?.show();
            });

            // --- 【新增】IPC 通信监听 (标题栏按钮控制) ---
            ipcMain.on('window-minimize', () => {
                mainWindow?.minimize();
            });

            ipcMain.on('window-close', () => {
                mainWindow?.close();
            });

            // 处理标题栏的全屏按钮点击
            ipcMain.on('window-maximize', () => {
                if (mainWindow) {
                    if (mainWindow.isFullScreen()) {
                        winctrl.setHalfScreen(mainWindow);
                    } else {
                        winctrl.setFullScreen(mainWindow);
                    }
                }
            });

            // --- 【新增】监听系统全屏事件，同步给前端更新图标 ---
            mainWindow.on('enter-full-screen', () => {
                mainWindow?.webContents.send('window-state-changed', true);
            });
            mainWindow.on('leave-full-screen', () => {
                mainWindow?.webContents.send('window-state-changed', false);
            });

            // 延迟更新检查
            setTimeout(() => {
                getUpdateChecker().autoCheckForUpdates().catch(log.error);
            }, 3000);

        } catch (error) {
            log.error('应用启动失败:', error);
            app.quit();
        }
    });
}

// 窗口关闭逻辑
function setupWindowEvents(mainWindow: BrowserWindow): void {
    mainWindow.on('close', async (event) => {
        if (!(app as any).isQuiting) {
            event.preventDefault();
            if (process.platform === 'darwin') {
                handleMacClose(mainWindow);
            } else {
                handleWinClose(mainWindow);
            }
        }
    });
}

function handleMacClose(win: BrowserWindow): void {
    const action = getMacCloseAction();
    if (action === 'ask') {
        dialog.showMessageBox(win, {
            type: 'question',
            buttons: ['隐藏到状态栏', '退出应用', '取消'],
            defaultId: 0,
            cancelId: 2,
            message: '如何处理窗口关闭？',
            checkboxLabel: '记住我的选择',
            checkboxChecked: false
        }).then((result) => {
            if (result.response === 0) {
                if (result.checkboxChecked) setMacCloseAction('minimize');
                win.hide();
                app.dock?.hide();
                showMacNotification();
            } else if (result.response === 1) {
                if (result.checkboxChecked) setMacCloseAction('quit');
                (app as any).isQuiting = true;
                app.quit();
            }
        });
    } else if (action === 'minimize') {
        win.hide();
        app.dock?.hide();
        showMacNotification();
    } else {
        (app as any).isQuiting = true;
        app.quit();
    }
}

function handleWinClose(win: BrowserWindow): void {
    const exitMode = fnConfig.getExitMode();
    if (exitMode === 'ask') {
        dialog.showMessageBox(win, {
            type: 'question',
            buttons: ['退出应用', '最小化到托盘', '取消'],
            defaultId: 1,
            cancelId: 2,
            message: '确定要退出飞牛影视吗？',
            checkboxLabel: '记住我的选择',
            checkboxChecked: false
        }).then((result) => {
            if (result.response === 0) {
                if (result.checkboxChecked) fnConfig.setExitMode('direct');
                (app as any).isQuiting = true;
                app.quit();
            } else if (result.response === 1) {
                if (result.checkboxChecked) fnConfig.setExitMode('minimize');
                win.hide();
                showTrayNotification();
            }
        });
    } else if (exitMode === 'minimize') {
        win.hide();
        showTrayNotification();
    } else {
        (app as any).isQuiting = true;
        app.quit();
    }
}

function showMacNotification(): void {
    if (!getTrayNotificationShown() && Notification.isSupported()) {
        new Notification({
            title: '飞牛影视',
            body: '应用已隐藏到状态栏',
            silent: false
        }).show();
        setTrayNotificationShown(true);
    }
}

app.on('before-quit', async () => {
    (app as any).isQuiting = true;
    try {
        await shutdownProxyProcess();
    } catch (error) {
        log.error('关闭 proxy 进程出错:', error);
    }
    destroyTray();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = getMainWindow();
        setupWindowEvents(mainWindow);
    } else if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
    }
    app.dock?.show();
});
