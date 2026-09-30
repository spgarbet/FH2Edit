#!/usr/bin/env python3

import base64
import html
import mimetypes
import re
import sys
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

if len(sys.argv) != 3:
    print(f"usage: {sys.argv[0]} input.html output.html", file=sys.stderr)
    sys.exit(2)

input_file = Path(sys.argv[1]).resolve()
output_file = Path(sys.argv[2])
root = input_file.parent

text = input_file.read_text(encoding="utf-8")

# Process <img ... src="..."> and <source ... src="..."> tags.
tag_re = re.compile(
    r"(<(?:img|source)\b[^>]*?\bsrc\s*=\s*)([\"'])(.*?)(\2)",
    re.IGNORECASE | re.DOTALL,
)

def replace_image(match):
    prefix, quote, reference, closing_quote = match.groups()

    # Leave remote URLs, fragments, and existing data URLs alone.
    parts = urlsplit(reference)
    if parts.scheme or parts.netloc or reference.startswith("data:"):
        return match.group(0)

    filename = unquote(parts.path)
    path = (root / filename).resolve()

    # Normalize ".." components, but do not follow symbolic links.
    path = Path(os.path.abspath(os.path.join(root, filename)))

    try:
        path.relative_to(root)
    except ValueError:
        print(f"skip outside document directory: {reference}", file=sys.stderr)
        return match.group(0)


    if not path.is_file():
        print(f"missing image: {path}", file=sys.stderr)
        return match.group(0)

    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    data_url = f"data:{mime};base64,{encoded}"

    return prefix + quote + html.escape(data_url, quote=True) + closing_quote

result = tag_re.sub(replace_image, text)
output_file.write_text(result, encoding="utf-8")
