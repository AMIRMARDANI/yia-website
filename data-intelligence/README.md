# Hospital Building — Visual Editor Edition

An animated three-floor hospital scene with nine unique, independently selectable rooms. The entire illustration is made from SVG vector shapes.

## Run in VS Code
1. Extract this ZIP.
2. Open the `hospital-building-nine-unique-rooms` folder in VS Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` and choose **Open with Live Server**.

You can also open `index.html` directly in a modern browser, but exporting `script.js` and `style.css` from the visual editor requires Live Server so the browser can read those source files.

## Visual Editor
1. Click **Enable edit mode** in the Visual Editor panel.
2. Click a room or a visible SVG component.
3. Drag to move the selected element.
4. Drag a blue corner handle to resize it.
5. Use **Fill color** to change the selected element's fill.
6. Click **Save changes** to save the current edits in this browser.
7. Use the Export buttons to download:
   - `script.js` with the saved layout embedded into the code
   - `style.css`
   - `hospital-edited-scene.svg` (the current vector scene)
   - `hospital-layout.json` (portable transform/color data)

The editor automatically pauses movement when edit mode is enabled. Turn edit mode off and use the scene controls to resume animation. Animation code remains in place; The patient and doctor SVG groups are hidden in the equipment-focused view; ECG monitor animation remains active.

## Files
- `index.html` — page and editor controls
- `style.css` — styling
- `script.js` — room geometry, specialties, animations, and embedded-layout support
- `editor.js` — drag, resize, color, save, and export interactions

## Notes
- This is a lightweight, dependency-free editor: no Node.js, npm, or build step required.
- Browser storage is local to the browser/profile used to edit the project. For a portable deliverable, use **Export script.js** or **Export layout JSON**.
- SVG elements with their own group (such as beds and monitors) can be selected as groups; clicking simpler decorative shapes can select individual vector elements.


## Equipment-focused view
The current view hides the patient and doctor SVG groups so the focus stays on beds, monitors, IV stands, cabinets, and room equipment. Their SVG source remains in `script.js` and can be restored or replaced later. ECG monitor animation remains active.
