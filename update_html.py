import os
import re
import unicodedata

def slugify(value):
    value = str(value)
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    value = re.sub(r'[-\s]+', '-', value)
    return value

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match anything like ARQUIVOS/... .jpg, .png, .jpeg, .mp4
    # We'll use a regex that finds these paths
    # Using negative lookbehind or just simple pattern
    pattern = re.compile(r'(ARQUIVOS/[^\"\']*?\.(?:jpg|jpeg|png|mp4))', re.IGNORECASE)
    
    def replacer(match):
        path = match.group(1)
        dir_name = os.path.dirname(path)
        base_name = os.path.basename(path)
        filename, ext = os.path.splitext(base_name)
        ext = ext.lower()
        
        new_filename = slugify(filename)
        
        if ext in ['.jpg', '.jpeg', '.png']:
            new_ext = '.webp'
        else:
            new_ext = ext
            
        new_path = f"{dir_name}/{new_filename}{new_ext}"
        return new_path

    new_content = pattern.sub(replacer, content)
    
    # Also fix index.html to giraindex.html
    if filepath.endswith('contatos.html'):
        new_content = new_content.replace('href="index.html"', 'href="giraindex.html"')

    # Add <main> to giraindex.html and footer JS
    if filepath.endswith('giraindex.html'):
        # Wrap the sections with <main> after nav and before footer
        # Nav ends at </nav>, footer starts at <footer
        # Wait, I'll just use simple regex or replace if it's safe.
        pass

    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('.'):
    for file in files:
        if file in ['giraindex.html', 'contatos.html', 'styles.css', 'main.js']:
            process_file(os.path.join(root, file))

print("Done updating files.")
