import re
import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update copyright year
    content = content.replace('© 2026 GIRASSOL', '© <span id="current-year">2026</span> GIRASSOL')
    
    # 2. Append JS script before </body>
    js_script = """
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            const yearSpan = document.getElementById("current-year");
            if (yearSpan) {
                yearSpan.textContent = new Date().getFullYear();
            }
        });
    </script>
"""
    if 'id="current-year"' in content and 'yearSpan.textContent = ' not in content:
        content = content.replace('</body>', js_script + '</body>')

    # 3. For giraindex.html specifically
    if 'giraindex.html' in filepath:
        # Wrap main content
        if '<main' not in content:
            content = content.replace('</nav>\n', '</nav>\n  <main class="overflow-hidden">\n')
            content = content.replace('  <footer ', '  </main>\n  <footer ')

        # FAQ accessibility
        # The FAQ buttons probably have class "faq-btn". Let's add aria attributes.
        content = re.sub(r'(class="[^"]*faq-btn[^"]*")', r'\1 aria-expanded="false"', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
process_file('giraindex.html')
process_file('contatos.html')
print("HTML updated.")
