#!/usr/bin/env python3
"""Append the full docs/README.md content to the visual HTML document.

The slide deck is intentionally concise. This script guarantees the browser
document also contains the complete README text verbatim in a styled reference
section so no source content is missing.
"""

from __future__ import annotations

from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "docs" / "README.md"
HTML = ROOT / "docs" / "SMART_HEALTH_360_PRESENTATION.html"

START = "    <!-- FULL_README_REFERENCE_START -->"
END = "    <!-- FULL_README_REFERENCE_END -->"


def main() -> None:
    readme_text = README.read_text(encoding="utf-8")
    html_text = HTML.read_text(encoding="utf-8")

    reference = f"""{START}
    <section class="slide full-reference">
      <div class="kicker">Complete Reference</div>
      <h2>Full Project Flow Content</h2>
      <p>This section contains the complete README content exactly, so the visual document includes the full project explanation without removing any topic, example, table, or flow.</p>
      <pre>{escape(readme_text)}</pre>
      <div class="footer"><span>Full README Reference</span><span>23</span></div>
    </section>
    {END}"""

    if START in html_text and END in html_text:
        before = html_text.split(START)[0]
        after = html_text.split(END, 1)[1]
        updated = before + reference + after
    else:
        updated = html_text.replace("  </main>", reference + "\n  </main>")

    if ".full-reference pre" not in updated:
        updated = updated.replace(
            "    .metric .small {\n"
            "      color: var(--muted);\n"
            "      font-size: 15px;\n"
            "      font-weight: 700;\n"
            "    }\n",
            "    .metric .small {\n"
            "      color: var(--muted);\n"
            "      font-size: 15px;\n"
            "      font-weight: 700;\n"
            "    }\n\n"
            "    .full-reference {\n"
            "      min-height: auto;\n"
            "    }\n\n"
            "    .full-reference pre {\n"
            "      white-space: pre-wrap;\n"
            "      word-break: break-word;\n"
            "      margin: 22px 0 36px;\n"
            "      padding: 26px;\n"
            "      border: 1px solid var(--line);\n"
            "      border-radius: 18px;\n"
            "      background: #f8fafc;\n"
            "      color: #17202a;\n"
            "      font: 15px/1.55 Arial, Helvetica, sans-serif;\n"
            "    }\n",
        )

    HTML.write_text(updated, encoding="utf-8")
    print(f"Synced complete README into {HTML}")


if __name__ == "__main__":
    main()
