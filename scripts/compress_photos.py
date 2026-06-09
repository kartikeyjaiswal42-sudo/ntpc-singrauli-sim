#!/usr/bin/env python3
import os
import sys
import shutil
from pathlib import Path
from PIL import Image, ImageOps
import time

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path("/Users/kumarkartikey/Documents/New project/NTPC PLANT photos")
DEST_DIR = ROOT / "public" / "photos"

def process_image(src_path, dest_path):
    try:
        with Image.open(src_path) as img:
            # Auto-orient using EXIF orientation tag
            img = ImageOps.exif_transpose(img)
            
            # Convert RGBA to RGB if necessary (JPEGs are RGB)
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGB")
                
            w, h = img.size
            max_dim = 1500
            
            # Scale down if either dimension exceeds max_dim
            if w > max_dim or h > max_dim:
                if w > h:
                    new_w = max_dim
                    new_h = int(h * max_dim / w)
                else:
                    new_h = max_dim
                    new_w = int(w * max_dim / h)
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(dest_path, "JPEG", quality=75, optimize=True)
        return True
    except Exception as e:
        print(f"Error processing {src_path.name}: {e}", file=sys.stderr)
        return False

def main():
    if not SRC_DIR.exists():
        print(f"Source directory not found: {SRC_DIR}", file=sys.stderr)
        sys.exit(1)
        
    DEST_DIR.mkdir(parents=True, exist_ok=True)
    
    files = sorted(list(SRC_DIR.iterdir()))
    img_files = [f for f in files if f.is_file() and f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
    video_files = [f for f in files if f.is_file() and f.suffix.lower() in (".mp4", ".mov")]
    
    print(f"Found {len(img_files)} images and {len(video_files)} videos in {SRC_DIR}")
    
    # Process images
    start_time = time.time()
    success_count = 0
    
    for i, img_path in enumerate(img_files):
        dest_path = DEST_DIR / f"{img_path.stem}.jpg"
        print(f"[{i+1}/{len(img_files)}] Processing {img_path.name} -> {dest_path.name}...", end="\r")
        if process_image(img_path, dest_path):
            success_count += 1
            
    print(f"\nSuccessfully processed {success_count}/{len(img_files)} images.")
    
    # Copy videos as static assets
    print("Copying video files...")
    video_count = 0
    for video_path in video_files:
        dest_path = DEST_DIR / video_path.name
        print(f"Copying {video_path.name} -> {dest_path.name}...")
        try:
            shutil.copy2(video_path, dest_path)
            video_count += 1
        except Exception as e:
            print(f"Error copying {video_path.name}: {e}", file=sys.stderr)
            
    print(f"Copied {video_count}/{len(video_files)} videos.")
    elapsed = time.time() - start_time
    print(f"Finished in {elapsed:.2f} seconds.")

if __name__ == "__main__":
    main()
