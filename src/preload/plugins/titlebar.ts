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
    // 完全透明背景，只保留拖拽区域和按钮
    bar.style.cssText = `
        height:32px;
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
        pointer-events:none; /* 让穿透事件到下方，但按钮区域会单独设置 */
    `;

    // 只保留最小化、全屏、关闭三个按钮
    bar.innerHTML = `
        <div id="titlebar-btns" style="-webkit-app-region:no-drag; display:flex; gap:2px; padding-right:4px; pointer-events:auto;">
            <button id="min-btn" style="
                background:transparent; 
                border:none; 
                width:34px;
                height:32px;
                display:flex;
                align-items:center;
                justify-content:center;
                cursor:pointer;
                border-radius:4px;
                transition:all 0.2s ease;
            ">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8H14" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
            <button id="fullscreen-btn" style="
                background:transparent; 
                border:none; 
                width:34px;
                height:32px;
                display:flex;
                align-items:center;
                justify-content:center;
                cursor:pointer;
                border-radius:4px;
                transition:all 0.2s ease;
            ">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <button id="close-btn" style="
                background:transparent; 
                border:none; 
                width:34px;
                height:32px;
                display:flex;
                align-items:center;
                justify-content:center;
                cursor:pointer;
                border-radius:4px;
                transition:all 0.2s ease;
            ">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4L12 12M12 4L4 12" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;

    // 不添加body顶部内边距，全屏模式下不需要
    // 防止出现双重滚动条
    document.documentElement.style.overflowY = 'hidden';
    document.body.appendChild(bar);

    // 按钮交互效果
    const buttonIds: string[] = ['min-btn', 'fullscreen-btn', 'close-btn'];
    buttonIds.forEach((id: string) => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        if (!btn) return;

        btn.addEventListener('mouseenter', () => {
            if (id === 'close-btn') {
                btn.style.background = 'rgba(232, 17, 35, 0.2)';
                const pathElement = btn.querySelector('path') as SVGPathElement;
                if (pathElement) pathElement.style.stroke = '#fff';
            } else {
                btn.style.background = 'rgba(0, 0, 0, 0.06)';
                const svgElement = btn.querySelector('path') as SVGElement;
                if (svgElement) svgElement.style.stroke = '#fff';
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
            const svgElement = btn.querySelector('path') as SVGElement;
            if (svgElement) svgElement.style.stroke = '#888';
        });
    });

    // 窗口控制功能
    const minBtn = document.getElementById('min-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const closeBtn = document.getElementById('close-btn');

    if (minBtn) {
        minBtn.addEventListener('click', () => {
            ipcRenderer.send('window-minimize');
        });
    }

    // 全屏按钮：切换真全屏状态
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            ipcRenderer.send('window-toggle-fullscreen');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.send('window-close');
        });
    }
}

registerHook(HookType.OnReady, injectTitleBar);

export {};
