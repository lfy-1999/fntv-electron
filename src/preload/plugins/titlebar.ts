import { ipcRenderer } from 'electron';
import { registerHook } from '../core/hooks';
import { HookType } from '../core/hooks';
import logger from '../core/logger';

function injectTitleBar(): void {
    logger.info('Injecting custom title bar...');
    if (document.getElementById('custom-titlebar')) return;

    const bar = document.createElement('div');
    bar.id = 'custom-titlebar';
    // 【修改】背景设为透明，去除白色/毛玻璃背景
    bar.style.cssText = `
        height: 32px; width: 100vw; background: transparent !important;
        -webkit-app-region: drag; position: fixed; top: 0; left: 0;
        z-index: 999999; display: flex; justify-content: flex-end;
        align-items: center; pointer-events: none;
    `;

    bar.innerHTML = `
        <div id="titlebar-btns" style="-webkit-app-region: no-drag; display: flex; gap: 2px; padding-right: 4px; pointer-events: auto;">
            <button id="min-btn" style="background:transparent; border:none; width:46px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 16 16"><path d="M2 8H14" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <button id="max-btn" style="background:transparent; border:none; width:46px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <!-- 全屏图标 -->
                <svg id="icon-full" width="12" height="12" viewBox="0 0 16 16">
                    <path d="M3 5V3H5M13 3V5H11M13 11V13H11M5 13H3V11" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <!-- 还原图标 (默认隐藏) -->
                <svg id="icon-restore" width="12" height="12" viewBox="0 0 16 16" style="display:none;">
                    <path d="M4 4H12V12H4V4Z" stroke="#fff" stroke-width="1.5"/>
                    <path d="M2 7V14H9" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
            <button id="close-btn" style="background:transparent; border:none; width:46px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4L12 12M12 4L4 12" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
        </div>
    `;

    document.documentElement.style.overflowY = 'hidden';
    document.body.appendChild(bar);

    // --- 按钮交互 ---
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');
    const iconFull = document.getElementById('icon-full');
    const iconRestore = document.getElementById('icon-restore');

    // 最小化
    minBtn?.addEventListener('click', () => ipcRenderer.send('window-minimize'));
    // 关闭
    closeBtn?.addEventListener('click', () => ipcRenderer.send('window-close'));

    // 全屏/还原切换
    maxBtn?.addEventListener('click', () => ipcRenderer.send('window-maximize'));

    // 悬停效果 (白色文字，关闭键红色背景)
    const btns = [minBtn, maxBtn, closeBtn];
    btns.forEach(btn => {
        btn?.addEventListener('mouseenter', function() {
            if (this === closeBtn) {
                (this as HTMLElement).style.background = 'rgba(232, 17, 35, 0.8)';
            } else {
                (this as HTMLElement).style.background = 'rgba(255, 255, 255, 0.2)';
            }
        });
        btn?.addEventListener('mouseleave', function() {
            (this as HTMLElement).style.background = 'transparent';
        });
    });

    // --- 状态同步 ---
    // 监听主进程发来的状态更新
    ipcRenderer.on('window-state-changed', (event, isFullScreen: boolean) => {
        if (isFullScreen) {
            // 当前是全屏状态，按钮应显示“还原”
            if (iconFull) iconFull.style.display = 'none';
            if (iconRestore) iconRestore.style.display = 'block';
        } else {
            // 当前是窗口状态，按钮应显示“全屏”
            if (iconFull) iconFull.style.display = 'block';
            if (iconRestore) iconRestore.style.display = 'none';
        }
    });
}

registerHook(HookType.OnReady, injectTitleBar);
export {};
