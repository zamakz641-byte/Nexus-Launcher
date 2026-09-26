from PIL import Image
from pathlib import Path

src = Path(r"D:\manhwa studio\Nexus\frontend\public\assets\brand\nexus-mark.png")
dst = Path(r"D:\manhwa studio\Nexus\frontend\public\assets\brand\nexus-mark.ico")
img = Image.open(src).convert("RGBA")
img.save(dst, format="ICO", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print(img.size)
print(dst)
