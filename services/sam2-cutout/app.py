"""
Local SAM 2 cocktail cutout sidecar (no cloud billing).

Setup (GPU recommended):
  python3 -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  # Install SAM 2 from Meta (Apache 2.0):
  pip install git+https://github.com/facebookresearch/sam2.git
  # Download a checkpoint into ./checkpoints (see README.md)

Run:
  uvicorn app:app --host 127.0.0.1 --port 8091
"""

from __future__ import annotations

import base64
import io
import os
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from PIL import Image

app = FastAPI(title="Vibetail SAM 2 cutout", version="0.1.0")

_PREDICTOR = None
_LOADED_MODEL = None


class Sam2Prompt(BaseModel):
    strategy: str = "cocktail_auto"
    positivePointNorm: dict[str, float] = Field(default_factory=lambda: {"x": 0.5, "y": 0.5})
    # Optional extra positive clicks (normalized 0–1).
    positivePointsNorm: list[dict[str, float]] = Field(default_factory=list)
    # Negative clicks (corners / props) to keep the mask off the table.
    negativePointsNorm: list[dict[str, float]] = Field(default_factory=list)
    # Optional XYXY box in normalized coords [x0,y0,x1,y1].
    boxNorm: list[float] | None = None
    multimask: bool = True
    subjectHint: str = "cocktail glass"
    instructions: str = ""
    # Post-process: fill internal holes + light morphological close.
    fillHoles: bool = True
    closeRadius: int = 5
    keepLargestComponent: bool = True
    dilateRadius: int = 1
    refineWithLogits: bool = True


class CutoutRequest(BaseModel):
    imageBase64: str
    contentType: str = "image/jpeg"
    model: str = "sam2.1_hiera_small"
    prompt: Sam2Prompt = Field(default_factory=Sam2Prompt)
    traceId: str | None = None


class CutoutResponse(BaseModel):
    imageBase64: str
    model: str
    debug: dict[str, Any] | None = None


def _checkpoint_paths(model: str) -> tuple[str, str]:
    root = os.path.dirname(os.path.abspath(__file__))
    ckpt_dir = os.path.join(root, "checkpoints")
    table = {
        "sam2.1_hiera_tiny": (
            "sam2.1_hiera_tiny.pt",
            "configs/sam2.1/sam2.1_hiera_t.yaml",
        ),
        "sam2.1_hiera_small": (
            "sam2.1_hiera_small.pt",
            "configs/sam2.1/sam2.1_hiera_s.yaml",
        ),
        "sam2.1_hiera_base_plus": (
            "sam2.1_hiera_base_plus.pt",
            "configs/sam2.1/sam2.1_hiera_b+.yaml",
        ),
        "sam2.1_hiera_large": (
            "sam2.1_hiera_large.pt",
            "configs/sam2.1/sam2.1_hiera_l.yaml",
        ),
    }
    filename, cfg = table.get(model, table["sam2.1_hiera_tiny"])
    return os.path.join(ckpt_dir, filename), cfg


def _get_predictor(model: str):
    global _PREDICTOR, _LOADED_MODEL
    if _PREDICTOR is not None and _LOADED_MODEL == model:
        return _PREDICTOR
    try:
        import torch
        from sam2.build_sam import build_sam2
        from sam2.sam2_image_predictor import SAM2ImagePredictor
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "SAM 2 is not installed. "
                "Run: pip install git+https://github.com/facebookresearch/sam2.git"
            ),
        ) from exc

    ckpt, cfg = _checkpoint_paths(model)
    if not os.path.isfile(ckpt):
        raise HTTPException(
            status_code=503,
            detail=f"Missing checkpoint {ckpt}. Download SAM 2.1 weights into services/sam2-cutout/checkpoints/.",
        )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam = build_sam2(cfg, ckpt, device=device)
    _PREDICTOR = SAM2ImagePredictor(sam)
    _LOADED_MODEL = model
    return _PREDICTOR


