#!/usr/bin/env python3
"""Verify deploy filters update the PDF index without deleting VPS files."""
from pathlib import Path
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
workflow = (root / '.github/workflows/deploy-vps.yml').read_text()
filters = re.findall(r"--(?:include|exclude)='frontend/public/pdfs/[^']*'", workflow)
assert filters, 'PDF sync filters missing'
filters = [item.replace("'", '') for item in filters]

with tempfile.TemporaryDirectory(prefix='btm-pdf-sync-') as tmp:
    source = Path(tmp) / 'source'
    target = Path(tmp) / 'target'
    src_pdf = source / 'frontend/public/pdfs'
    dst_pdf = target / 'frontend/public/pdfs'
    src_pdf.mkdir(parents=True)
    (dst_pdf / 'archive').mkdir(parents=True)
    (src_pdf / 'index.html').write_text('new index content')
    (dst_pdf / 'index.html').write_text('old')
    (dst_pdf / 'manual.pdf').write_text('server PDF')
    (dst_pdf / 'archive/keep.pdf').write_text('nested PDF')
    subprocess.run(['rsync', '-az', '--delete', *filters, f'{source}/', f'{target}/'], check=True)
    assert (dst_pdf / 'index.html').read_text() == 'new index content'
    assert (dst_pdf / 'manual.pdf').read_text() == 'server PDF'
    assert (dst_pdf / 'archive/keep.pdf').read_text() == 'nested PDF'
print('PDF deploy sync: index updated; server files preserved')
