import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import { resolveWidgetForegroundColor, cssColorToRgba } from '../../utils/widgetUtils.js';
import { attachResponsiveScaler, connectTimerCleanup, createWidgetContainer, startMinuteAlignedTimer } from '../../shell/widgetUIUtils.js';
import { isActorDestroyed } from '../../utils/actorLifecycle.js';

const BASE_CLOCK_SIZE = 160;
const BORDER_ALPHA = 0.14;
const DEFAULT_SKIN = 'basic';

function getSkinFileUri(skinName, fileName) {
    const currentDir = GLib.path_get_dirname(import.meta.url.replace('file://', ''));
    return `file://${currentDir}/skins/${skinName}/${fileName}`;
}

function createHandIcon(skinName, fileName, size) {
    const fileUri = getSkinFileUri(skinName, fileName);
    const gfile = Gio.File.new_for_uri(fileUri);
    const icon = new St.Icon({
        gicon: new Gio.FileIcon({ file: gfile }),
        icon_size: size,
        width: size,
        height: size,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
    });
    icon.set_pivot_point(0.5, 0.5);
    return icon;
}

function updateHands(hands, showSecondHand) {
    const now = GLib.DateTime.new_now_local();
    const sec = showSecondHand ? now.get_second() : 0;
    const min = now.get_minute();
    const hour = now.get_hour() % 12;

    const minAngle = min * 6 + (sec * 0.1);
    const hourAngle = hour * 30 + (min * 0.5);

    hands.hour.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, hourAngle);
    hands.minute.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, minAngle);

    if (showSecondHand && hands.second) {
        const secAngle = sec * 6;
        hands.second.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, secAngle);
    }
}

export function createAnalogTimeNode(widgetData, width, height, xPosition, yPosition) {
    const textColor = resolveWidgetForegroundColor(widgetData);
    const skinName = widgetData?.skin || DEFAULT_SKIN;
    const showSecondHand = widgetData.showSecondHand !== false;
    const showBackground = widgetData.showBackground !== false;

    const widgetNode = createWidgetContainer(widgetData, width, height, xPosition, yPosition);

    if (!showBackground) {
        // Átlátszóvá tesszük a Gridgets dobozt és levesszük a keretet/árnyékot
        widgetNode.style += ' background-color: transparent; border: none; box-shadow: none;';
    } else {
        widgetNode.style += ` border: 1px solid ${cssColorToRgba(textColor, BORDER_ALPHA)};`;
    }

    const centerBin = new St.Bin({
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
        y_expand: true,
    });
    widgetNode.add_child(centerBin);

    const clockContainer = new Clutter.Actor({
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
    });
    centerBin.set_child(clockContainer);

    let hands = null;

    const buildClockElements = (size) => {
        clockContainer.destroy_all_children();
        clockContainer.set_size(size, size);

        const background = createHandIcon(skinName, 'background.svg', size);
        const hourHand = createHandIcon(skinName, 'hour_hand.svg', size);
        const minuteHand = createHandIcon(skinName, 'minute_hand.svg', size);

        clockContainer.add_child(background);
        clockContainer.add_child(hourHand);
        clockContainer.add_child(minuteHand);

        let secondHand = null;
        if (showSecondHand) {
            secondHand = createHandIcon(skinName, 'second_hand.svg', size);
            clockContainer.add_child(secondHand);
        }

        hands = {
            hour: hourHand,
            minute: minuteHand,
            second: secondHand,
        };

        updateHands(hands, showSecondHand);
    };

    const applyScale = (scale) => {
        const availableSpace = Math.min(width, height) * 0.88;
        const scaledSize = Math.max(32, Math.round(availableSpace));
        buildClockElements(scaledSize);
    };

    const state = {
        timerId: null,
    };

    const updateDisplay = () => {
        if (isActorDestroyed(widgetNode)) return GLib.SOURCE_REMOVE;
        if (hands) updateHands(hands, showSecondHand);
        return GLib.SOURCE_CONTINUE;
    };

    applyScale(Math.min(width / BASE_CLOCK_SIZE, height / BASE_CLOCK_SIZE));

    // Ha kell másodpercmutató: 1 másodperces ciklus.
    // Ha nem kell: perchez igazított kímélő időzítő!
    if (showSecondHand) {
        state.timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, updateDisplay);
    } else {
        startMinuteAlignedTimer(state, widgetNode, updateDisplay);
    }

    connectTimerCleanup(widgetNode, state);
    attachResponsiveScaler(widgetNode, BASE_CLOCK_SIZE, BASE_CLOCK_SIZE, (scale) => {
        if (isActorDestroyed(widgetNode)) return;
        applyScale(scale);
    });

    return widgetNode;
}