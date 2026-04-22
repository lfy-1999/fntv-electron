import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as winctrl from './common/winctrl';
import { getMainWindow } from './common/mainwin';
// ... 其他 import 保持不变 ...

let mainWindow: BrowserWindow | null = null;
// ... 其他变量 ...

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
            // ... 证书、代理等初始化代码保持不变 ...

            // 创建窗口
            mainWindow = getMainWindow();

            // ... 插件、托盘等初始化代码保持不变 ...

            // 窗口事件
            setupWindowEvents(mainWindow);

            // F11 全屏切换
            winctrl.setupFullScreenToggle(mainWindow);

            // 禁用输入法
            winctrl.setupInputMethodDisable(mainWindow);

            // 窗口显示
            winctrl.setupWindowShowEvents(mainWindow);

            // 恢复 Cookie
            await winctrl.setupCookieRestore(mainWindow);

            // --- 【修改】IPC 通信监听 ---

            // 1. 最小化
            ipcMain.on('window-minimize', () => {
                mainWindow?.minimize();
            });

            // 2. 全屏/还原切换 (原 window-maximize)
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

            // --- 【修改】状态同步 (用于切换标题栏图标) ---
            mainWindow.on('enter-full-screen', () => {
                mainWindow?.webContents.send('window-state-changed', true);
            });
            mainWindow.on('leave-full-screen', () => {
                mainWindow?.webContents.send('window-state-changed', false);
            });

            // ... 自动更新等后续代码保持不变 ...

        } catch (error) {
            // ... 错误处理 ...
        }
    });
}

// ... setupWindowEvents, handleMacClose 等函数保持不变 ...
function setupWindowEvents(mainWindow: BrowserWindow): void {
    if (mainWindow) {
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
}

// ... 其他 handle 函数保持不变 ...
