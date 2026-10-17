# Golu Veedu interactive experience

## Build
- Replace the starter home page with a warm, photo-led Golu Veedu home page and clear entry to the designer.
- Add a dedicated Golu designer with adjustable 3/5/7/9-step stages, a searchable statue/decor library, and an interactive layered scene.
- Support placing, selecting, dragging, resizing, rotating, duplicating, deleting, and reordering items; add undo/redo and lighting/zoom/preview controls.
- Save and reopen designs locally, create a fresh design, and export/share a PNG when the browser supports it.
- Make controls usable on touchscreens and small screens; add route-specific metadata and keep the project design tokens consistent.

## Technical approach
- Use the existing TanStack Start routes, with `/` as the home page and `/designer` as the editor.
- Keep the first release client-side and local-storage based; no account or cloud setup is requested.
- Build the 2D scene from independent, movable visual assets and a layered stage; keep editor state/data modular for future 3D work.
- Add a small focused test for editor state/data behavior and run existing project tests; verify the primary create/place/save/export path in the preview.
