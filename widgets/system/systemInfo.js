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

const BORDER_ALPHA = 0.14;
const BADGE_BG_ALPHA = 0.12;
const SUB_LABEL_OPACITY = 0.65;

export function createSystemInfoNode(config, width, height, xPosition, yPosition) {
    const fontFamily = resolveExplicitFontFamily(config);
    const fontCss = fontFamily ? `font-family: ${fontFamily}; ` : '';
    const textColor = resolveWidgetForegroundColor(config);
    const container = createWidgetContainer(config, width, height, xPosition, yPosition);
    container.style += ` border: 1px solid ${cssColorToRgba(textColor, BORDER_ALPHA)};`;

    // 1x1-es méretarány számítás (pl. 80-120px környéke)
    const scale = Math.max(0.65, Math.min(width / 110, height / 110));
    const padding = Math.max(8, Math.round(12 * scale));
    const percentFontSize = Math.max(16, Math.round(22 * scale));
    const labelFontSize = Math.max(10, Math.round(12 * scale));
    const badgeIconSize = Math.max(14, Math.round(16 * scale));
    const badgePadding = Math.max(4, Math.round(6 * scale));
    const badgeRadius = Math.max(6, Math.round(8 * scale));

    // Monitor típus: 'cpu' | 'ram' | 'disk' (alapértelmezett: 'cpu')
    const monitorType = (config.systemInfoType || 'cpu').toLowerCase();

    let iconName = 'utilities-system-monitor-symbolic';
    let defaultLabel = 'CPU';

    if (monitorType === 'ram') {
        iconName = 'media-memory-symbolic';
        defaultLabel = 'RAM';
    } else if (monitorType === 'disk') {
        iconName = 'drive-harddisk-symbolic';
        defaultLabel = 'Disk';
    } else if (monitorType === 'thermal') {
        iconName = 'sensors-temperature-symbolic';
        defaultLabel = 'Thermal';
    }

    const mainLayout = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
        y_expand: true,
        style: `padding: ${padding}px;`,
    });

    // Felső sor: Jobbra zárt badge ikon
    const topBox = new St.BoxLayout({
        orientation: Clutter.Orientation.HORIZONTAL,
        x_align: Clutter.ActorAlign.END,
        x_expand: true,
    });

    const isDarkSurface = isDarkBackgroundColor(resolveWidgetBackgroundColor(config));
    const badgeBg = cssColorToRgba(textColor, BADGE_BG_ALPHA);
    const iconBadge = new St.Bin({
        style: `background-color: ${badgeBg}; border-radius: ${badgeRadius}px; padding: ${badgePadding}px;`,
        y_align: Clutter.ActorAlign.CENTER,
    });

    const topIcon = new St.Icon({
        icon_name: iconName,
        icon_size: badgeIconSize,
        style: `color: ${textColor}; opacity: 0.9;`,
    });
    iconBadge.set_child(topIcon);
    topBox.add_child(iconBadge);
    mainLayout.add_child(topBox);

    // Alsó sor / Alsó blokk: Százalék és felirat
    const bottomBox = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        y_align: Clutter.ActorAlign.END,
        y_expand: true,
    });

    const percentLabel = new St.Label({
        text: '--%',
        style: `${fontCss}color: ${textColor}; font-size: ${percentFontSize}px; font-weight: bold; line-height: 1.1;`,
    });

    const typeLabel = new St.Label({
        text: defaultLabel,
        style: `${fontCss}color: ${textColor}; font-size: ${labelFontSize}px; opacity: ${SUB_LABEL_OPACITY}; font-weight: 500;`,
    });

    bottomBox.add_child(percentLabel);
    bottomBox.add_child(typeLabel);
    mainLayout.add_child(bottomBox);

    container.add_child(mainLayout);

    let isDisposed = false;
    let prevIdle = 0;
    let prevTotal = 0;

    // CPU terhelés számítása /proc/stat-ból (aszinkron olvasás subprocess nélkül)
    const readCpu = () => {
        try {
            const file = Gio.File.new_for_path('/proc/stat');
            file.load_contents_async(null, (f, res) => {
                try {
                    const [, contents] = f.load_contents_finish(res);
                    if (isDisposed || !contents) return;

                    const text = new TextDecoder().decode(contents);
                    const cpuLine = text.split('\n').find(l => l.startsWith('cpu '));
                    if (!cpuLine) return;

                    const parts = cpuLine.trim().split(/\s+/).slice(1).map(Number);
                    const idle = parts[3] + (parts[4] || 0); // idle + iowait
                    const total = parts.reduce((acc, n) => acc + n, 0);

                    if (prevTotal > 0) {
                        const deltaTotal = total - prevTotal;
                        const deltaIdle = idle - prevIdle;
                        const usage = deltaTotal > 0 ? Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100) : 0;
                        percentLabel.set_text(`${Math.max(0, Math.min(100, usage))}%`);
                    }

                    prevIdle = idle;
                    prevTotal = total;
                } catch (e) {
                    // Ignore
                }
            });
        } catch (e) {}
    };

    // RAM számítása /proc/meminfo-ból
    const readRam = () => {
        try {
            const file = Gio.File.new_for_path('/proc/meminfo');
            file.load_contents_async(null, (f, res) => {
                try {
                    const [, contents] = f.load_contents_finish(res);
                    if (isDisposed || !contents) return;

                    const text = new TextDecoder().decode(contents);
                    let total = 0;
                    let avail = 0;

                    for (const line of text.split('\n')) {
                        if (line.startsWith('MemTotal:')) {
                            total = parseInt(line.replace(/\D/g, ''), 10);
                        } else if (line.startsWith('MemAvailable:')) {
                            avail = parseInt(line.replace(/\D/g, ''), 10);
                        }
                        if (total && avail) break;
                    }

                    if (total > 0) {
                        const usage = Math.round(((total - avail) / total) * 100);
                        percentLabel.set_text(`${usage}%`);
                    }
                } catch (e) {}
            });
        } catch (e) {}
    };

    // Disk használat meghatározása
    const readDisk = () => {
        try {
            const proc = new Gio.Subprocess({
                argv: ['sh', '-c', "df -k / | tail -1 | awk '{print $5}'"],
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
            });
            proc.init(null);
            proc.communicate_utf8_async(null, null, (p, res) => {
                try {
                    const [, stdout] = p.communicate_utf8_finish(res);
                    if (isDisposed || !stdout) return;
                    const clean = stdout.trim(); // pl. "16%"
                    if (clean) percentLabel.set_text(clean.includes('%') ? clean : `${clean}%`);
                } catch (e) {}
            });
        } catch (e) {}
    };

    const readThermal = () => {
        try {
            const file = Gio.File.new_for_path('/sys/class/thermal/thermal_zone0/temp');
            file.load_contents_async(null, (f, res) => {
                try {
                    const [, contents] = f.load_contents_finish(res);
                    if (isDisposed || !contents) return;

                    const raw = new TextDecoder().decode(contents).trim();
                    const milliC = parseInt(raw, 10);
                    if (!isNaN(milliC)) {
                        const tempC = Math.round(milliC / 1000);
                        percentLabel.set_text(`${tempC}°C`);
                    }
                } catch (e) {
                    // Ignore
                }
            });
        } catch (e) {}
    };

    const updateData = () => {
        if (monitorType === 'ram') readRam();
        else if (monitorType === 'disk') readDisk();
        else if (monitorType === 'thermal') readThermal();
        else readCpu();
    };

    // Első frissítés
    updateData();

    // CPU-nál 2 másodperc, a többinél 5 másodperc bőven elég
    const intervalSec = monitorType === 'cpu' ? 2 : 5;
    const timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, intervalSec, () => {
        if (isDisposed) return GLib.SOURCE_REMOVE;
        updateData();
        return GLib.SOURCE_CONTINUE;
    });

    registerWidgetCleanup(container, () => {
        isDisposed = true;
        if (timeoutId) GLib.source_remove(timeoutId);
    });

    return container;
}