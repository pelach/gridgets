import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {
    resolveWidgetForegroundColor,
    resolveExplicitFontFamily,
    cssColorToRgba,
    isDarkBackgroundColor,
    resolveWidgetBackgroundColor,
} from '../../utils/widgetUtils.js';
import { createWidgetContainer, registerWidgetCleanup } from '../../shell/widgetUIUtils.js';

const BASE_CONTAINER_WIDTH_PX = 240;
const BASE_CONTAINER_HEIGHT_PX = 200;
const BORDER_ALPHA = 0.14;
const CARD_BG_DARK_ALPHA = 0.05;
const CARD_BG_LIGHT_ALPHA = 0.04;
const CARD_BORDER_DARK_ALPHA = 0.06;
const CARD_BORDER_LIGHT_ALPHA = 0.10;
const LABEL_OPACITY = 0.65;

function getDeviceMeta(rawType, name) {
    const lowerName = (name || '').toLowerCase();
    const lowerType = (rawType || '').toLowerCase();

    if (lowerType.includes('battery') || lowerName.includes('primary') || lowerName.includes('laptop')) {
        return { icon: 'laptop-symbolic', defaultName: 'This PC' };
    }
    if (lowerType.includes('headset') || lowerType.includes('headphone') || lowerName.includes('nc60')) {
        return { icon: 'audio-headset-symbolic', defaultName: 'Headphones' };
    }
    if (lowerType.includes('mouse') || lowerName.includes('mouse')) {
        return { icon: 'input-mouse-symbolic', defaultName: 'Mouse' };
    }
    if (lowerType.includes('keyboard') || lowerName.includes('keyboard')) {
        return { icon: 'input-keyboard-symbolic', defaultName: 'Keyboard' };
    }
    return { icon: 'battery-symbolic', defaultName: 'Wireless Device' };
}

function getBatteryLevelIcon(percentage, isCharging) {
    if (isCharging) return 'battery-charging-symbolic';
    if (percentage >= 90) return 'battery-level-100-symbolic';
    if (percentage >= 70) return 'battery-level-80-symbolic';
    if (percentage >= 50) return 'battery-level-60-symbolic';
    if (percentage >= 30) return 'battery-level-30-symbolic';
    if (percentage >= 10) return 'battery-level-10-symbolic';
    return 'battery-level-0-symbolic';
}

