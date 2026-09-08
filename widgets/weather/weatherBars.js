import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import { FALLBACK_LOCATION, createFallbackIcon, configureWrappingLabel, buildFontCss } from './weatherCommon.js';
import { SECONDARY_OPACITY } from '../../utils/widgetUtils.js';
import { attachResponsiveScaler } from '../../shell/widgetUIUtils.js';

const BASE_LAYOUT_WIDTH = 360;
const BASE_LAYOUT_HEIGHT = 220; // Kicsit megnövelve a sávok kényelmes helye miatt

const BASE_CITY_FONT_SIZE = 18;
const BASE_TEMP_FONT_SIZE = 40;
const BASE_ICON_SIZE = 36;
const BASE_CONDITION_FONT_SIZE = 14;
const BASE_HIGHLOW_FONT_SIZE = 12;

// Napi sávok alapméretei
const BASE_DAILY_ROW_SPACING = 4;
const BASE_DAILY_TEXT_SIZE = 12;
const BASE_DAILY_ICON_SIZE = 16;
const BASE_BAR_WIDTH = 90;
const BASE_BAR_HEIGHT = 5;

const CITY_MARGIN_BOTTOM_PX = 4;
const DIVIDER_MARGIN_VERTICAL_PX = 6;

export function buildForecastLayout(layout, widgetData, extensionPath) {
    const uiElements = { dailyActors: [] };
    const fontCss = buildFontCss(widgetData);

    // --- FELSŐ BLOKK (Város, Fő hőmérséklet, Ikon, Leírás) ---
    const topLayout = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, x_expand: true });
    const leftLayout = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, x_expand: true });
    
    uiElements.cityLabel = new St.Label({
        text: widgetData.location || FALLBACK_LOCATION,
        style: `${fontCss}font-weight: 500; font-size: ${BASE_CITY_FONT_SIZE}px; margin-bottom: ${CITY_MARGIN_BOTTOM_PX}px;`
    });
    uiElements.tempLabel = new St.Label({
        text: '--°',
        style: `${fontCss}font-size: ${BASE_TEMP_FONT_SIZE}px; font-weight: 300;`
    });
    leftLayout.add_child(uiElements.cityLabel);
    leftLayout.add_child(uiElements.tempLabel);
    topLayout.add_child(leftLayout);

    const rightLayout = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, x_align: Clutter.ActorAlign.END });
    const iconWrapper = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, x_align: Clutter.ActorAlign.END, x_expand: true });
    uiElements.conditionIcon = new St.Icon({
        gicon: createFallbackIcon(extensionPath),
        icon_size: BASE_ICON_SIZE,
        style: `margin-bottom: ${CITY_MARGIN_BOTTOM_PX}px;`
    });
    iconWrapper.add_child(uiElements.conditionIcon);

    uiElements.conditionLabel = new St.Label({
        text: 'Loading...',
        style: `${fontCss}font-size: ${BASE_CONDITION_FONT_SIZE}px; font-weight: 400; text-align: right;`
    });
    configureWrappingLabel(uiElements.conditionLabel, Pango.Alignment.RIGHT);
    
    uiElements.highLowLabel = new St.Label({
        text: 'H:--° L:--°',
        style: `${fontCss}font-size: ${BASE_HIGHLOW_FONT_SIZE}px; opacity: ${SECONDARY_OPACITY}; text-align: right;`,
        x_align: Clutter.ActorAlign.END
    });
    uiElements.highLowLabel.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);

    rightLayout.add_child(iconWrapper);
    rightLayout.add_child(uiElements.conditionLabel);
    rightLayout.add_child(uiElements.highLowLabel);
    topLayout.add_child(rightLayout);

    layout.add_child(topLayout);

    // Elválasztó vonal
    const divider = new St.Widget({
        style: `background-color: currentColor; opacity: 0.2; height: 1px; margin-top: ${DIVIDER_MARGIN_VERTICAL_PX}px; margin-bottom: ${DIVIDER_MARGIN_VERTICAL_PX}px;`
    });
    layout.add_child(divider);

    // --- NAPI ELŐREJELZÉS HŐMÉRSÉKLETI SÁVOKKAL ---
    const dailyContainer = new St.BoxLayout({ 
        orientation: Clutter.Orientation.VERTICAL, 
        x_expand: true, 
        y_expand: true,
        style: `spacing: ${BASE_DAILY_ROW_SPACING}px;`
    });

    const DAY_COUNT = 5;
    for (let i = 0; i < DAY_COUNT; i++) {
        const row = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'spacing: 8px;'
        });

        // 1. Nap neve (pl. Hét, Kedd)
        const dayLabel = new St.Label({
            text: '--',
            style: `${fontCss}font-size: ${BASE_DAILY_TEXT_SIZE}px; font-weight: 600; width: 42px;`,
            x_align: Clutter.ActorAlign.START
        });

        // 2. Ikon
        const icon = new St.Icon({
            gicon: createFallbackIcon(extensionPath),
            icon_size: BASE_DAILY_ICON_SIZE
        });

        // 3. Min hőmérséklet felirat
        const minLabel = new St.Label({
            text: '--°',
            style: `${fontCss}font-size: ${BASE_DAILY_TEXT_SIZE}px; font-weight: 600; opacity: 0.85; width: 32px; text-align: right;`,
            x_align: Clutter.ActorAlign.END
        });
        minLabel.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);

        // 4. Hőmérsékleti sáv (háttér + aktív színátmenetes kitöltés)
        const barContainer = new St.BoxLayout({
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });

        const barBg = new St.Widget({
            style: `background-color: rgba(0, 0, 0, 0.22); border-radius: 4px; height: ${BASE_BAR_HEIGHT}px; width: ${BASE_BAR_WIDTH}px;`,
            y_align: Clutter.ActorAlign.CENTER
        });

        const activeBar = new St.Widget({
            style: `background-gradient-direction: horizontal; background-gradient-start: #f6d365; background-gradient-end: #fda085; border-radius: 4px; height: ${BASE_BAR_HEIGHT}px;`,
            width: 10,
            x: 0
        });

        barBg.add_child(activeBar);
        barContainer.add_child(barBg);

        // 5. Max hőmérséklet felirat
        const maxLabel = new St.Label({
            text: '--°',
            style: `${fontCss}font-size: ${BASE_DAILY_TEXT_SIZE}px; font-weight: 600; width: 32px; text-align: left;`,
            x_align: Clutter.ActorAlign.START
        });
        maxLabel.clutter_text.set_line_alignment(Pango.Alignment.LEFT);

        row.add_child(dayLabel);
        row.add_child(icon);
        row.add_child(minLabel);
        row.add_child(barContainer);
        row.add_child(maxLabel);

        dailyContainer.add_child(row);

        uiElements.dailyActors.push({
            dayLabel,
            icon,
            minLabel,
            barBg,
            activeBar,
            maxLabel
        });
    }

    layout.add_child(dailyContainer);

    return uiElements;
}

