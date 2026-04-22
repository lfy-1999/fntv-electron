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
    // 样式：高度为0，背景透明，完全悬浮在内容之上
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
        pointer-events: none; /* 让横栏背景不挡鼠标 */
    `;

    bar.innerHTML = `
        <div id="titlebar-btns" style="-webkit-app-region:no-drag; display:flex; gap:2px; padding-right:4px; pointer-events: auto;">
            <!-- 最小化按钮 -->
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
            
            <!-- 切换全屏/还原 按钮 -->
            <button id="max-btn" style="
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
                <!-- 默认显示最大化图标（正方形） -->
                <svg id="icon-max" width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="#888" stroke-width="1.5"/>
                </svg>
                <!-- 默认隐藏还原图标（重叠方块） -->
                <svg id="icon-restore" width="12" height="12" viewBox="0 0 16 16" fill="none" style="display:none;">
                    <path d="M5 5H11V11H5V5Z" stroke="#888" stroke-width="1.5"/>
                    <path d="M3 8V13H8" stroke="#888" stroke-width="1.5"/>
                </svg>
            </button>

            <!-- 关闭按钮 -->
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

    // 防止双重滚动条
    document.documentElement.style.overflowY = 'hidden';
    document.body.appendChild(bar);

    // 按钮交互效果
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

    // 绑定功能
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
            // 发送切换指令
            ipcRenderer.send('window-maximize');
            // 立即切换图标（视觉反馈）
            toggleIcon();
        });
    }

    // 切换图标函数
    function toggleIcon() {
        const maxIcon = document.getElementById('icon-max');
        const restoreIcon = document.getElementById('icon-restore');
        if (maxIcon && restoreIcon) {
            const isMax = maxIcon.style.display !== 'none';
            if (isMax) {
                maxIcon.style.display = 'none';
                restoreIcon.style.display = 'block';
            } else {
                maxIcon.style.display = 'block';
                restoreIcon.style.display = 'none';
            }
        }
    }
}

registerHook(HookType.OnReady, injectTitleBar);

export {};
