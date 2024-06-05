import {
  getObjectGroupId,
  RASTER_LAYER_NAME,
  RASTER_LAYER_OBJECT_GROUP_NAME,
} from 'features/controlLayers/konva/naming';
import { createBrushLine, createEraserLine, createRectShape } from 'features/controlLayers/konva/renderers/objects';
import { getScaledFlooredCursorPosition, mapId } from 'features/controlLayers/konva/util';
import type { RasterLayer, Tool } from 'features/controlLayers/store/types';
import Konva from 'konva';
import { assert } from 'tsafe';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logic for creating and rendering raster layers.
 */

/**
 * Creates a raster layer.
 * @param stage The konva stage
 * @param layerState The raster layer state
 * @param onLayerPosChanged Callback for when the layer's position changes
 */
const createRasterLayer = (
  stage: Konva.Stage,
  layerState: RasterLayer,
  onLayerPosChanged?: (layerId: string, x: number, y: number) => void
): Konva.Layer => {
  // This layer hasn't been added to the konva state yet
  const konvaLayer = new Konva.Layer({
    id: layerState.id,
    name: RASTER_LAYER_NAME,
    draggable: true,
    dragDistance: 0,
  });

  // When a drag on the layer finishes, update the layer's position in state. During the drag, konva handles changing
  // the position - we do not need to call this on the `dragmove` event.
  if (onLayerPosChanged) {
    konvaLayer.on('dragend', function (e) {
      onLayerPosChanged(layerState.id, Math.floor(e.target.x()), Math.floor(e.target.y()));
    });
  }

  // The dragBoundFunc limits how far the layer can be dragged
  konvaLayer.dragBoundFunc(function (pos) {
    const cursorPos = getScaledFlooredCursorPosition(stage);
    if (!cursorPos) {
      return this.getAbsolutePosition();
    }
    // Prevent the user from dragging the layer out of the stage bounds by constaining the cursor position to the stage bounds
    if (
      cursorPos.x < 0 ||
      cursorPos.x > stage.width() / stage.scaleX() ||
      cursorPos.y < 0 ||
      cursorPos.y > stage.height() / stage.scaleY()
    ) {
      return this.getAbsolutePosition();
    }
    return pos;
  });

  // The object group holds all of the layer's objects (e.g. lines and rects)
  const konvaObjectGroup = new Konva.Group({
    id: getObjectGroupId(layerState.id, uuidv4()),
    name: RASTER_LAYER_OBJECT_GROUP_NAME,
    listening: false,
  });
  konvaLayer.add(konvaObjectGroup);

  stage.add(konvaLayer);

  return konvaLayer;
};

/**
 * Renders a regional guidance layer.
 * @param stage The konva stage
 * @param layerState The regional guidance layer state
 * @param tool The current tool
 * @param onLayerPosChanged Callback for when the layer's position changes
 */
export const renderRasterLayer = (
  stage: Konva.Stage,
  layerState: RasterLayer,
  tool: Tool,
  onLayerPosChanged?: (layerId: string, x: number, y: number) => void
): void => {
  const konvaLayer =
    stage.findOne<Konva.Layer>(`#${layerState.id}`) ?? createRasterLayer(stage, layerState, onLayerPosChanged);

  // Update the layer's position and listening state
  konvaLayer.setAttrs({
    listening: tool === 'move', // The layer only listens when using the move tool - otherwise the stage is handling mouse events
    x: Math.floor(layerState.x),
    y: Math.floor(layerState.y),
  });

  const konvaObjectGroup = konvaLayer.findOne<Konva.Group>(`.${RASTER_LAYER_OBJECT_GROUP_NAME}`);
  assert(konvaObjectGroup, `Object group not found for layer ${layerState.id}`);

  const objectIds = layerState.objects.map(mapId);
  // Destroy any objects that are no longer in the redux state
  for (const objectNode of konvaObjectGroup.getChildren()) {
    if (!objectIds.includes(objectNode.id())) {
      objectNode.destroy();
    }
  }

  for (const obj of layerState.objects) {
    if (obj.type === 'brush_line') {
      const konvaBrushLine = stage.findOne<Konva.Line>(`#${obj.id}`) ?? createBrushLine(obj, konvaObjectGroup);
      // Only update the points if they have changed.
      if (konvaBrushLine.points().length !== obj.points.length) {
        konvaBrushLine.points(obj.points);
      }
    } else if (obj.type === 'eraser_line') {
      const konvaEraserLine = stage.findOne<Konva.Line>(`#${obj.id}`) ?? createEraserLine(obj, konvaObjectGroup);
      // Only update the points if they have changed.
      if (konvaEraserLine.points().length !== obj.points.length) {
        konvaEraserLine.points(obj.points);
      }
    } else if (obj.type === 'rect_shape') {
      if (!stage.findOne<Konva.Rect>(`#${obj.id}`)) {
        createRectShape(obj, konvaObjectGroup);
      }
    }
  }

  // Only update layer visibility if it has changed.
  if (konvaLayer.visible() !== layerState.isEnabled) {
    konvaLayer.visible(layerState.isEnabled);
  }

  konvaObjectGroup.opacity(layerState.opacity);
};