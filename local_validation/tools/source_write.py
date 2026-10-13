import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Type

from pydantic import BaseModel, Field
from crewai.tools import BaseTool

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from governance import (
    PolicyError,
    assert_no_secret_material,
    current_branch,
    repository_root,
    require_write_approval,
    require_write_path_allowlisted,
    sha256_text,
    validate_allowed_write_paths,
    validate_write_target,
)


class SourceWriteInput(BaseModel):
    path: str = Field(..., description="Repository-relative POSIX source/test path. Only approved source roots are writable.")
    content: str = Field(..., max_length=250000, description="Complete replacement file content. Do not include credentials or secrets.")


class SourceWriteTool(BaseTool):
    name: str = "source_write"
    description: str = "Create or replace one source/test file only on an explicit approved feature branch. Requires AFAGHX_WRITE_ENABLED=1. Never allows governance, workflow, infrastructure, database, secret or production-configuration writes. Does not commit or push."
    args_schema: Type[BaseModel] = SourceWriteInput

    def _run(self, path: str, content: str) -> str:
        try:
            require_write_approval()
            root = repository_root(Path.cwd())
            branch = current_branch(root)
            raw_allowlist = os.environ.get("AFAGHX_ALLOWED_WRITE_PATHS", "")
            try:
                decoded = json.loads(raw_allowlist)
            except (json.JSONDecodeError, TypeError):
                raise PolicyError("write_path_allowlist_missing_or_invalid")
            if not isinstance(decoded, list):
                raise PolicyError("write_path_allowlist_must_be_a_list")
            allowed_paths = validate_allowed_write_paths(root, decoded)
            canonical_path = require_write_path_allowlisted(path, allowed_paths)
            target = validate_write_target(root, canonical_path)
            assert_no_secret_material(content)
            target.parent.mkdir(parents=True, exist_ok=True)
            # Re-run every path invariant after creating parents. This detects
            # a redirected parent introduced after the initial policy check.
            checked_target = validate_write_target(root, canonical_path)
            if checked_target != target:
                raise PolicyError("write_target_changed_after_parent_creation")
            # Write to an exclusive temporary file in the destination directory,
            # then atomically replace the directory entry. If a final-component
            # symlink appears after validation, os.replace replaces that link
            # instead of following it to an external file.
            temporary_name = None
            try:
                file_descriptor, temporary_name = tempfile.mkstemp(
                    prefix=f".{target.name}.", suffix=".tmp", dir=target.parent
                )
                with os.fdopen(file_descriptor, "w", encoding="utf-8", newline="\n") as stream:
                    stream.write(content)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temporary_name, target)
                temporary_name = None
            finally:
                if temporary_name:
                    try:
                        Path(temporary_name).unlink(missing_ok=True)
                    except OSError:
                        pass
            digest = sha256_text(content)
            return (
                f"WRITE_SUCCESS\nbranch={branch}\npath={target.relative_to(root).as_posix()}"
                f"\nbytes={len(content.encode('utf-8'))}\nsha256={digest}"
                "\nExact task path allowlist enforced. No commit, push, merge, or deployment was performed."
            )
        except (OSError, ValueError, PolicyError) as exc:
            return f"WRITE_DENIED: {exc}"
