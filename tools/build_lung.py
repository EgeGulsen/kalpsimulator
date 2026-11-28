"""BodyParts3D STL parçalarından assets/lung.glb üretir (akciğer atlası).

Loblar ayrı düğümler olarak saklanır; trakea, bronş ağacı, pulmoner arter ve venler, diyafram ve
bağlam için kalp duvarı eklenir. Dönüşüm build_body.py ile aynıdır: merkez kalp duvarı (FMA7274),
1 birim = 40 mm, three.js eksenleri (x sol, y yukarı, z ön).
Kaynak: BodyParts3D (c) 2008 Life Science Integrated Database Center, CC BY-SA 2.1 JP.

Kullanım: python3 tools/build_lung.py <stl klasörü> assets/lung.glb
Gerekli: pip install trimesh fast-simplification numpy scipy
"""
import sys, os, numpy as np, trimesh, fast_simplification as fs

SRC, OUT = sys.argv[1], sys.argv[2]
def L(i): return trimesh.load(f"{SRC}/FMA{i}.stl", process=True)
def simplify(m, target):
    if len(m.faces) <= target: return m
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_reduction=1 - target / len(m.faces))
    return trimesh.Trimesh(v, f, process=True)

center = L(7274).bounds.mean(0)
def tx(p):
    p = (np.asarray(p) - center) / 40.0
    return np.stack([p[..., 0], p[..., 2], -p[..., 1]], -1)

PARTS = {
    'rul': (7333, 6000),   # sağ üst lob
    'rml': (7383, 4000),   # sağ orta lob
    'rll': (7337, 7000),   # sağ alt lob
    'lul': (7370, 7000),   # sol üst lob (lingula dahil)
    'lll': (7371, 7000),   # sol alt lob
    'trakea': (7394, 3000),
    'brons': (7409, 14000),
    'pa': (66326, 9000),
    'pv': (66643, 7000),
    'diyafram': (13295, 5000),
    'kalp': (7274, 6000),
}
scene = trimesh.Scene()
for k, (i, n) in PARTS.items():
    m = simplify(L(i), n)
    mm = trimesh.Trimesh(tx(m.vertices), m.faces, process=True)
    scene.add_geometry(mm, node_name=k, geom_name=k)
    print(k, len(mm.faces), mm.bounds.round(2).tolist())
open(OUT, 'wb').write(scene.export(file_type='glb', include_normals=False))
print(os.path.getsize(OUT))