export function createBatteryStatusNode(config, width, height, xPosition, yPosition) {
    const fontFamily = resolveExplicitFontFamily(config);
    const fontCss = fontFamily ? `font-family: ${fontFamily}; ` : '';
    const textColor = resolveWidgetForegroundColor(config);
    const container = createWidgetContainer(config, width, height, xPosition, yPosition);
    container.style += ` border: 1px solid ${cssColorToRgba(textColor, BORDER_ALPHA)};`;

    const scale = Math.max(0.65, Math.min(width / BASE_CONTAINER_WIDTH_PX, height / BASE_CONTAINER_HEIGHT_PX));
    
    // Kisebb betűk és kártyaméretek kis nézetnél:
    const cardPadding = Math.max(4, Math.round(6 * scale));
    const cardRadius = Math.max(6, Math.round(10 * scale));
    const titleFontSize = Math.max(11, Math.round(13 * scale));
    const deviceFontSize = Math.max(10, Math.round(12 * scale));
    const percentFontSize = Math.max(11, Math.round(13 * scale));
    const subFontSize = Math.max(9, Math.round(10 * scale));
    const iconSize = Math.max(16, Math.round(20 * scale));
    const miniIconSize = Math.max(12, Math.round(14 * scale));

    const isDarkSurface = isDarkBackgroundColor(resolveWidgetBackgroundColor(config));
    const cardBg = cssColorToRgba(textColor, isDarkSurface ? CARD_BG_DARK_ALPHA : CARD_BG_LIGHT_ALPHA);
    const cardBorderAlpha = isDarkSurface ? CARD_BORDER_DARK_ALPHA : CARD_BORDER_LIGHT_ALPHA;
    const itemCardStyle = `background-color: ${cardBg}; border: 1px solid ${cssColorToRgba(textColor, cardBorderAlpha)}; border-radius: ${cardRadius}px; padding: ${cardPadding}px;`;

    const contentBox = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
        y_expand: true,
        style: `padding: ${Math.max(6, Math.round(8 * scale))}px; spacing: ${Math.max(4, Math.round(6 * scale))}px;`,
    });

    const headerBox = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        x_expand: true,
        style: `margin-bottom: ${Math.round(4 * scale)}px;`,
    });
    const headerIcon = new St.Icon({
        icon_name: 'battery-level-100-charged-symbolic',
        icon_size: Math.round(16 * scale),
        style: `color: ${textColor}; margin-right: 6px;`,
        y_align: Clutter.ActorAlign.CENTER,
    });
    const headerLabel = new St.Label({
        text: 'Battery Status',
        style: `${fontCss}color: ${textColor}; font-size: ${titleFontSize}px; font-weight: bold; opacity: 0.9;`,
        y_align: Clutter.ActorAlign.CENTER,
    });
    headerBox.add_child(headerIcon);
    headerBox.add_child(headerLabel);
    contentBox.add_child(headerBox);

    const listContainer = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
        y_expand: true,
        style: `spacing: ${Math.round(6 * scale)}px;`,
    });
    contentBox.add_child(listContainer);
    container.add_child(contentBox);

    let isDisposed = false;

    const renderDeviceRow = (data) => {
        const row = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style: itemCardStyle,
        });

        const leftIcon = new St.Icon({
            icon_name: data.iconName,
            icon_size: iconSize,
            style: `color: ${textColor}; opacity: 0.85; margin-right: ${Math.round(8 * scale)}px;`,
            y_align: Clutter.ActorAlign.CENTER,
        });
        row.add_child(leftIcon);

        const nameBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const nameLabel = new St.Label({
            text: data.name,
            style: `${fontCss}color: ${textColor}; font-size: ${deviceFontSize}px; font-weight: 500;`,
        });
        const subLabel = new St.Label({
            text: data.subtext,
            style: `${fontCss}color: ${textColor}; font-size: ${subFontSize}px; opacity: ${LABEL_OPACITY};`,
        });
        nameBox.add_child(nameLabel);
        nameBox.add_child(subLabel);
        row.add_child(nameBox);

        const rightBox = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
            style: `spacing: 4px;`,
        });
        const percentLabel = new St.Label({
            text: `${data.percentage}%`,
            style: `${fontCss}color: ${textColor}; font-size: ${percentFontSize}px; font-weight: bold;`,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const miniBatteryIcon = new St.Icon({
            icon_name: getBatteryLevelIcon(data.percentage, data.isCharging),
            icon_size: miniIconSize,
            style: `color: ${textColor}; opacity: 0.8;`,
            y_align: Clutter.ActorAlign.CENTER,
        });
        rightBox.add_child(percentLabel);
        rightBox.add_child(miniBatteryIcon);
        row.add_child(rightBox);

        return row;
    };

    const parseAndRender = (output) => {
        if (isDisposed) return;
        listContainer.destroy_all_children();

        const devices = [];
        const blocks = output.split(/Device:\s+/).filter(Boolean);

        for (const block of blocks) {
            const firstLine = block.split('\n')[0] || '';
            if (firstLine.includes('line_power') || firstLine.includes('DisplayDevice')) continue;

            const modelMatch = block.match(/model:\s+(.+)/i);
            const percentageMatch = block.match(/percentage:\s+([0-9]+)%/i);
            const stateMatch = block.match(/state:\s+([a-zA-Z-]+)/i);

            // Csak a percentage megléte kötelező!
            if (!percentageMatch) continue;

            const percentage = parseInt(percentageMatch[1], 10);
            const rawModel = modelMatch ? modelMatch[1].trim() : '';
            const rawState = stateMatch ? stateMatch[1].trim().toLowerCase() : '';

            const isCharging = rawState.includes('charging') && !rawState.includes('discharging');
            const meta = getDeviceMeta(firstLine, rawModel);

            let displayName = rawModel;
            if (!displayName || displayName === 'Primary') {
                displayName = meta.defaultName;
            }

            let subtext = 'Connected';
            if (meta.defaultName === 'This PC') {
                subtext = isCharging ? 'Charging' : (rawState.includes('discharging') ? 'Discharging' : 'Connected');
            }

            devices.push({
                isPc: meta.defaultName === 'This PC',
                name: displayName,
                iconName: meta.icon,
                percentage,
                isCharging,
                subtext,
            });
        }

        devices.sort((a, b) => (a.isPc ? -1 : 1));

        if (devices.length === 0) {
            const emptyLabel = new St.Label({
                text: 'No battery devices detected',
                style: `${fontCss}color: ${textColor}; font-size: ${deviceFontSize}px; opacity: ${LABEL_OPACITY};`,
                y_align: Clutter.ActorAlign.CENTER,
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
            });
            listContainer.add_child(emptyLabel);
            return;
        }

        devices.forEach(d => listContainer.add_child(renderDeviceRow(d)));
    };

    const refreshData = () => {
        try {
            const proc = new Gio.Subprocess({
                argv: ['upower', '-d'],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
            });
            proc.init(null);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, stdout] = p.communicate_utf8_finish(res);
                    if (stdout) parseAndRender(stdout);
                } catch (e) {
                    // Ignore
                }
            });
        } catch (err) {
            // Ignore
        }
    };

    // Első frissítés
    refreshData();

    // 10 másodpercenként csendes frissítés a háttérben
    const timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10, () => {
        if (isDisposed) return GLib.SOURCE_REMOVE;
        refreshData();
        return GLib.SOURCE_CONTINUE;
    });

    registerWidgetCleanup(container, () => {
        isDisposed = true;
        if (timeoutId) GLib.source_remove(timeoutId);
    });

    return container;
}