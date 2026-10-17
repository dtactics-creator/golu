import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  Expand,
  Flower2,
  Lamp,
  Layers2,
  Lightbulb,
  Minus,
  Move,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Share2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import stage3 from "@/assets/golu-stage-3.jpg";
import stage5 from "@/assets/golu-empty-stage.jpg";
import stage7 from "@/assets/golu-stage-7.jpg";
import stage9 from "@/assets/golu-stage-9.jpg";
import {
  createGoluObject,
  duplicateGoluObject,
  emptyGoluDesign,
  moveGoluObject,
  nextHistory,
  stagePositionStep,
  stageStepY,
  updateStageCount,
  STAGE_OPTIONS,
  type GoluAsset,
  type GoluDesign,
  type GoluObject,
} from "@/lib/golu-model";

// Simple helper to fire analytics events if SDK is loaded
const trackEvent = (event: string, payload?: any) => {
  if (typeof window !== "undefined" && (window as any).DTCampaign) {
    (window as any).DTCampaign.track(event, payload);
  }
};

import ganesha from "@/assets/golu/ganesha.png";
import lakshmi from "@/assets/golu/lakshmi.png";
import krishna from "@/assets/golu/krishna.png";
import shivaParvati from "@/assets/golu/shiva-parvati.png";
import dasavatharam from "@/assets/golu/dasavatharam.png";
import marapachi from "@/assets/golu/marapachi.png";
import chettiar from "@/assets/golu/chettiar.png";
import wedding from "@/assets/golu/wedding.png";
import farmer from "@/assets/golu/farmer.png";
import cowCalf from "@/assets/golu/cow-calf.png";
import peacock from "@/assets/golu/peacock.png";
import dancer from "@/assets/golu/dancer.png";
import garland from "@/assets/golu/garland.png";
import brassLamp from "@/assets/golu/brass-lamp.png";
import bananaPlant from "@/assets/golu/banana-plant.png";
import fairyLights from "@/assets/golu/fairy-lights.png";
import kolam from "@/assets/golu/kolam.png";
import silkDrape from "@/assets/golu/silk-drape.png";
import garden from "@/assets/golu/miniature-garden.png";
import flowerUrli from "@/assets/golu/flower-urli.png";

const ASSETS: GoluAsset[] = [
  { id: "ganesha", name: "Ganesha", category: "Gods & Goddesses", kind: "statue", src: ganesha },
  { id: "lakshmi", name: "Lakshmi on lotus", category: "Gods & Goddesses", kind: "statue", src: lakshmi },
  { id: "krishna", name: "Krishna with flute", category: "Gods & Goddesses", kind: "statue", src: krishna },
  { id: "shiva-parvati", name: "Shiva & Parvati", category: "Gods & Goddesses", kind: "statue", src: shivaParvati },
  { id: "dasavatharam", name: "Dasavatharam", category: "Dasavatharam", kind: "statue", src: dasavatharam },
  { id: "marapachi", name: "Marapachi dolls", category: "Traditional dolls", kind: "statue", src: marapachi },
  { id: "chettiar", name: "Chettiar couple", category: "Village life", kind: "statue", src: chettiar },
  { id: "wedding", name: "Wedding couple", category: "Celebrations", kind: "statue", src: wedding },
  { id: "farmer", name: "Village farmer", category: "Village life", kind: "statue", src: farmer },
  { id: "cow-calf", name: "Cow & calf", category: "Animals & birds", kind: "statue", src: cowCalf },
  { id: "peacock", name: "Peacock", category: "Animals & birds", kind: "statue", src: peacock },
  { id: "dancer", name: "Bharatanatyam dancer", category: "Arts & culture", kind: "statue", src: dancer },
  { id: "garland", name: "Flower garland", category: "Flowers & light", kind: "decoration", src: garland },
  { id: "brass-lamp", name: "Brass kuthu vilakku", category: "Flowers & light", kind: "decoration", src: brassLamp },
  { id: "banana-plant", name: "Banana plant", category: "Garden & scenery", kind: "decoration", src: bananaPlant },
  { id: "fairy-lights", name: "Fairy lights", category: "Flowers & light", kind: "decoration", src: fairyLights },
  { id: "kolam", name: "Kolam design", category: "Floor decorations", kind: "decoration", src: kolam },
  { id: "silk-drape", name: "Silk backdrop", category: "Flowers & light", kind: "decoration", src: silkDrape },
  { id: "miniature-garden", name: "Miniature garden", category: "Garden & scenery", kind: "decoration", src: garden },
  { id: "flower-urli", name: "Flower urli", category: "Floor decorations", kind: "decoration", src: flowerUrli },
];

