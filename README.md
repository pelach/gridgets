# Gridgets — GNOME Shell Widgets

## Fork Highlights & New Features

This fork extends the upstream Gridgets extension with new widgets and modular desktop customizability:

* **Modular Analog Clock with Drop-in SVG Skins:**
  * Drop any custom SVG skin into `widgets/time/skins/<skin-name>/` — the preferences UI discovers them dynamically.
  * Seamless center axis coverage via a separate `cap.svg` layer (keeps pin coverage intact even with second hands toggled off).
  * Optional floating / transparent mode: toggle off the dark container box for seamless wallpaper integration.
  * Battery/CPU-friendly: switches to a minute-aligned interval when the second hand is disabled.
* **Battery Status Widget:** Real-time battery percentage, charge status, and power diagnostics on your desktop grid.
* **Enhanced Weather Integration:** Open-Meteo backend support with flexible styling.

---

### Installing this Fork

Clone directly into your local GNOME Shell extensions directory:

git clone https://github.com/pelach/gridgets.git ~/.local/share/gnome-shell/extensions/gridgets@rebatnaath.github.com

Restart GNOME Shell:
* **X11:** Press Alt + F2, type r, and hit Enter.
* **Wayland:** Log out and log back in.

Enable the extension via CLI or the GNOME Extensions app:

gnome-extensions enable gridgets@rebatnaath.github.com

---

### Adding Custom Analog Clock Skins

Creating a new skin takes just a couple of SVGs placed in a dedicated folder:

1. Create a folder: `widgets/time/skins/my-custom-skin/`
2. Add your assets (standard 1000x1000 canvas with cx="500" cy="500" center):
   * `background.svg` — Clock face dial and hour markers.
   * `hour_hand.svg` — Hour pointer.
   * `minute_hand.svg` — Minute pointer.
   * `second_hand.svg` — Second pointer (optional).
   * `cap.svg` — Center pin cover (renders on top of all hands).
3. Open Gridgets settings: your skin appears automatically in the Clock Skin selector formatted as My-custom-skin.

---

![Gridgets Showcase](github/showcase.png)

| | | |
|---|---|---|
| ![Showcase 1](github/showcase1.png) | ![Showcase 2](github/showcase2.png) | ![Showcase 3](github/showcase3.png) |

Gridgets is a GNOME Shell extension that places widgets directly on your desktop using a responsive grid layout. Add clocks, system monitors, weather forecasts, sticky notes, media controls, animated images, and more, then move, resize, and style each widget independently to match your setup.

<!-- ## User Guide

For a detailed walkthrough of all widgets, customization options, and desktop interactions, see the [User Guide](github/user-guide/README.md). -->

## Features

- **Grid Alignment:** Snap widgets cleanly to a responsive 50-column desktop grid.
- **24+ Built-in Widgets:** Weather, Time, Calendar, Music, System Monitor, Notes, Clipboard, Pomodoro, Tasks, GitHub, RSS, Mood, Images, and more.
- **Individual Styling:** Customize colors, fonts, border radii, and sizes for every widget.
- **Size Presets:** Quick S/M/L sizing from the right-click context menu.
- **Drag & Resize:** Move widgets by dragging, resize with the corner handle.
- **Multi-Monitor:** Show widgets on primary, all, or each monitor independently.
- **Follow System Theme:** Automatically switch between light and dark mode.

## Installation


### Option A: From GitHub Releases

1. Download the latest `.zip` file from the [Releases](https://github.com/rebatnaath/gridgets/releases) page.
2. Install it:
   ```bash
   gnome-extensions install --force gridgets@rebatnaath.github.com.shell-extension.zip
   ```
3. Restart GNOME Shell:
   * **Wayland:** Log out and log back in.
   * **X11:** Press `Alt` + `F2`, type `r`, and press `Enter`.
4. Enable the extension:
   ```bash
   gnome-extensions enable gridgets@rebatnaath.github.com
   ```

---

### Option B: Manual Directory Copy (From Source)

1. Remove any previous installation:
   ```bash
   rm -rf ~/.local/share/gnome-shell/extensions/gridgets@rebatnaath.github.com
   ```
2. Copy the extension files:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/gridgets@rebatnaath.github.com
   cp -r . ~/.local/share/gnome-shell/extensions/gridgets@rebatnaath.github.com
   ```
3. Restart GNOME Shell (log out/in on Wayland, or `Alt+F2` → `r` on X11).
4. Enable:
   ```bash
   gnome-extensions enable gridgets@rebatnaath.github.com
   ```

---

### Option C: Build Zip Package

1. From the project directory:
   ```bash
   gnome-extensions pack \
     --extra-source=assets \
     --extra-source=desktopGrid \
     --extra-source=shell \
     --extra-source=schemas \
     --extra-source=utils \
     --extra-source=widgets \
     --extra-source=prefs \
     --force
   ```
2. Install:
   ```bash
   gnome-extensions install --force gridgets@rebatnaath.github.com.shell-extension.zip
   ```
3. Restart and enable:
   ```bash
   gnome-extensions enable gridgets@rebatnaath.github.com
   ```

## Configuration

Open the **Extensions** app (or Extension Manager) and click the gear icon next to Gridgets to configure your grid settings and customize your widgets.

## Compatibility

Supported GNOME Shell versions: `45`, `46`, `47`, `48`, `49`, `50`.

## Contributing

Contributions are welcome. Please read the [Contributing Guide](CONTRIBUTING.md) before opening an issue or pull request.

## License

Gridgets is free software, released under the [GNU General Public License v3.0](LICENSE).

## Acknowledgements

Thanks to these projects for providing assets used in this extension:

* [SVG Repo](https://www.svgrepo.com/) for vector icons.
* [Meteocons by basmilius](https://github.com/basmilius/meteocons) for the weather icons.
