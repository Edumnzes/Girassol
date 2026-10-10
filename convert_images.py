import os
import re
import unicodedata
from PIL import Image
import sys

def slugify(value):
    """
    Normalizes string, converts to lowercase, removes non-alpha characters,
    and converts spaces to hyphens.
    """
    value = str(value)
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    value = re.sub(r'[-\s]+', '-', value)
    return value

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            filepath = os.path.join(root, file)
            filename, ext = os.path.splitext(file)
            ext_lower = ext.lower()
            
            # Slugify the filename (without extension)
            new_filename = slugify(filename)
            
            if ext_lower in ['.jpg', '.jpeg', '.png']:
                new_filepath = os.path.join(root, new_filename + '.webp')
                try:
                    with Image.open(filepath) as img:
                        # Convert to RGB if it's not and saving as WebP (WebP supports RGBA)
                        # but some modes might need conversion.
                        if img.mode not in ('RGB', 'RGBA'):
                            img = img.convert('RGBA')
                        img.save(new_filepath, 'webp')
                        print(f"Converted: {filepath} -> {new_filepath}")
                    
                    # Delete old file
                    os.remove(filepath)
                except Exception as e:
                    print(f"Error processing {filepath}: {e}")
            elif ext_lower in ['.mp4']:
                # For videos just rename
                new_filepath = os.path.join(root, new_filename + ext_lower)
                if filepath != new_filepath:
                    try:
                        os.rename(filepath, new_filepath)
                        print(f"Renamed: {filepath} -> {new_filepath}")
                    except Exception as e:
                        print(f"Error renaming {filepath}: {e}")

if __name__ == "__main__":
    if not os.path.exists('ARQUIVOS'):
        print("ARQUIVOS directory not found.")
        sys.exit(1)
        
    process_directory('ARQUIVOS')
    print("Done processing files.")
