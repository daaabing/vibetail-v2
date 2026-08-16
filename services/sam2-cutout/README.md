# SAM 2 cocktail cutout sidecar

Free, local background removal via [Meta SAM 2](https://github.com/facebookresearch/sam2). No Aliyun/OpenRouter billing. Vibetail calls this over HTTP when `IMAGE_CUTOUT_PROVIDER=sam2`.

## Prompt strategy (cocktail-tailored)

SAM 2 is **promptable segmentation** (clicks/boxes), not generative redraw:

1. One **positive center click** (drinks are usually centered).
2. `multimask_output=true`, then pick the mask that is confident, centered, and not the full table.
3. Keep original subject pixels; alpha = mask. No invented text.

The TypeScript client sends `buildSam2CocktailPrompt(...)` with those instructions.

## Setup

```bash
cd services/sam2-cutout
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install git+https://github.com/facebookresearch/sam2.git

mkdir -p checkpoints
# Tiny checkpoint (smallest). Prefer sam2.1_hiera_small for cleaner cocktail edges.
curl -L -o checkpoints/sam2.1_hiera_tiny.pt \
  https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt
# Optional better quality:
# curl -L -o checkpoints/sam2.1_hiera_small.pt \
#   https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt
```

GPU is strongly recommended. CPU works but is slow.

## Run

```bash
source .venv/bin/activate
uvicorn app:app --host 127.0.0.1 --port 8091
```

## Vibetail env

Used by venue drink photo prepare (`POST /v1/venue/drinks/photo`):

```bash
IMAGE_CUTOUT_PROVIDER=sam2
SAM2_CUTOUT_URL=http://127.0.0.1:8091
IMAGE_CUTOUT_MODEL=sam2.1_hiera_small
```

Menu photo/URL import stays on the main venue UI (`/venue/menus`); SAM 2 only handles drink cutouts.

Do **not** commit `.pt` weights — only this service code.
