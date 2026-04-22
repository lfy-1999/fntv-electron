// preload/plugins/titlebar.ts
import { ipcRenderer } from 'electron';
import { registerHook } from '../core/hooks';
import { HookType } from '../core/hooks';
import logger from '../core/logger';

function injectTitleBar(): void {
    logger.info('Injecting custom title bar...');
    if (document.getElementById('custom-titlebar')) return;

    // 1. 全宽透明拖拽层（不可见，仅用于拖拽窗口）
    const dragBar = document.createElement('div');
    dragBar.id = 'custom-titlebar';
    dragBar.style.cssText = `
        height:32px;
        width:100vw;
        background:transparent;
        -webkit-app-region:drag;
        position:fixed;
        top:0;
        left:0;
        z-index:99998;
    `;

    // 2. 按钮容器（固定右上角，悬浮在页面上方）
    const btnContainer = document.createElement('div');
    btnContainer.id = 'titlebar-btns';
    btnContainer.style.cssText = `
        -webkit-app-region:no-drag;
        position:fixed;
        top:0;
        right:0;
        display:flex;
        gap:2px;
        padding-right:4px;
        z-index:99999;
    `;

    btnContainer.innerHTML = `
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
                <path d="M2 6V2H6M10 2H14V6M14 10V14H10M6 14H2V10" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
    `;

    document.documentElement.style.overflowY = 'hidden';
    document.body.appendChild(dragBar);
    document.body.appendChild(btnContainer);

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
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
                const svgElement = btn.querySelector('path') as SVGPathElement;
                if (svgElement) svgElement.style.stroke = '#fff';
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
            const svgElement = btn.querySelector('path') as SVGPathElement;
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

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            ipcRenderer.send('window-fullscreen-toggle');
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
