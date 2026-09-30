"use strict";
(() => {
  // code.ts
  var TOOL_ID = "29714264-aa0f-46f8-bba9-4fa7ccf1f1b9";
  var DISPLAY_NAME = "Dither to SVG";
  figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME });
  figma.showUI(__html__, { width: 332, height: 800 });
  var exportInFlight = false;
  async function exportSelection() {
    const sel = figma.currentPage.selection;
    if (sel.length !== 1) {
      figma.ui.postMessage({ type: "selection-update", bytes: null });
      figma.ui.postMessage({ type: "pixel-art-info", info: null });
      return;
    }
    if (exportInFlight) return;
    exportInFlight = true;
    try {
      const bytes = await sel[0].exportAsync({
        format: "PNG",
        constraint: { type: "WIDTH", value: 512 }
      });
      figma.ui.postMessage({ type: "selection-update", bytes: Array.from(bytes), name: sel[0].name });
    } catch (e) {
      figma.ui.postMessage({ type: "selection-update", bytes: null });
    } finally {
      exportInFlight = false;
    }
    const node = sel[0];
    if (node.type === "FRAME" && "children" in node && node.children.length > 0) {
      const first20 = node.children.slice(0, 20);
      const allSmallRects = first20.every(
        (c) => c.type === "RECTANGLE" && Math.round(c.width) === 1 && Math.round(c.height) === 1
      );
      if (allSmallRects && node.children.length >= 10) {
        figma.ui.postMessage({
          type: "pixel-art-info",
          info: {
            width: Math.round(node.width),
            height: Math.round(node.height),
            pixelCount: node.children.length,
            name: node.name
          }
        });
      } else {
        figma.ui.postMessage({ type: "pixel-art-info", info: null });
      }
    } else {
      figma.ui.postMessage({ type: "pixel-art-info", info: null });
    }
  }
  figma.on("selectionchange", () => {
    void exportSelection();
  });
  void exportSelection();
  figma.ui.onmessage = async (msg) => {
    var _a;
    if (msg.type === "resize") {
      const h = msg.height;
      figma.ui.resize(332, Math.max(48, Math.min(1200, Math.round(h))));
      return;
    }
    if (msg.type === "select-layer") {
      const sel = figma.currentPage.selection;
      if (sel.length !== 1) {
        figma.notify("Select exactly one layer");
        figma.ui.postMessage({ type: "select-layer-result", bytes: null });
        return;
      }
      const node = sel[0];
      try {
        const bytes = await node.exportAsync({
          format: "PNG",
          constraint: { type: "WIDTH", value: 512 }
        });
        const arr = Array.from(bytes);
        figma.ui.postMessage({ type: "select-layer-result", bytes: arr, name: node.name });
      } catch (e) {
        figma.notify("Could not export the selected layer");
        figma.ui.postMessage({ type: "select-layer-result", bytes: null });
      }
      return;
    }
    if (msg.type === "apply-dither") {
      const svgString = msg.svgString;
      if (!svgString) {
        figma.notify("No dither to apply");
        return;
      }
      const svgNode = figma.createNodeFromSvg(svgString);
      const baseName = msg.sourceName || "Dithered SVG";
      svgNode.name = baseName + " (dithered)";
      const vCenter = figma.viewport.center;
      svgNode.x = Math.round(vCenter.x - svgNode.width / 2);
      svgNode.y = Math.round(vCenter.y - svgNode.height / 2);
      figma.currentPage.selection = [svgNode];
      figma.viewport.scrollAndZoomIntoView([svgNode]);
      svgNode.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME });
      figma.notify("Dithered SVG placed on canvas");
      return;
    }
    if (msg.type === "resize-pixel-art") {
      const sel = figma.currentPage.selection;
      if (sel.length !== 1 || sel[0].type !== "FRAME") {
        figma.notify("Select a pixel art frame");
        return;
      }
      const original = sel[0];
      const targetWidth = msg.targetWidth;
      const threshold = (_a = msg.threshold) != null ? _a : 0.45;
      if (!targetWidth || targetWidth < 1) {
        figma.notify("Invalid target width");
        return;
      }
      const srcW = Math.round(original.width);
      const srcH = Math.round(original.height);
      const targetHeight = Math.max(1, Math.round(targetWidth * (srcH / srcW)));
      if (targetWidth < 16 || targetHeight < 16) {
        figma.notify("Both dimensions must be at least 16px. Try a larger width.");
        return;
      }
      const grid = new Array(srcH);
      for (let y = 0; y < srcH; y++) {
        grid[y] = new Uint8Array(srcW);
      }
      for (const child of original.children) {
        if (child.type !== "RECTANGLE") continue;
        const x = Math.round(child.x);
        const y = Math.round(child.y);
        if (x >= 0 && x < srcW && y >= 0 && y < srcH) {
          grid[y][x] = 1;
        }
      }
      const scaleX = srcW / targetWidth;
      const scaleY = srcH / targetHeight;
      const outGrid = new Array(targetHeight);
      for (let ny = 0; ny < targetHeight; ny++) {
        outGrid[ny] = new Uint8Array(targetWidth);
        for (let nx = 0; nx < targetWidth; nx++) {
          const sx0 = nx * scaleX;
          const sy0 = ny * scaleY;
          const sx1 = (nx + 1) * scaleX;
          const sy1 = (ny + 1) * scaleY;
          let blackArea = 0;
          let totalArea = 0;
          for (let oy = Math.floor(sy0); oy < Math.ceil(sy1) && oy < srcH; oy++) {
            for (let ox = Math.floor(sx0); ox < Math.ceil(sx1) && ox < srcW; ox++) {
              const overlapX = Math.min(ox + 1, sx1) - Math.max(ox, sx0);
              const overlapY = Math.min(oy + 1, sy1) - Math.max(oy, sy0);
              const overlap = Math.max(0, overlapX) * Math.max(0, overlapY);
              totalArea += overlap;
              if (grid[oy][ox]) blackArea += overlap;
            }
          }
          if (totalArea > 0 && blackArea / totalArea >= threshold) {
            outGrid[ny][nx] = 1;
          }
        }
      }
      let bgColor = { r: 1, g: 1, b: 1 };
      const frameFills = original.fills;
      if (Array.isArray(frameFills) && frameFills.length > 0) {
        const first = frameFills[0];
        if (first.type === "SOLID") {
          bgColor = { r: first.color.r, g: first.color.g, b: first.color.b };
        }
      }
      let pixelColor = { r: 0, g: 0, b: 0 };
      if (original.children.length > 0) {
        const firstChild = original.children[0];
        if ("fills" in firstChild) {
          const childFills = firstChild.fills;
          if (Array.isArray(childFills) && childFills.length > 0) {
            const cf = childFills[0];
            if (cf.type === "SOLID") {
              pixelColor = { r: cf.color.r, g: cf.color.g, b: cf.color.b };
            }
          }
        }
      }
      const frame = figma.createFrame();
      frame.name = original.name + " (" + targetWidth + "x" + targetHeight + ")";
      frame.resize(targetWidth, targetHeight);
      frame.fills = [{ type: "SOLID", color: bgColor }];
      frame.clipsContent = true;
      frame.x = Math.round(original.x + original.width + 40);
      frame.y = Math.round(original.y);
      let pixelCount = 0;
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          if (outGrid[y][x]) {
            const rect = figma.createRectangle();
            rect.name = "Pixel";
            rect.resize(1, 1);
            rect.x = x;
            rect.y = y;
            rect.fills = [{ type: "SOLID", color: pixelColor }];
            frame.appendChild(rect);
            pixelCount++;
          }
        }
      }
      frame.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME });
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
      figma.notify("Resized to " + targetWidth + "\xD7" + targetHeight + " (" + pixelCount + " pixels)");
      figma.ui.postMessage({ type: "resize-done" });
      return;
    }
  };
})();
