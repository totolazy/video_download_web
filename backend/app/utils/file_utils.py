"""Safe path utilities: prevent directory traversal, get file metadata."""
from pathlib import Path
from typing import Any


def safe_path(base_dir: Path, *segments: str) -> Path:
    """Join path segments under base_dir and verify no traversal escapes.

    Raises ValueError if the resolved path is outside base_dir.
    """
    resolved = (base_dir / Path(*segments)).resolve()
    base_resolved = base_dir.resolve()
    try:
        resolved.relative_to(base_resolved)
    except ValueError:
        raise ValueError(f"Path traversal detected: {resolved} is outside {base_resolved}")
    return resolved


def get_file_info(path: Path) -> dict[str, Any]:
    """Return file size and name as a dict."""
    return {
        "size": path.stat().st_size if path.exists() else 0,
        "name": path.name,
    }