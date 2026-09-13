#!/usr/bin/env python3

import re
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote


def local_file(base_dir, reference):
    parsed = urlparse(reference)

    # Leave remote URLs and data URLs unchanged
    if parsed.scheme or reference.startswith("//"):
        return None

    path = unquote(parsed.path)
    return (base_dir / path).resolve()


def inline_html(input_file, output_file):
    input_file = Path(input_file).resolve()
    html = input_file.read_text(encoding="utf-8")
    base_dir = input_file.parent

    # Inline <script src="..."></script>
    script_pattern = re.compile(
        r'<script\b([^>]*?)\bsrc=["\']([^"\']+)["\']([^>]*)>\s*</script>',
        re.IGNORECASE
    )

    def replace_script(match):
        before = match.group(1)
        src = match.group(2)
        after = match.group(3)
        path = local_file(base_dir, src)

        if path is None:
            return match.group(0)

        if not path.exists():
            print(f"Warning: missing JavaScript file: {path}", file=sys.stderr)
            return match.group(0)

        contents = path.read_text(encoding="utf-8")

        # Remove src= from the resulting tag
        attributes = before + after
        return f"<script{attributes}>{contents}</script>"

    html = script_pattern.sub(replace_script, html)

    # Inline <link rel="stylesheet" href="...">
    link_pattern = re.compile(
        r'<link\b([^>]*?)\bhref=["\']([^"\']+)["\']([^>]*)/?>',
        re.IGNORECASE
    )

    def replace_css(match):
        before = match.group(1)
        href = match.group(2)
        after = match.group(3)

        combined = (before + " " + after).lower()
        if "stylesheet" not in combined:
            return match.group(0)

        path = local_file(base_dir, href)

        if path is None:
            return match.group(0)

        if not path.exists():
            print(f"Warning: missing CSS file: {path}", file=sys.stderr)
            return match.group(0)

        contents = path.read_text(encoding="utf-8")
        return f"<style>{contents}</style>"

    html = link_pattern.sub(replace_css, html)

    Path(output_file).write_text(html, encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} input.html output.html")
        sys.exit(1)

    inline_html(sys.argv[1], sys.argv[2])
