import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {
    buildFontCss,
    configureWrappingLabel,
    createFallbackIcon,
    HOURLY_FORECAST_COUNT,
} from './weatherCommon.js';
import { isActorDestroyed, watchActorLifecycle } from '../../utils/actorLifecycle.js';

const FORECAST_DAYS_COUNT = 5;

export function buildForecastLayout(layout, widgetData, extensionPath) {
    const fontCss = buildFontCss(widgetData);
    const fallbackIcon = createFallbackIcon(extensionPath);

    // Fő belső függőleges doboz
    const mainBox = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
        y_expand: true,
    });

    // ── 1. FELSŐ FEJRÉSZ ──
    const topRow = new St.BoxLayout({
        x_expand: true,
        y_expand: false,
    });

    const leftCol = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
    });

    const cityLabel = new St.Label({
        text: widgetData.location || 'London',
        style: `${fontCss}font-size: 14px; font-weight: bold;`,
    });
    configureWrappingLabel(cityLabel);

    const tempLabel = new St.Label({
        text: '--°',
        style: `${fontCss}font-size: 26px; font-weight: 200;`,
    });

    leftCol.add_child(cityLabel);
    leftCol.add_child(tempLabel);

    const rightCol = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_align: Clutter.ActorAlign.END,
    });

    const conditionIcon = new St.Icon({
        gicon: fallbackIcon,
        icon_size: 24,
        x_align: Clutter.ActorAlign.END,
    });

    const conditionLabel = new St.Label({
        text: '',
        style: `${fontCss}font-size: 10px; text-align: right;`,
    });

    const highLowLabel = new St.Label({
        text: '',
        style: `${fontCss}font-size: 9px; text-align: right; opacity: 0.8;`,
    });

    rightCol.add_child(conditionIcon);
    rightCol.add_child(conditionLabel);
    rightCol.add_child(highLowLabel);

    topRow.add_child(leftCol);
    topRow.add_child(rightCol);
    mainBox.add_child(topRow);

    // ── 2. ÓRÁS ELŐREJELZÉS ──
    const hourlyRow = new St.BoxLayout({
        x_expand: true,
        y_expand: false,
        style: 'margin-top: 4px; margin-bottom: 6px;',
    });

    const hourlyActors = [];
    for (let i = 0; i < HOURLY_FORECAST_COUNT; i++) {
        const col = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });

        const timeLbl = new St.Label({
            text: '--',
            style: `${fontCss}font-size: 9px; opacity: 0.85;`,
        });

        const icon = new St.Icon({
            gicon: fallbackIcon,
            icon_size: 15,
            style: 'margin-top: 1px; margin-bottom: 1px;',
        });

        const tempLbl = new St.Label({
            text: '--°',
            style: `${fontCss}font-size: 10px; font-weight: bold;`,
        });

        col.add_child(timeLbl);
        col.add_child(icon);
        col.add_child(tempLbl);
        hourlyRow.add_child(col);

        hourlyActors.push({ col, timeLbl, icon, tempLbl });
    }
    mainBox.add_child(hourlyRow);

    // ── 3. NAPI SÁVOS ELŐREJELZÉS ──
    const dailyContainer = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
        y_expand: true,
    });

    const dailyActors = [];
    for (let i = 0; i < FORECAST_DAYS_COUNT; i++) {
        const row = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const dayLabel = new St.Label({
            text: '---',
            style: `${fontCss}font-size: 10px; font-weight: bold; min-width: 38px;`,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const icon = new St.Icon({
            gicon: fallbackIcon,
            icon_size: 14,
            style: 'margin-right: 4px;',
            y_align: Clutter.ActorAlign.CENTER,
        });

        const minLabel = new St.Label({
            text: '--°',
            style: `${fontCss}font-size: 10px; min-width: 24px; text-align: right; margin-right: 4px;`,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const barContainer = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const barBg = new St.Widget({
            style: 'background-color: rgba(255, 255, 255, 0.2); height: 6px; border-radius: 3px;',
            x_expand: true,
            height: 6,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const activeBar = new St.Widget({
            style: 'background-gradient-direction: horizontal; background-gradient-start: #ffcc00; background-gradient-end: #ff7744; height: 6px; border-radius: 3px;',
            height: 6,
            x: 0,
            y: 0,
        });

        barBg.add_child(activeBar);
        barContainer.add_child(barBg);

        // 5. Maximum °C
        const maxLabel = new St.Label({
            text: '--°',
            style: `${fontCss}font-size: 10px; min-width: 24px; text-align: left; margin-left: 6px;`,
            y_align: Clutter.ActorAlign.CENTER,
        });

        row.add_child(dayLabel);
        row.add_child(icon);
        row.add_child(minLabel);
        row.add_child(barContainer);
        row.add_child(maxLabel);

        dailyContainer.add_child(row);

        dailyActors.push({
            row,
            dayLabel,
            icon,
            minLabel,
            barBg,
            activeBar,
            maxLabel,
        });
    }
    mainBox.add_child(dailyContainer);

    layout.add_child(mainBox);

    return {
        cityLabel,
        tempLabel,
        conditionIcon,
        conditionLabel,
        highLowLabel,
        hourlyRow,
        hourlyActors,
        dailyContainer,
        dailyActors,
    };
}

export function attachForecastScaler(widgetNode, uiElements, widgetData) {
    const fontCss = buildFontCss(widgetData);

    const updateScaling = () => {
        if (isActorDestroyed(widgetNode)) return;

        const w = widgetNode.width;
        if (w <= 0) return;

        // 6x6 alap: kb. 260px széles; 8x8: ~350px; 10x10: ~440px
        const scale = Math.min(Math.max(w / 260, 0.8), 1.6);

        if (uiElements.cityLabel)
            uiElements.cityLabel.style = `${fontCss}font-size: ${Math.round(14 * scale)}px; font-weight: bold;`;
        if (uiElements.tempLabel)
            uiElements.tempLabel.style = `${fontCss}font-size: ${Math.round(28 * scale)}px; font-weight: 200;`;
        if (uiElements.conditionLabel)
            uiElements.conditionLabel.style = `${fontCss}font-size: ${Math.round(10 * scale)}px; text-align: right;`;
        if (uiElements.highLowLabel)
            uiElements.highLowLabel.style = `${fontCss}font-size: ${Math.round(9 * scale)}px; text-align: right; opacity: 0.8;`;
        if (uiElements.conditionIcon)
            uiElements.conditionIcon.icon_size = Math.round(24 * scale);

        if (uiElements.hourlyActors) {
            uiElements.hourlyActors.forEach(item => {
                item.timeLbl.style = `${fontCss}font-size: ${Math.round(9 * scale)}px; opacity: 0.85;`;
                item.icon.icon_size = Math.round(15 * scale);
                item.tempLbl.style = `${fontCss}font-size: ${Math.round(10 * scale)}px; font-weight: bold;`;
            });
        }

        if (uiElements.dailyActors) {
            const barH = Math.max(4, Math.round(6 * scale));
            const radius = Math.round(barH / 2);

            uiElements.dailyActors.forEach(item => {
                const dayW = Math.round(38 * scale);
                const valW = Math.round(24 * scale);
                const fSize = Math.round(10 * scale);

                item.dayLabel.style = `${fontCss}font-size: ${fSize}px; font-weight: bold; min-width: ${dayW}px;`;
                item.icon.icon_size = Math.round(14 * scale);
                item.minLabel.style = `${fontCss}font-size: ${fSize}px; min-width: ${valW}px; text-align: right; margin-right: 4px;`;
                item.maxLabel.style = `${fontCss}font-size: ${fSize}px; min-width: ${valW}px; text-align: left; margin-left: 4px;`;

                item.barBg.style = `background-color: rgba(255, 255, 255, 0.2); height: ${barH}px; border-radius: ${radius}px;`;
                item.activeBar.style = `background-gradient-direction: horizontal; background-gradient-start: #ffcc00; background-gradient-end: #ff7744; height: ${barH}px; border-radius: ${radius}px;`;
                item.barBg.set_height(barH);
                item.activeBar.set_height(barH);
            });
        }
    };

    watchActorLifecycle(widgetNode);
    widgetNode.connect('notify::width', updateScaling);
    widgetNode.connect('notify::height', updateScaling);

    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        updateScaling();
        return GLib.SOURCE_REMOVE;
    });
}