def _decode_image(image_b64: str) -> Image.Image:
    raw = base64.b64decode(image_b64)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def _default_cocktail_prompts(width: int, height: int) -> list[dict[str, Any]]:
    """
    Cocktail product shots often put the glass center or right-of-center.
    Try a few geometric prompts and keep the best-scoring mask.
    """
    del width, height  # reserved for future adaptive boxes
    return [
        {
            "name": "box_right_plus_points",
            "points": [
                (0.62, 0.48, 1),
                (0.58, 0.62, 1),
                (0.68, 0.55, 1),
                (0.64, 0.30, 1),  # rim / garnish
                (0.08, 0.08, 0),
                (0.92, 0.08, 0),
                (0.08, 0.92, 0),
                (0.25, 0.35, 0),
                (0.22, 0.75, 0),
            ],
            "box": (0.40, 0.10, 0.97, 0.93),
        },
        {
            "name": "box_center_plus_points",
            "points": [
                (0.50, 0.48, 1),
                (0.50, 0.60, 1),
                (0.45, 0.52, 1),
                (0.50, 0.28, 1),
                (0.08, 0.08, 0),
                (0.92, 0.08, 0),
                (0.08, 0.92, 0),
                (0.92, 0.92, 0),
            ],
            "box": (0.22, 0.08, 0.78, 0.95),
        },
        {
            "name": "points_only_right",
            "points": [
                (0.65, 0.50, 1),
                (0.60, 0.65, 1),
                (0.70, 0.40, 1),
                (0.63, 0.28, 1),
                (0.10, 0.20, 0),
                (0.20, 0.70, 0),
                (0.90, 0.90, 0),
            ],
            "box": None,
        },
    ]


def _rank_mask(mask: np.ndarray, score: float, width: int, height: int) -> float:
    """Prefer solid, mid-sized, reasonably centered drink silhouettes."""
    area = float(mask.sum())
    if area <= 0:
        return -1e9
    img_area = float(width * height)
    frac = area / img_area
    if frac < 0.02 or frac > 0.70:
        return -1e9

    ys, xs = np.where(mask)
    mcx, mcy = float(xs.mean()), float(ys.mean())
    # Prefer subject in the horizontal middle-right band (common for drink hero shots).
    ideal_x = width * 0.58
    ideal_y = height * 0.52
    dist = ((mcx - ideal_x) ** 2 + (mcy - ideal_y) ** 2) ** 0.5
    dist_norm = dist / ((width**2 + height**2) ** 0.5)

    # Compactness / hole penalty: bbox fill ratio + internal transparency.
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    bbox_area = max(1, (x1 - x0 + 1) * (y1 - y0 + 1))
    fill = area / float(bbox_area)
    # Count holes roughly: false pixels inside bbox of true mask.
    crop = mask[y0 : y1 + 1, x0 : x1 + 1]
    hole_frac = 1.0 - float(crop.mean())

    # Aspect: cocktail glasses are taller than wide-ish, but rocks glasses are squat.
    aspect = (y1 - y0 + 1) / max(1, (x1 - x0 + 1))
    aspect_pen = abs(aspect - 1.35) * 0.15

    return (
        float(score) * 2.2
        - dist_norm * 1.2
        - abs(frac - 0.22) * 0.8
        + fill * 1.5
        - hole_frac * 2.5
        - aspect_pen
    )


def _pick_best_mask(masks: np.ndarray, scores: np.ndarray, width: int, height: int) -> tuple[np.ndarray, float, int]:
    best_idx = 0
    best_rank = -1e9
    for i, mask in enumerate(masks):
        conf = float(scores[i]) if i < len(scores) else 0.0
        rank = _rank_mask(np.asarray(mask).astype(bool), conf, width, height)
        if rank > best_rank:
            best_rank = rank
            best_idx = i
    return np.asarray(masks[best_idx]).astype(bool), best_rank, best_idx


def _fill_holes(mask: np.ndarray) -> np.ndarray:
    """Fill internal False regions not connected to the image border."""
    u8 = (mask.astype(np.uint8)) * 255
    h, w = u8.shape
    # Ensure we flood from a known background border pixel.
    inv = cv2.bitwise_not(u8)
    ff = inv.copy()
    flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    seed = None
    for y, x in ((0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)):
        if u8[y, x] == 0:
            seed = (x, y)
            break
    if seed is None:
        # Mask touches all corners — search first border background pixel.
        for x in range(w):
            if u8[0, x] == 0:
                seed = (x, 0)
                break
            if u8[h - 1, x] == 0:
                seed = (x, h - 1)
                break
    if seed is None:
        return mask.astype(bool)
    cv2.floodFill(ff, flood_mask, seed, 255)
    # Pixels that stayed 0 in ff are enclosed holes in the inverted image.
    holes = (ff == 0) & (u8 == 0)
    return (mask.astype(bool) | holes)


