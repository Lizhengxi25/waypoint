"""Build a single self-contained dist/index.html from src/ (fonts embedded as base64)."""
import base64, pathlib, re
root = pathlib.Path(__file__).parent
src = root / "src"
html = (src / "index.html").read_text()
fonts = []
for fam, file, weight, style in [("Plex Sans","plex.woff2","400 600","normal"),("Plex Sans","plex-italic.woff2","400","italic"),
                                 ("Source Serif","serif.woff2","400 600","normal"),("Plex Mono","mono.woff2","400","normal")]:
    b = base64.b64encode((src/"fonts"/file).read_bytes()).decode()
    fonts.append(f"@font-face{{font-family:'{fam}';src:url(data:font/woff2;base64,{b}) format('woff2');font-weight:{weight};font-style:{style};font-display:swap}}")
html = html.replace('<link rel="stylesheet" href="fonts/fonts.css"><!--FONTS-->', "<style>" + "".join(fonts) + "</style>")
html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + (src/"styles.css").read_text() + "\n</style>")
html = html.replace('<script src="data.js"></script>', "<script>\n" + (src/"data.js").read_text() + "\n</script>")
html = html.replace('<script src="app.js"></script>', "<script>\n" + (src/"app.js").read_text() + "\n</script>")
(root/"dist").mkdir(exist_ok=True)
(root/"dist"/"Waypoint.html").write_text(html)
print("dist/Waypoint.html", len(html)//1024, "KB")
