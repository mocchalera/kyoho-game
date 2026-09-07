"""Compile the dependency-free source into a portable index.html."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / 'src'
parts = ['coast.js', 'engine.js', 'terrain.js', 'landmarks-data.js', 'places.js', 'game.js']
scripts = '\n'.join('<script>\n' + (src / name).read_text(encoding='utf-8') + '\n</script>' for name in parts)
(root / 'index.html').write_text((src / 'shell.html').read_text(encoding='utf-8').replace('<!-- SCRIPTS -->', scripts), encoding='utf-8')
print('Built index.html')