export function attachForecastScaler(widgetNode, uiElements, widgetData) {
    const fontCss = buildFontCss(widgetData);
    return attachResponsiveScaler(widgetNode, BASE_LAYOUT_WIDTH, BASE_LAYOUT_HEIGHT, (scale) => {
        if (!uiElements || !uiElements.cityLabel) return;

        const citySize = Math.max(1, Math.round(BASE_CITY_FONT_SIZE * scale));
        const tempSize = Math.max(1, Math.round(BASE_TEMP_FONT_SIZE * scale));
        const iconSize = Math.max(1, Math.round(BASE_ICON_SIZE * scale));
        const condSize = Math.max(1, Math.round(BASE_CONDITION_FONT_SIZE * scale));
        const highLowSize = Math.max(1, Math.round(BASE_HIGHLOW_FONT_SIZE * scale));

        const dailyTextSize = Math.max(1, Math.round(BASE_DAILY_TEXT_SIZE * scale));
        const dailyIconSize = Math.max(1, Math.round(BASE_DAILY_ICON_SIZE * scale));
        const barWidth = Math.max(20, Math.round(BASE_BAR_WIDTH * scale));
        const barHeight = Math.max(3, Math.round(BASE_BAR_HEIGHT * scale));

        uiElements.cityLabel.style = `${fontCss}font-weight: 500; font-size: ${citySize}px; margin-bottom: ${CITY_MARGIN_BOTTOM_PX}px; color: inherit;`;
        uiElements.tempLabel.style = `${fontCss}font-size: ${tempSize}px; font-weight: 300; color: inherit;`;
        uiElements.conditionIcon.icon_size = iconSize;
        uiElements.conditionIcon.style = `margin-bottom: ${CITY_MARGIN_BOTTOM_PX}px;`;
        uiElements.conditionLabel.style = `${fontCss}font-size: ${condSize}px; font-weight: 400; text-align: right; color: inherit;`;
        uiElements.highLowLabel.style = `${fontCss}font-size: ${highLowSize}px; opacity: ${SECONDARY_OPACITY}; text-align: right; color: inherit;`;

        if (uiElements.dailyActors) {
            uiElements.dailyActors.forEach(actor => {
                if (actor.dayLabel) actor.dayLabel.style = `${fontCss}font-size: ${dailyTextSize}px; font-weight: 600; width: ${Math.round(42 * scale)}px; color: inherit;`;
                if (actor.icon) actor.icon.icon_size = dailyIconSize;
                if (actor.minLabel) actor.minLabel.style = `${fontCss}font-size: ${dailyTextSize}px; font-weight: 600; opacity: 0.85; width: ${Math.round(32 * scale)}px; text-align: right; color: inherit;`;
                if (actor.maxLabel) actor.maxLabel.style = `${fontCss}font-size: ${dailyTextSize}px; font-weight: 600; width: ${Math.round(32 * scale)}px; text-align: left; color: inherit;`;
                if (actor.barBg) {
                    actor.barBg.style = `background-color: rgba(0, 0, 0, 0.22); border-radius: 4px; height: ${barHeight}px; width: ${barWidth}px;`;
                    actor.activeBar.style = `background-gradient-direction: horizontal; background-gradient-start: #f6d365; background-gradient-end: #fda085; border-radius: 4px; height: ${barHeight}px;`;
                }
            });
        }
    });
}