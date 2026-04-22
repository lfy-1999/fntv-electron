import { ipcRenderer } from 'electron';
import { registerHook } from '../core/hooks';
import { HookType } from '../core/hooks';
import logger from '../core/logger';

function injectTitleBar(): void {
    logger.info('Injecting custom title bar...');
    if (document.getElementById('custom-titlebar')) return;

    const bar = document.createElement('div');
    bar.id = 'custom-titlebar';
    // 样式：透明背景，靠右对齐，支持拖拽
    bar.style.cssText = `
        height: 32px; width: 100vw; background: transparent !important;
        -webkit-app-region: drag; position: fixed; top: 0; left: 0;
        z-index: 999999; display: flex; justify-content: flex-end;
        align-items: center; pointer-events: none;
    `;

    // HTML：三个按钮
    bar.innerHTML = `
        <div id="titlebar-btns" style="-webkit-app-region: no-drag; display: flex; padding-right: 4px; pointer-events: auto;">
            <!-- 最小化 -->
            <button id="min-btn" style="background:transparent; border:none; width:46px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <svg width="10" height="2" viewBox="0 0 10 2"><path d="M0 1H10" stroke="#fff" stroke-width="2"/></svg>
            </button>
            <!-- 全屏/还原 -->
            <button id="full-btn" style="background:transparent; border:none; width:46px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <!-- 默认显示最大化图标 -->
                <svg id="icon-max" width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" stroke="#fff" stroke-width="1.5" fill="none"/></svg>
                <!-- 默认隐藏还原图标 -->
                <svg id="icon-restore" width="10" height="10" viewBox="0 0 10 10" style="display:none"><path d="M2 4V2h6v6H6" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M8 6v2H2V2h2" stroke="#fff" stroke-width="1.5" fill="none"/></svg>
            </button>
            <!-- 关闭 -->
            <button id="close-btn" style="background:transparent; border:none; width:46px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4L12 12M12 4L4 12" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
        </div>
    `;

    document.documentElement.style.overflowY = 'hidden';
    document.body.appendChild(bar);

    // --- 按钮逻辑 ---
    const minBtn = document.getElementById('min-btn');
    const fullBtn = document.getElementById('full-btn');
    const closeBtn = document.getElementById('close-btn');
    const iconMax = document.getElementById('icon-max');
    const iconRestore = document.getElementById('icon-restore');

    // 1. 最小化
    minBtn?.addEventListener('click', () => ipcRenderer.send('window-minimize'));

    // 2. 全屏/还原切换
    fullBtn?.addEventListener('click', () => ipcRenderer.send('window-maximize'));

    // 3. 关闭
    closeBtn?.addEventListener('click', () => ipcRenderer.send('window-close'));
    closeBtn?.addEventListener('mouseenter', function() { (this as HTMLElement).style.background = 'rgba(232, 17, 35, 0.8)'; });
    closeBtn?.addEventListener('mouseleave', function() { (this as HTMLElement).style.background = 'transparent'; });

    // --- 监听状态变化，切换图标 ---
    ipcRenderer.on('window-state-changed', (event, isFullScreen) => {
        if (isFullScreen) {
            // 当前是全屏，显示"还原"图标
            if (iconMax) iconMax.style.display = 'none';
            if (iconRestore) iconRestore.style.display = 'block';
        } else {
            // 当前是窗口，显示"最大化"图标
            if (iconMax) iconMax.style.display = 'block';
            if (iconRestore) iconRestore.style.display = 'none';
        }
    });
}

registerHook(HookType.OnReady, injectTitleBar);
export {};
