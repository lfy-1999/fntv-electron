import { app, BrowserWindow, dialog, Notification } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { registerAllPlugins } from './handlers';
import { getInstance as getUpdateChecker } from '../modules/updater/updateChecker';
import * as winctrl from './common/winctrl';
import { createTray, showTrayNotification, destroyTray } from './common/tray';
import { getMacCloseAction, setMacCloseAction, getTrayNotificationShown, setTrayNotificationShown } from './common/preferences';
import * as fnConfig from '../modules/fn_config/config';
import * as log from '../modules/logger';
import { getMainWindow } from './common/mainwin';
import { isTrusted } from '../modules/cert_trust';
import { startProxyProcess, shutdownProxyProcess } from './common/proxy';

app.commandLine.appendSwitch('--lang', 'en-US');
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');

app.commandLine.appendSwitch('--log-level', '3');
app.commandLine.appendSwitch('--disable-logging');
app.commandLine.appendSwitch('--silent');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--ignore-ssl-errors-spki-list');
app.commandLine.appendSwitch('--ignore-ssl-errors');

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
            log.info('应用版本:', app.getVersion());
            log.info('Electron版本:', process.versions.electron);
            log.info('Node.js版本:', process.versions.node);
            log.info('日志文件位置:', log.getLogFile());

            app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
                if (isTrusted(url)) {
                    event.preventDefault();
                    callback(true);
                } else {
                    log.warn(`证书验证错误: ${url}, 错误: ${error}`);
                    callback(false);
                }
            });

            proxyProcess = await startProxyProcess();

            mainWindow = getMainWindow();

            registerAllPlugins();

            await createTray(mainWindow);

            setupWindowEvents(mainWindow);

            winctrl.setupFullScreenToggle(mainWindow);

            winctrl.setupInputMethodDisable(mainWindow);

            winctrl.setupWindowShowEvents(mainWindow);

            await winctrl.setupCookieRestore(mainWindow);

            setTimeout(() => {
                getUpdateChecker().autoCheckForUpdates().catch((error: Error) => {
                    log.error('启动时自动检查更新失败:', error);
                });
            }, 3000);
        } catch (error) {
            log.error('应用启动失败:', error);
            app.quit();
        }
    });
}

function setupWindowEvents(mainWindow: BrowserWindow): void {
    if (mainWindow) {
        mainWindow.on('close', async (event) => {
            if (!(app as any).isQuiting) {
                event.preventDefault();

                if (process.platform === 'darwin') {
                    const action = getMacCloseAction();

                    if (action === 'ask') {
                        const result = await dialog.showMessageBox(mainWindow, {
                            type: 'question',
                            title: '关闭窗口',
                            message: '您希望如何处理窗口关闭？',
                            detail: '在 macOS 上，您可以选择隐藏到状态栏或完全退出应用。',
                            buttons: ['隐藏到状态栏', '退出应用', '取消'],
                            defaultId: 0,
                            cancelId: 2,
                            checkboxLabel: '记住我的选择',
                            checkboxChecked: false
                        });

                        if (result.response === 0) {
                            if (result.checkboxChecked) {
                                setMacCloseAction('minimize');
                            }
                            if (mainWindow.isFullScreen()) {
                                mainWindow.setFullScreen(false);
                            }
                            mainWindow.hide();
                            app.dock?.hide();
                            showMacNotification();
                        } else if (result.response === 1) {
                            if (result.checkboxChecked) {
                                setMacCloseAction('quit');
                            }
                            (app as any).isQuiting = true;
                            app.quit();
                        }
                    } else if (action === 'minimize') {
                        if (mainWindow.isFullScreen()) {
                            mainWindow.setFullScreen(false);
                        }
                        mainWindow.hide();
                        app.dock?.hide();
                        showMacNotification();
                    } else if (action === 'quit') {
                        (app as any).isQuiting = true;
                        app.quit();
                    }
                } else {
                    const exitMode = fnConfig.getExitMode();

                    if (exitMode === 'ask') {
                        const result = await dialog.showMessageBox(mainWindow, {
                            type: 'question',
                            title: '退出确认',
                            message: '确定要退出飞牛影视吗？',
                            detail: '您可以选择完全退出应用或最小化到托盘。',
                            buttons: ['退出应用', '最小化到托盘', '取消'],
                            defaultId: 1,
                            cancelId: 2,
                            checkboxLabel: '记住我的选择',
                            checkboxChecked: false
                        });

                        if (result.response === 0) {
                            if (result.checkboxChecked) {
                                fnConfig.setExitMode('direct');
                            }
                            (app as any).isQuiting = true;
                            app.quit();
                        } else if (result.response === 1) {
                            if (result.checkboxChecked) {
                                fnConfig.setExitMode('minimize');
                            }
                            if (mainWindow.isFullScreen()) {
                                mainWindow.setFullScreen(false);
                            }
                            mainWindow.hide();
                            showTrayNotification();
                        }
                    } else if (exitMode === 'minimize') {
                        if (mainWindow.isFullScreen()) {
                            mainWindow.setFullScreen(false);
                        }
                        mainWindow.hide();
                        showTrayNotification();
                    } else {
                        (app as any).isQuiting = true;
                        app.quit();
                    }
                }
            }
        });
    }
}

function showMacNotification(): void {
    if (!getTrayNotificationShown()) {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: '飞牛影视',
                body: '应用已隐藏到状态栏，点击状态栏图标可以恢复窗口',
                silent: false
            });
            notification.show();
        }
        setTrayNotificationShown(true);
    }
}

app.on('before-quit', async () => {
    (app as any).isQuiting = true;

    log.info('应用退出前关闭proxy进程');
    try {
        await shutdownProxyProcess();
    } catch (error) {
        log.error('关闭proxy进程出错:', error);
    }

    destroyTray();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (process.platform === 'darwin') {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = getMainWindow();
            setupWindowEvents(mainWindow);
        } else if (mainWindow) {
            if (!mainWindow.isVisible()) {
                mainWindow.show();
            }
            mainWindow.focus();
        }

        app.dock?.show();
    }
});
