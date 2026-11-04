#!/usr/bin/env python3
"""Check that deployment leaves VPS PDFs untouched and ships the current index."""
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
workflow = (root / '.github/workflows/deploy-vps.yml').read_text()
dockerfile = (root / 'frontend/Dockerfile.prod').read_text()
assert "--exclude='frontend/public/pdfs/'" in workflow
assert "--include='frontend/public/pdfs/" not in workflow
assert 'cp pdf-index.html public/pdfs/index.html' in dockerfile
assert (root / 'frontend/pdf-index.html').read_bytes() == (root / 'frontend/public/pdfs/index.html').read_bytes(), 'PDF index copies differ'

with tempfile.TemporaryDirectory(prefix='btm-pdf-sync-') as tmp:
    source = Path(tmp) / 'source'
    target = Path(tmp) / 'target'
    src_pdf = source / 'frontend/public/pdfs'
    dst_pdf = target / 'frontend/public/pdfs'
    src_pdf.mkdir(parents=True)
    (dst_pdf / 'archive').mkdir(parents=True)
    (source / 'frontend/pdf-index.html').write_text('new index')
    (src_pdf / 'index.html').write_text('local index')
    (dst_pdf / 'index.html').write_text('old server index')
    (dst_pdf / 'manual.pdf').write_text('server PDF')
    (dst_pdf / 'archive/keep.pdf').write_text('nested PDF')
    subprocess.run(['rsync', '-az', '--delete', '--exclude=frontend/public/pdfs/', f'{source}/', f'{target}/'], check=True)
    assert (target / 'frontend/pdf-index.html').read_text() == 'new index'
    assert (dst_pdf / 'index.html').read_text() == 'old server index'
    assert (dst_pdf / 'manual.pdf').read_text() == 'server PDF'
    assert (dst_pdf / 'archive/keep.pdf').read_text() == 'nested PDF'
print('PDF deploy: server directory excluded; current index available for image build')
