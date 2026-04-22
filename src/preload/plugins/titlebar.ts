// preload/plugins/titlebar.ts
import { ipcRenderer } from 'electron';
import { registerHook } from '../core/hooks';
import { HookType } from '../core/hooks';
import logger from '../core/logger';

function injectTitleBar(): void {
    logger.info('Injecting custom title bar...');
    if (document.getElementById('custom-titlebar')) return;

    const bar = document.createElement('div');
    bar.id = 'custom-titlebar';
    // 核心样式：高度0，透明，悬浮
    bar.style.cssText = `
        height:0px;
        width:100vw;
        background:transparent !important;
        -webkit-app-region:drag;
        position:fixed;
        top:0;
        left:0;
        z-index:99999;
        display:flex;
        justify-content:flex-end;
        align-items:center;
        pointer-events: none;
    `;

    // 修改点：容器增加 overflow: visible，防止图标被裁切
    bar.innerHTML = `
        <div id="titlebar-btns" style="-webkit-app-region:no-drag; display:flex; gap:2px; padding-right:4px; pointer-events: auto; overflow: visible;">
            <!-- 最小化 -->
            <button id="min-btn" style="
                background:transparent; border:none; width:34px; height:32px;
                display:flex; align-items:center; justify-content:center;
                cursor:pointer; border-radius:4px; transition:all 0.2s ease;
                overflow: visible;
            ">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8H14" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
            
            <!-- 切换全屏 -->
            <button id="max-btn" style="
                background:transparent; border:none; width:34px; height:32px;
                display:flex; align-items:center; justify-content:center;
                cursor:pointer; border-radius:4px; transition:all 0.2s ease;
                overflow: visible;
            ">
                <!-- 最大化图标 (默认显示) -->
                <svg id="icon-max" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="#888" stroke-width="1.5"/>
                </svg>
                <!-- 还原图标 (默认隐藏) -->
                <svg id="icon-restore" width="12" height="12" viewBox="0 0 16 16" fill="none" style="display:none;">
                    <path d="M5 5H11V11H5V5Z" stroke="#888" stroke-width="1.5"/>
                    <path d="M3 8V13H8" stroke="#888" stroke-width="1.5"/>
                </svg>
            </button>

            <!-- 关闭 -->
            <button id="close-btn" style="
                background:transparent; border:none; width:34px; height:32px;
                display:flex; align-items:center; justify-content:center;
                cursor:pointer; border-radius:4px; transition:all 0.2s ease;
                overflow: visible;
            ">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    document.documentElement.style.overflowY = 'hidden';
    document.body.appendChild(bar);

    // 按钮交互
    const buttonIds: string[] = ['min-btn', 'max-btn', 'close-btn'];
    buttonIds.forEach((id: string) => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        if (!btn) return;
        
        btn.addEventListener('mouseenter', () => {
            if (id === 'close-btn') {
                btn.style.background = 'rgba(232, 17, 35, 0.2)';
                const path = btn.querySelector('path') as SVGPathElement;
                if (path) path.style.stroke = '#fff';
            } else {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                const svg = btn.querySelector('path, rect') as SVGElement;
                if (svg) svg.style.stroke = '#fff';
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
            const svg = btn.querySelector('path, rect') as SVGElement;
            if (svg) svg.style.stroke = '#888';
        });
    });

    // 功能绑定
    const minBtn = document.getElementById('min-btn');
    const maxBtn = document.getElementById('max-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minBtn) {
        minBtn.addEventListener('click', () => ipcRenderer.send('window-minimize'));
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => ipcRenderer.send('window-close'));
    }

    if (maxBtn) {
        maxBtn.addEventListener('click', () => {
            // 只发送信号，不立即切换图标
            ipcRenderer.send('window-maximize');
        });
    }

    // 【核心修改】监听主进程发来的状态更新
    // 只有收到主进程的确认，才切换图标，保证状态绝对同步
    ipcRenderer.on('window-state-changed', (event, isFullScreen: boolean) => {
        const maxIcon = document.getElementById('icon-max') as HTMLElement;
        const restoreIcon = document.getElementById('icon-restore') as HTMLElement;
        
        if (maxIcon && restoreIcon) {
            if (isFullScreen) {
                // 如果是全屏状态，显示“还原”图标
                maxIcon.style.display = 'none';
                restoreIcon.style.display = 'block';
            } else {
                // 如果是窗口状态，显示“最大化”图标
                maxIcon.style.display = 'block';
                restoreIcon.style.display = 'none';
            }
        }
    });
}

registerHook(HookType.OnReady, injectTitleBar);

export {};