const STORAGE_KEY = "golu-veedu-designs-v1";
const HISTORY_KEY = "golu-veedu-autosave-v1";
const STAGE_BACKGROUNDS = { 3: stage3, 5: stage5, 7: stage7, 9: stage9 } as const;

export const Route = createFileRoute("/designer")({
  component: GoluDesigner,
  head: () => ({
    meta: [
      { title: "Golu Designer | Golu Veedu" },
      { name: "description", content: "Arrange Golu bommai, silk, flowers, and brass lamps in your own Navaratri display." },
      { property: "og:title", content: "Golu Designer | Golu Veedu" },
      { property: "og:description", content: "Arrange a Golu display of your own with traditional bommai and festive decorations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type SavedDesign = { id: string; name: string; savedAt: string; design: GoluDesign };
type DragState = { id: string; pointerX: number; pointerY: number; x: number; y: number; width: number; height: number; mode: "move" | "resize" };

function freshId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function GoluDesigner() {
  const [design, setDesign] = useState<GoluDesign>(emptyGoluDesign);
  const [history, setHistory] = useState<GoluDesign[]>([]);
  const [future, setFuture] = useState<GoluDesign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [libraryKind, setLibraryKind] = useState<"statue" | "decoration">("statue");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All pieces");
  const [activeStep, setActiveStep] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const designRef = useRef(design);
  designRef.current = design;

  useEffect(() => {
    // Builder started analytics
    trackEvent('builder_started');
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as SavedDesign[];
      setSavedDesigns(Array.isArray(saved) ? saved : []);
      const autosave = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null") as GoluDesign | null;
      if (autosave && Array.isArray(autosave.objects)) {
        setDesign({ ...emptyGoluDesign(), ...autosave });
        setActiveStep(Math.ceil(autosave.steps / 2));
      }
    } catch {
      setError("Your last design couldn’t be reopened. Start a fresh Golu instead.");
    }
  }, []);

  useEffect(() => {
    const saveQuietly = () => {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(designRef.current));
      } catch {
        // Browsers with unavailable storage can still use the current design.
      }
    };
    const timer = window.setTimeout(saveQuietly, 300);
    return () => window.clearTimeout(timer);
  }, [design]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedObject = design.objects.find((item) => item.id === selectedId) ?? null;
  const categories = useMemo(() => ["All pieces", ...new Set(ASSETS.filter((a) => a.kind === libraryKind).map((a) => a.category))], [libraryKind]);
  const visibleAssets = useMemo(() => ASSETS.filter((asset) => {
    const matchesKind = asset.kind === libraryKind;
    const matchesCategory = category === "All pieces" || category === asset.category;
    const matchesQuery = `${asset.name} ${asset.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesKind && matchesCategory && matchesQuery;
  }), [category, libraryKind, query]);

  const changeDesign = useCallback((update: (current: GoluDesign) => GoluDesign) => {
    setDesign((current) => {
      const updated = update(current);
      if (updated === current) return current;
      setHistory((items) => nextHistory(items, current));
      setFuture([]);
      return updated;
    });
  }, []);

  const addAsset = useCallback((asset: GoluAsset, x?: number, y?: number) => {
    const id = freshId();
    changeDesign((current) => {
      const placed = createGoluObject(asset, id, current.objects.length, activeStep, current.steps);
      if (x !== undefined && y !== undefined) {
        placed.x = Math.max(0, Math.min(84, x));
        placed.y = stageStepY(stagePositionStep(y, current.steps), current.steps);
        placed.step = stagePositionStep(y, current.steps);
        placed.y -= placed.height;
      }
      return { ...current, objects: [...current.objects, placed] };
    });
    setSelectedId(id);
    setMobileLibraryOpen(false);
    // Track asset addition
    trackEvent('add_asset', { assetId: asset.id, step: activeStep });
  }, [activeStep, changeDesign]);

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [...items, design]);
    setDesign(previous);
    setHistory((items) => items.slice(0, -1));
    setSelectedId(null);
    // Track undo action
    trackEvent('undo');
  };

  const redo = () => {
    const next = future.at(-1);
    if (!next) return;
    setHistory((items) => nextHistory(items, design));
    setDesign(next);
    setFuture((items) => items.slice(0, -1));
    setSelectedId(null);
    // Track redo action
    trackEvent('redo');
  };

  const removeSelected = () => {
    if (!selectedId) return;
    changeDesign((current) => ({ ...current, objects: current.objects.filter((item) => item.id !== selectedId) }));
    // Track removal
    trackEvent('remove_asset', { id: selectedId });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selectedObject) return;
    const duplicate = duplicateGoluObject(selectedObject, freshId());
    changeDesign((current) => ({ ...current, objects: [...current.objects, duplicate] }));
    // Track duplication
    trackEvent('duplicate_asset', { originalId: selectedObject.id, newId: duplicate.id });
    setSelectedId(duplicate.id);
  };

  const moveLayer = (direction: -1 | 1) => {
    if (!selectedId) return;
    changeDesign((current) => {
      const sorted = [...current.objects].sort((a, b) => a.layer - b.layer);
      const index = sorted.findIndex((item) => item.id === selectedId);
      const newIndex = Math.max(0, Math.min(sorted.length - 1, index + direction));
      if (index === newIndex) return current;
      const item = sorted[index];
      if (!item) return current;
      sorted.splice(index, 1);
      sorted.splice(newIndex, 0, item);
      return { ...current, objects: sorted.map((object, layer) => ({ ...object, layer })) };
    });
  };

  const startDrag = (event: ReactPointerEvent, item: GoluObject, mode: DragState["mode"]) => {
    if (isPreview) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setHistory((items) => nextHistory(items, designRef.current));
    setFuture([]);
    stageRef.current?.setPointerCapture(event.pointerId);
    dragRef.current = { id: item.id, pointerX: event.clientX, pointerY: event.clientY, x: item.x, y: item.y, width: item.width, height: item.height, mode };
    // Track start move or resize
    trackEvent(mode === 'move' ? 'move_start' : 'resize_start', { id: item.id });
  };

  const moveDrag = (event: ReactPointerEvent) => {
    const currentDrag = dragRef.current;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!currentDrag || !bounds) return;
    const item = designRef.current.objects.find((piece) => piece.id === currentDrag.id);
    if (!item) return;
    const dx = ((event.clientX - currentDrag.pointerX) / bounds.width) * 100;
    const dy = ((event.clientY - currentDrag.pointerY) / bounds.height) * 100;
    if (currentDrag.mode === "resize") {
      const ratio = bounds.width / bounds.height;
      const width = Math.max(5, Math.min(40, currentDrag.width + dx));
      const height = Math.max(8, Math.min(52, currentDrag.height + (dx * ratio)));
      setDesign((current) => ({
        ...current,
        objects: current.objects.map((piece) => piece.id === currentDrag.id
          ? { ...piece, width, height, y: stageStepY(piece.step, current.steps) - height }
          : piece),
      }));
    } else {
      const moved = moveGoluObject(item, currentDrag.x + dx, currentDrag.y + dy, bounds.width, bounds.height);
      moved.step = stagePositionStep(moved.y + moved.height, designRef.current.steps);
      moved.y = stageStepY(moved.step, designRef.current.steps) - moved.height;
      setDesign((current) => ({ ...current, objects: current.objects.map((piece) => piece.id === currentDrag.id ? moved : piece) }));
    }
  };

  const stopDrag = (event: ReactPointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId);
  };

  const saveDesign = () => {
    try {
      const next: SavedDesign = {
        id: freshId(),
        name: design.name.trim() || "My Golu",
        savedAt: new Date().toISOString(),
        design: { ...design, name: design.name.trim() || "My Golu" },
      };
      const all = [next, ...savedDesigns];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next.design));
      setSavedDesigns(all);
      setToast("Your Golu has been saved on this device.");
      setError("");
    } catch {
      setError("Your browser couldn’t save this Golu. Check available storage and try again.");
    }
  };

  const reopenDesign = (saved: SavedDesign) => {
    setHistory((items) => nextHistory(items, design));
    setFuture([]);
    setDesign({ ...saved.design, objects: saved.design.objects.map((item) => ({ ...item })) });
    setActiveStep(Math.ceil(saved.design.steps / 2));
    setSelectedId(null);
    setToast(`${saved.name} is open.`);
  };

  const newDesign = () => {
    if (design.objects.length && !window.confirm("Start a fresh Golu? Your saved designs will stay here.")) return;
    setHistory((items) => nextHistory(items, design));
    setFuture([]);
    setDesign(emptyGoluDesign());
    setActiveStep(3);
    setSelectedId(null);
    // Track design reset
    trackEvent('design_reset');
  };

  const exportPng = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      const width = 1600;
      const height = Math.round(width * stage.clientHeight / stage.clientWidth);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.fillStyle = "#e9d8bc";
      context.fillRect(0, 0, width, height);
      const background = new Image();
      background.src = STAGE_BACKGROUNDS[design.steps];
      await background.decode();
      context.drawImage(background, 0, 0, width, height);
      if (design.warmLight) {
        context.fillStyle = "rgba(255, 187, 83, 0.11)";
        context.fillRect(0, 0, width, height);
      }
      const ordered = [...design.objects].sort((a, b) => a.layer - b.layer);
      for (const item of ordered) {
        const asset = ASSETS.find((candidate) => candidate.id === item.assetId);
        if (!asset) continue;
        const image = new Image();
        image.src = asset.src;
        await image.decode();
        const x = (item.x / 100) * width;
        const y = (item.y / 100) * height;
        const w = (item.width / 100) * width;
        const h = (item.height / 100) * height;
        context.save();
        context.translate(x + w / 2, y + h / 2);
        context.rotate((item.rotation * Math.PI) / 180);
        context.drawImage(image, -w / 2, -h / 2, w, h);
        context.restore();
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Export unavailable");
      const file = new File([blob], "my-golu.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: design.name, text: "My Golu, my tradition, my home." });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "my-golu.png";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setToast("Your Golu image has been downloaded.");
      }
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") return;
      setError("This Golu image couldn’t be exported. Please try again.");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !isPreview) {
        event.preventDefault();
        changeDesign((current) => ({ ...current, objects: current.objects.filter((item) => item.id !== selectedId) }));
        // Track delete via keyboard
        trackEvent('remove_asset', { id: selectedId, via: 'keyboard' });
        setSelectedId(null);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const rotateSelected = (rotation: number) => {
    if (!selectedId) return;
    changeDesign((current) => ({ ...current, objects: current.objects.map((item) => item.id === selectedId ? { ...item, rotation } : item) }));
  };

  const setObjectSize = (width: number) => {
    if (!selectedId || !selectedObject) return;
    const height = Math.max(8, Math.min(52, (selectedObject.height / selectedObject.width) * width));
    changeDesign((current) => ({ ...current, objects: current.objects.map((item) => item.id === selectedId ? { ...item, width, height, y: stageStepY(item.step, current.steps) - height } : item) }));
  };

  const shelfColors = ["golu-shelf-green", "golu-shelf-wine", "golu-shelf-gold", "golu-shelf-red", "golu-shelf-green", "golu-shelf-wine", "golu-shelf-gold", "golu-shelf-red", "golu-shelf-green"];

  return (
    <main className={`golu-editor ${isPreview ? "golu-is-preview" : ""}`}>
      <header className="golu-editor-header">
        <div className="golu-editor-brand">
          <Link to="/" aria-label="Back to Golu Veedu home" className="golu-editor-back"><ArrowLeft size={18} /></Link>
          <span className="golu-brand-stamp" aria-hidden="true">கொ</span>
          <div><Link to="/" className="golu-brand-name">Golu Veedu</Link><span className="golu-header-divider" /><span className="golu-workspace-label">Your Golu</span></div>
        </div>
        <Input className="golu-project-name" aria-label="Golu design name" value={design.name} onChange={(event) => setDesign((current) => ({ ...current, name: event.target.value }))} />
        <div className="golu-top-actions">
          <div className="golu-history-actions">
            <Button variant="ghost" size="icon" aria-label="Undo" title="Undo" disabled={!history.length} onClick={undo}><Undo2 /></Button>
            <Button variant="ghost" size="icon" aria-label="Redo" title="Redo" disabled={!future.length} onClick={redo}><Redo2 /></Button>
          </div>
          <select aria-label="Reopen saved design" className="golu-saved-select" value="" onChange={(event) => { const saved = savedDesigns.find((item) => item.id === event.target.value); if (saved) reopenDesign(saved); }}>
            <option value="" disabled>{savedDesigns.length ? "Open saved" : "Saved Golu"}</option>
            {savedDesigns.map((saved) => <option value={saved.id} key={saved.id}>{saved.name}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={newDesign}><Plus size={16} /> <span className="golu-desktop-label">New</span></Button>
          <Button variant="outline" size="sm" onClick={() => { saveDesign(); trackEvent('design_saved'); }}><Save size={16} /> <span className="golu-desktop-label">Save</span></Button>
          <Button variant="default" size="sm" onClick={exportPng}><Share2 size={16} /><span className="golu-desktop-label">Share / Download</span></Button>
        </div>
      </header>

      <div className="golu-workspace">
        <aside className={`golu-library ${mobileLibraryOpen ? "is-open" : ""}`}>
          <div className="golu-library-title"><div><span className="golu-eyebrow">MAKE IT YOURS</span><h2>Golu pieces</h2></div><Button variant="ghost" size="icon" className="golu-mobile-close" aria-label="Close library" onClick={() => setMobileLibraryOpen(false)}><X /></Button></div>
          <div className="golu-library-tabs" role="tablist" aria-label="Golu pieces">
            <button type="button" role="tab" aria-selected={libraryKind === "statue"} className={libraryKind === "statue" ? "is-active" : ""} onClick={() => { setLibraryKind("statue"); setCategory("All pieces"); }}><Layers2 size={16} /> Bommai <span>12</span></button>
            <button type="button" role="tab" aria-selected={libraryKind === "decoration"} className={libraryKind === "decoration" ? "is-active" : ""} onClick={() => { setLibraryKind("decoration"); setCategory("All pieces"); }}><Flower2 size={16} /> Decor <span>8</span></button>
          </div>
          <div className="golu-library-controls">
            {searchOpen ? <div className="golu-search-wrap"><Search size={15} /><Input autoFocus placeholder="Find a piece" aria-label="Search Golu pieces" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="ghost" size="icon" aria-label="Close search" onClick={() => { setSearchOpen(false); setQuery(""); }}><X size={15} /></Button></div> : <><span className="golu-library-count">{libraryKind === "statue" ? "A collection of 12" : "A collection of 8"}</span><Button variant="ghost" size="icon" aria-label="Search pieces" onClick={() => setSearchOpen(true)}><Search /></Button></>}
            <select className="golu-category-select" aria-label="Filter by collection" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="golu-asset-grid">
            {visibleAssets.map((asset) => <button type="button" className="golu-asset-tile" key={asset.id} draggable onDragStart={(event) => { event.dataTransfer.setData("application/golu-asset", asset.id); event.dataTransfer.effectAllowed = "copy"; }} onClick={() => addAsset(asset)} aria-label={`Add ${asset.name}`}>
              <span className="golu-asset-image"><img src={asset.src} alt="" loading="lazy" draggable={false} /></span>
              <span className="golu-asset-name">{asset.name}</span><span className="golu-asset-collection">{asset.category}</span>
            </button>)}
            {!visibleAssets.length && <div className="golu-library-empty">No pieces match your search.</div>}
          </div>
          <div className="golu-library-footer">Tap a piece to place it · drag it for more control</div>
        </aside>

        {mobileLibraryOpen && <button type="button" className="golu-mobile-scrim" onClick={() => setMobileLibraryOpen(false)} aria-label="Close library overlay" />}

        <section className="golu-center" aria-label="Golu design workspace">
          <div className="golu-canvas-toolbar">
            <Button variant="ghost" size="sm" className="golu-piece-toggle" onClick={() => setMobileLibraryOpen((open) => !open)}><Flower2 size={17} /> Pieces</Button>
                  <select value={design.steps} aria-label="Number of Golu steps" onChange={(event) => { const steps = Number(event.target.value) as GoluDesign["steps"]; changeDesign((current) => updateStageCount(current, steps)); setActiveStep((step) => Math.min(steps, step)); }}><option value={3}>3 steps</option><option value={5}>5 steps</option><option value={7}>7 steps</option><option value={9}>9 steps</option></select>
            <div className="golu-view-tools"><Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => setZoom((current) => Math.max(0.7, Math.round((current - 0.1) * 10) / 10))}><Minus /></Button><span>{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => setZoom((current) => Math.min(1.3, Math.round((current + 0.1) * 10) / 10))}><Plus /></Button><span className="golu-toolbar-divider" /><Button variant={isPreview ? "default" : "ghost"} size="icon" aria-label={isPreview ? "Exit full-screen preview" : "Enter full-screen preview"} onClick={() => setIsPreview((value) => !value)}>{isPreview ? <X /> : <Expand />}</Button></div>
          </div>

          <div className="golu-canvas-scroll">
            <div className="golu-scene-frame" style={{ width: `${zoom * 100}%` }}>
              <div className={`golu-stage ${design.warmLight ? "golu-warm" : ""}`} ref={stageRef} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={(event) => { event.preventDefault(); const asset = ASSETS.find((item) => item.id === event.dataTransfer.getData("application/golu-asset")); const rect = stageRef.current?.getBoundingClientRect(); if (asset && rect) addAsset(asset, ((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100); }} onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
                <img className="golu-scene-photo" src={STAGE_BACKGROUNDS[design.steps]} alt={`A traditional home prepared with a ${design.steps}-step Golu stage`} />
                <div className="golu-scene-warmth" />
                <div className="golu-placed-items">
                  {[...design.objects].sort((a, b) => a.layer - b.layer).map((item) => {
                    const asset = ASSETS.find((candidate) => candidate.id === item.assetId);
                    if (!asset) return null;
                    return <div key={item.id} className={`golu-placed-object ${selectedId === item.id && !isPreview ? "is-selected" : ""} ${item.kind === "decoration" ? "is-decoration" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`, zIndex: 10 + item.layer, transform: `rotate(${item.rotation}deg)` }} onPointerDown={(event) => startDrag(event, item, "move")} onClick={(event) => { event.stopPropagation(); if (!isPreview) setSelectedId(item.id); }}>
                      <img src={asset.src} alt={isPreview ? item.name : ""} draggable={false} />
                      {selectedId === item.id && !isPreview && <button type="button" className="golu-resize-grip" aria-label={`Resize ${item.name}`} title="Drag to resize" onPointerDown={(event) => startDrag(event, item, "resize")}><Expand size={12} /></button>}
                    </div>;
                  })}
                </div>
                {!isPreview && <div className="golu-scene-caption"><span className="golu-scene-dot" /> YOUR NAVARATRI, YOUR WAY</div>}
              </div>
            </div>
          </div>

          <div className="golu-bottom-controls">
            <div className="golu-step-pills" aria-label="Select a Golu step">
              {Array.from({ length: design.steps }, (_, index) => design.steps - index).map((step) => <button type="button" key={step} aria-label={`Select step ${step}`} aria-pressed={activeStep === step} className={activeStep === step ? "is-active" : ""} onClick={() => setActiveStep(step)}><span>{step}</span><i className={shelfColors[(step - 1) % shelfColors.length]} /></button>)}
            </div>
            <div className="golu-bottom-right"><Button variant="ghost" size="sm" className="golu-light-switch" aria-pressed={design.warmLight} onClick={() => changeDesign((current) => ({ ...current, warmLight: !current.warmLight }))}><Lightbulb size={17} className={design.warmLight ? "golu-lamp-on" : ""} /> Warm light</Button><span className="golu-canvas-count">{design.objects.length} {design.objects.length === 1 ? "piece" : "pieces"}</span></div>
          </div>
          <div className="golu-mobile-actions"><Button variant="outline" onClick={saveDesign}><Save /> Save design</Button><Button variant="default" onClick={exportPng}><ArrowDownToLine /> Download image</Button></div>
        </section>

        <aside className="golu-inspector">
          <div className="golu-inspector-heading"><span className="golu-eyebrow">YOUR DISPLAY</span><h2>{selectedObject ? "Fine tune" : "The details"}</h2><p>{selectedObject ? "Make this piece just right." : "A little personal touch makes it yours."}</p></div>
          {selectedObject ? <>
            <div className="golu-selected-preview"><img src={ASSETS.find((item) => item.id === selectedObject.assetId)?.src} alt={selectedObject.name} /><div><strong>{selectedObject.name}</strong><span>{selectedObject.category}</span></div></div>
            <div className="golu-setting-block"><div className="golu-setting-label"><span>Size</span><span>{Math.round(selectedObject.width)}%</span></div><input aria-label="Object size" type="range" min="5" max="36" value={selectedObject.width} onChange={(event) => setObjectSize(Number(event.target.value))} /></div>
            <div className="golu-setting-block"><div className="golu-setting-label"><span>Rotation</span><span>{selectedObject.rotation}°</span></div><input aria-label="Object rotation" type="range" min="-45" max="45" value={selectedObject.rotation} onChange={(event) => rotateSelected(Number(event.target.value))} /></div>
            <div className="golu-setting-block"><div className="golu-setting-label"><span>Place on step</span><span>{selectedObject.step} of {design.steps}</span></div><input aria-label="Object step" type="range" min="1" max={design.steps} value={Math.min(selectedObject.step, design.steps)} onChange={(event) => { const step = Number(event.target.value); changeDesign((current) => ({ ...current, objects: current.objects.map((item) => item.id === selectedId ? { ...item, step, y: stageStepY(step, current.steps) } : item) })); }} /></div>
            <div className="golu-object-actions"><Button variant="outline" size="sm" onClick={duplicateSelected}><Copy size={15} /> Duplicate</Button><Button variant="outline" size="sm" onClick={() => moveLayer(1)} aria-label="Bring forward" title="Bring forward"><ArrowUp size={16} /></Button><Button variant="outline" size="sm" onClick={() => moveLayer(-1)} aria-label="Send backward" title="Send backward"><ChevronDown size={16} /></Button><Button variant="outline" size="sm" className="golu-delete-button" onClick={removeSelected} aria-label="Delete selected piece" title="Delete piece"><Trash2 size={16} /></Button></div>
            <div className="golu-selected-hint"><Move size={14} /> Drag the selected piece to move it.</div>
          </> : <>
            <div className="golu-stage-card"><div className="golu-stage-diagram" aria-hidden="true"><div className="golu-stage-statue">✺</div>{Array.from({ length: design.steps }, (_, i) => <i key={i} className={shelfColors[i]} />)}</div><span className="golu-stage-card-label">YOUR GOLU STEPS</span><strong>{design.steps} beautiful steps</strong></div>
          <div className="golu-stage-options"><span>Change your arrangement</span>{STAGE_OPTIONS.map((count) => <button type="button" key={count} aria-pressed={design.steps === count} onClick={() => { changeDesign((current) => updateStageCount(current, count)); setActiveStep(Math.min(count, activeStep)); }}>{count}</button>)}</div>
            <div className="golu-inspector-tip"><Lamp size={18} /><span>Choose a bommai or decoration, then place it on your Golu.</span></div>
          </>}
          <div className="golu-inspector-footer"><button type="button" onClick={newDesign}><RotateCcw size={15} /> Start a fresh Golu</button>{savedDesigns.length > 0 && <span>{savedDesigns.length} saved {savedDesigns.length === 1 ? "design" : "designs"}</span>}</div>
        </aside>
      </div>

      {error && <div role="alert" className="golu-toast golu-toast-error">{error}<Button variant="ghost" size="icon" aria-label="Dismiss" onClick={() => setError("")}><X size={17} /></Button></div>}
      {!error && toast && <div role="status" className="golu-toast">{toast}</div>}
    </main>
  );
}