def _keep_largest_component(mask: np.ndarray) -> np.ndarray:
    """Keep the largest connected component (drop stray fruit blobs)."""
    u8 = (mask.astype(np.uint8)) * 255
    n, labels, stats, _ = cv2.connectedComponentsWithStats(u8, connectivity=8)
    if n <= 1:
        return mask.astype(bool)
    areas = stats[1:, cv2.CC_STAT_AREA]
    best = 1 + int(np.argmax(areas))
    return labels == best


def _morph_close(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    u8 = (mask.astype(np.uint8)) * 255
    return cv2.morphologyEx(u8, cv2.MORPH_CLOSE, kernel) > 127


def _morph_open(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    u8 = (mask.astype(np.uint8)) * 255
    return cv2.morphologyEx(u8, cv2.MORPH_OPEN, kernel) > 127


def _dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    u8 = (mask.astype(np.uint8)) * 255
    return cv2.dilate(u8, kernel) > 127


def _trim_bright_fringe(rgb: np.ndarray, mask: np.ndarray, *, max_luma: float = 210.0) -> np.ndarray:
    """
    Drop near-white edge spikes (blown background bits stuck to the rim/base).
    Only touches a thin outer ring so ice highlights inside the drink stay.
    """
    if not mask.any():
        return mask
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    # Outer ring: in mask, within 3px of exterior.
    exterior = ~mask
    near_exterior = _dilate(exterior, 3) & mask
    # Also require neighbor exterior to be bright (true background bleed).
    exterior_luma = luma.copy()
    exterior_luma[mask] = 0
    bright_exterior_near = _dilate(exterior_luma >= max_luma, 2) & near_exterior
    drop = near_exterior & (luma >= max_luma) & bright_exterior_near
    return mask & ~drop


def _erode(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    u8 = (mask.astype(np.uint8)) * 255
    return cv2.erode(u8, kernel) > 127


def _crop_rgba_to_mask(rgb: Image.Image, mask: np.ndarray, *, pad_frac: float = 0.03) -> Image.Image:
    """Tight crop around the subject so wardrobe assets aren't full-bleed empty canvas."""
    ys, xs = np.where(mask)
    if len(xs) == 0:
        arr = np.array(rgb)
        alpha = (mask.astype(np.uint8) * 255)[:, :, None]
        return Image.fromarray(np.concatenate([arr, alpha], axis=2), mode="RGBA")
    h, w = mask.shape
    pad_x = int(round((xs.max() - xs.min() + 1) * pad_frac))
    pad_y = int(round((ys.max() - ys.min() + 1) * pad_frac))
    x0 = max(0, int(xs.min()) - pad_x)
    y0 = max(0, int(ys.min()) - pad_y)
    x1 = min(w, int(xs.max()) + 1 + pad_x)
    y1 = min(h, int(ys.max()) + 1 + pad_y)
    arr = np.array(rgb)[y0:y1, x0:x1]
    alpha = (mask[y0:y1, x0:x1].astype(np.uint8) * 255)[:, :, None]
    return Image.fromarray(np.concatenate([arr, alpha], axis=2), mode="RGBA")


def _refine_mask(
    mask: np.ndarray,
    *,
    fill_holes: bool,
    close_radius: int,
    keep_largest: bool,
    dilate_radius: int = 1,
    erode_radius: int = 1,
    rgb: np.ndarray | None = None,
) -> np.ndarray:
    out = mask.astype(bool)
    if keep_largest:
        out = _keep_largest_component(out)
    out = _morph_open(out, 1)
    if close_radius > 0:
        out = _morph_close(out, close_radius)
    if dilate_radius > 0:
        out = _dilate(out, dilate_radius)
    if fill_holes:
        out = _fill_holes(out)
    if keep_largest:
        out = _keep_largest_component(out)
    if rgb is not None:
        out = _trim_bright_fringe(rgb, out)
        if fill_holes:
            out = _fill_holes(out)
        if keep_largest:
            out = _keep_largest_component(out)
    # Final 1px erode kills residual white halo without eating the silhouette.
    if erode_radius > 0:
        out = _erode(out, erode_radius)
        if fill_holes:
            out = _fill_holes(out)
    return out


def _mask_to_box_norm(mask: np.ndarray, pad: float = 0.04) -> tuple[float, float, float, float]:
    ys, xs = np.where(mask)
    h, w = mask.shape
    x0 = max(0.0, xs.min() / w - pad)
    y0 = max(0.0, ys.min() / h - pad)
    x1 = min(1.0, xs.max() / w + pad)
    y1 = min(1.0, ys.max() / h + pad)
    return (x0, y0, x1, y1)


def _predict_masks(
    predictor: Any,
    points: list[tuple[float, float, int]],
    box: tuple[float, float, float, float] | None,
    width: int,
    height: int,
    multimask: bool,
    mask_input: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    import torch

    point_coords = None
    point_labels = None
    if points:
        point_coords = np.array([[p[0] * width, p[1] * height] for p in points], dtype=np.float32)
        point_labels = np.array([p[2] for p in points], dtype=np.int32)
    box_xyxy = None
    if box is not None:
        x0, y0, x1, y1 = box
        box_xyxy = np.array([x0 * width, y0 * height, x1 * width, y1 * height], dtype=np.float32)

    with torch.inference_mode():
        masks, scores, logits = predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels,
            box=box_xyxy,
            mask_input=mask_input,
            multimask_output=multimask if mask_input is None else False,
        )
    return np.asarray(masks), np.asarray(scores), np.asarray(logits)


def _apply_mask(rgb: Image.Image, mask: np.ndarray, *, crop: bool = True) -> bytes:
    if crop:
        out = _crop_rgba_to_mask(rgb, mask)
    else:
        arr = np.array(rgb)
        alpha = (mask.astype(np.uint8) * 255)[:, :, None]
        out = Image.fromarray(np.concatenate([arr, alpha], axis=2), mode="RGBA")
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return buf.getvalue()


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "sam2-cutout", "model_loaded": _LOADED_MODEL}


@app.post("/v1/cutout", response_model=CutoutResponse)
def cutout(body: CutoutRequest) -> CutoutResponse:
    image = _decode_image(body.imageBase64)
    width, height = image.size
    prompt = body.prompt
    predictor = _get_predictor(body.model)

    np_image = np.array(image)
    import torch

    with torch.inference_mode():
        predictor.set_image(np_image)

    attempts: list[dict[str, Any]] = []
    strategy = (prompt.strategy or "cocktail_auto").strip()

    if strategy in ("cocktail_auto", "auto"):
        attempt_defs = _default_cocktail_prompts(width, height)
    else:
        points: list[tuple[float, float, int]] = []
        px = float(prompt.positivePointNorm.get("x", 0.5))
        py = float(prompt.positivePointNorm.get("y", 0.5))
        points.append((px, py, 1))
        for p in prompt.positivePointsNorm:
            points.append((float(p.get("x", 0.5)), float(p.get("y", 0.5)), 1))
        for p in prompt.negativePointsNorm:
            points.append((float(p.get("x", 0.0)), float(p.get("y", 0.0)), 0))
        box = None
        if prompt.boxNorm and len(prompt.boxNorm) == 4:
            box = (
                float(prompt.boxNorm[0]),
                float(prompt.boxNorm[1]),
                float(prompt.boxNorm[2]),
                float(prompt.boxNorm[3]),
            )
        attempt_defs = [{"name": strategy or "client", "points": points, "box": box}]

    best_mask: np.ndarray | None = None
    best_rank = -1e9
    best_meta: dict[str, Any] = {}
    close_radius = int(prompt.closeRadius)
    dilate_radius = int(getattr(prompt, "dilateRadius", 1) or 0)
    refine_logits = bool(getattr(prompt, "refineWithLogits", True))

    for attempt in attempt_defs:
        try:
            masks, scores, logits = _predict_masks(
                predictor,
                attempt["points"],
                attempt["box"],
                width,
                height,
                bool(prompt.multimask),
            )
        except Exception as exc:  # noqa: BLE001 — try next geometric prompt
            attempts.append({"name": attempt["name"], "error": str(exc)})
            continue
        if masks is None or len(masks) == 0:
            attempts.append({"name": attempt["name"], "error": "no masks"})
            continue

        mask, rank, idx = _pick_best_mask(masks, scores, width, height)

        # Second pass: feed best-mask logits back into SAM 2 for a tighter silhouette.
        if refine_logits and logits is not None and len(logits) > idx:
            try:
                mask_input = logits[idx].astype(np.float32)[None, :, :]
                masks2, scores2, _ = _predict_masks(
                    predictor,
                    attempt["points"],
                    attempt["box"],
                    width,
                    height,
                    False,
                    mask_input=mask_input,
                )
                if masks2 is not None and len(masks2) > 0:
                    mask = np.asarray(masks2[0]).astype(bool)
                    rank = _rank_mask(mask, float(scores2[0]) if len(scores2) else 0.0, width, height)
            except Exception as exc:  # noqa: BLE001
                attempts.append({"name": f"{attempt['name']}_refine", "error": str(exc)})

        refined = _refine_mask(
            mask,
            fill_holes=bool(prompt.fillHoles),
            close_radius=close_radius,
            keep_largest=bool(prompt.keepLargestComponent),
            dilate_radius=dilate_radius,
            rgb=np_image,
        )
        refined_rank = _rank_mask(refined, float(scores[idx]) if idx < len(scores) else 0.0, width, height)
        attempts.append(
            {
                "name": attempt["name"],
                "maskIndex": idx,
                "rawRank": rank,
                "refinedRank": refined_rank,
                "opaqueFrac": float(refined.mean()),
            }
        )
        if refined_rank > best_rank:
            best_rank = refined_rank
            best_mask = refined
            best_meta = {"attempt": attempt["name"], "rank": refined_rank}

    if best_mask is None:
        raise HTTPException(status_code=422, detail="SAM 2 returned no usable masks")

    # Stage 2: tighten with a bbox derived from the best coarse mask.
    try:
        tight_box = _mask_to_box_norm(best_mask, pad=0.05)
        ys, xs = np.where(best_mask)
        cx = float(xs.mean()) / width
        cy = float(ys.mean()) / height
        # Sample a few positives inside the mask; negatives just outside the box.
        x0, y0, x1, y1 = tight_box
        stage2_points = [
            (cx, cy, 1),
            (cx, min(0.95, cy + 0.08), 1),
            (cx, max(0.05, cy - 0.12), 1),  # toward rim/garnish
            (max(0.01, x0 - 0.03), max(0.01, y0 - 0.03), 0),
            (min(0.99, x1 + 0.03), max(0.01, y0 - 0.03), 0),
            (max(0.01, x0 - 0.03), min(0.99, y1 + 0.03), 0),
        ]
        masks2, scores2, logits2 = _predict_masks(
            predictor,
            stage2_points,
            tight_box,
            width,
            height,
            True,
        )
        mask2, rank2, idx2 = _pick_best_mask(masks2, scores2, width, height)
        if refine_logits and logits2 is not None and len(logits2) > idx2:
            mask_input = logits2[idx2].astype(np.float32)[None, :, :]
            masks3, scores3, _ = _predict_masks(
                predictor,
                stage2_points,
                tight_box,
                width,
                height,
                False,
                mask_input=mask_input,
            )
            if masks3 is not None and len(masks3) > 0:
                mask2 = np.asarray(masks3[0]).astype(bool)
                rank2 = _rank_mask(mask2, float(scores3[0]) if len(scores3) else 0.0, width, height)
        refined2 = _refine_mask(
            mask2,
            fill_holes=bool(prompt.fillHoles),
            close_radius=close_radius,
            keep_largest=bool(prompt.keepLargestComponent),
            dilate_radius=dilate_radius,
            rgb=np_image,
        )
        refined2_rank = _rank_mask(refined2, rank2, width, height)
        attempts.append(
            {
                "name": "tight_box_stage2",
                "maskIndex": idx2,
                "rawRank": rank2,
                "refinedRank": refined2_rank,
                "opaqueFrac": float(refined2.mean()),
                "box": tight_box,
            }
        )
        if refined2_rank >= best_rank - 0.15:  # prefer tighter stage when close
            best_mask = refined2
            best_meta = {"attempt": "tight_box_stage2", "rank": refined2_rank, "box": tight_box}
            best_rank = refined2_rank
    except Exception as exc:  # noqa: BLE001
        attempts.append({"name": "tight_box_stage2", "error": str(exc)})

    png = _apply_mask(image, best_mask)
    return CutoutResponse(
        imageBase64=base64.b64encode(png).decode("ascii"),
        model=body.model,
        debug={"best": best_meta, "attempts": attempts},
    )
