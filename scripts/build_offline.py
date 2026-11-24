"""Build the single-file edition from the published site and its local assets."""
import base64
import json
import mimetypes
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def data_url(path):
    mime, _ = mimetypes.guess_type(path.name)
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def build():
    html = (ROOT / "index.html").read_text()
    style = (ROOT / "style.css").read_text()
    for font in (ROOT / "fonts").glob("*.woff"):
        style = style.replace(font.relative_to(ROOT).as_posix(), data_url(font))
    scripts = ["storageService.js", "progressUI.js", "app.js"]
    app = "\n".join((ROOT / name).read_text() for name in scripts)
    data = json.loads((ROOT / "roadmap.json").read_text())
    for path in (ROOT / "assets").iterdir():
        name = path.relative_to(ROOT).as_posix()
        url = data_url(path)
        html = html.replace(name, url)
        app = app.replace(name, url)
    for figure in data["research_figures"]:
        figure["path"] = data_url(ROOT / figure["path"])

    payload = json.dumps(data, ensure_ascii=False).replace("<", r"\u003c")
    html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>{style}</style>")
    for name in scripts:
        html = html.replace(f'  <script src="{name}" defer></script>\n', "")
    scripts = f'<script type="application/json" id="roadmap-data">{payload}</script><script>{app}</script>'
    # Keep the existing offline path so bookmarks and browser progress keep working.
    (ROOT / "HUB-Atlas.html").write_text(html.replace("</body>", scripts + "</body>"))


if __name__ == "__main__":
    build()
