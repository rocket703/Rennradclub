#!/usr/bin/env python3
"""Erstellt fotomap/data/photos.json aus JPEGs in fotomap/photos/."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from PIL import Image

FOTOMAP_DIR = Path(__file__).resolve().parents[1]
PHOTOS_DIR = FOTOMAP_DIR / "photos"
OUTPUT_FILE = FOTOMAP_DIR / "data" / "photos.json"
ALLOWED_SUFFIXES = {".jpg", ".jpeg"}
GPS_IFD_TAG = 34853
DATETIME_ORIGINAL_TAG = 36867


def rational_to_float(value) -> float:
    return float(value)


def dms_to_decimal(values) -> float:
    degrees = rational_to_float(values[0])
    minutes = rational_to_float(values[1])
    seconds = rational_to_float(values[2])
    return degrees + minutes / 60.0 + seconds / 3600.0


def extract_gps(image_path: Path):
    with Image.open(image_path) as image:
        exif = image.getexif()
        if not exif:
            return None, None

        try:
            gps = exif.get_ifd(GPS_IFD_TAG)
        except Exception:
            gps = None

        if not gps:
            return None, exif.get(DATETIME_ORIGINAL_TAG)

        latitude = gps.get(2)
        latitude_ref = gps.get(1)
        longitude = gps.get(4)
        longitude_ref = gps.get(3)

        if not all([latitude, latitude_ref, longitude, longitude_ref]):
            return None, exif.get(DATETIME_ORIGINAL_TAG)

        lat = dms_to_decimal(latitude)
        lon = dms_to_decimal(longitude)

        if str(latitude_ref).upper().replace("B'", "").strip("'") == "S":
            lat = -lat
        if str(longitude_ref).upper().replace("B'", "").strip("'") == "W":
            lon = -lon

        return (lat, lon), exif.get(DATETIME_ORIGINAL_TAG)


def format_exif_date(value):
    if not value:
        return None

    text = str(value)
    try:
        parsed = datetime.strptime(text, "%Y:%m:%d %H:%M:%S")
        return parsed.strftime("%d.%m.%Y %H:%M")
    except ValueError:
        return text


def web_path(path: Path) -> str:
    relative = path.relative_to(FOTOMAP_DIR).as_posix()
    return "./" + "/".join(quote(part) for part in relative.split("/"))


def main() -> int:
    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    photos = []
    skipped = []

    image_paths = sorted(
        path
        for path in PHOTOS_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in ALLOWED_SUFFIXES
    )

    for image_path in image_paths:
        try:
            gps, taken_at = extract_gps(image_path)
        except Exception as error:
            skipped.append(f"{image_path.name}: Fehler beim Lesen ({error})")
            continue

        if gps is None:
            skipped.append(f"{image_path.name}: keine GPS-EXIF-Daten")
            continue

        lat, lon = gps
        photos.append(
            {
                "id": image_path.relative_to(PHOTOS_DIR).as_posix(),
                "name": image_path.name,
                "url": web_path(image_path),
                "lat": round(lat, 8),
                "lon": round(lon, 8),
                "takenAt": format_exif_date(taken_at),
            }
        )

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "count": len(photos),
        "photos": photos,
    }

    OUTPUT_FILE.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Fotomap: {len(photos)} Foto(s) in {OUTPUT_FILE}")
    for message in skipped:
        print(f"WARNUNG: {message}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
