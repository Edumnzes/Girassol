import re

def clean_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace stylesheet link
    content = content.replace('href="styles.css"', 'href="styles.min.css"')
    
    # Remove tailwind CDN
    content = re.sub(r'<script src="https://cdn\.tailwindcss\.com"></script>\s*', '', content)
    
    # Remove tailwind config block
    content = re.sub(r'<script>\s*tailwind\.config\s*=\s*\{.*?\};\s*</script>\s*', '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

clean_html('giraindex.html')
clean_html('contatos.html')
print("HTML cleaned.")
