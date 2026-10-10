import sys
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
    sha256_text,
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
            target = validate_write_target(root, path)
            assert_no_secret_material(content)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8", newline="\n")
            digest = sha256_text(content)
            return (
                f"WRITE_SUCCESS\nbranch={branch}\npath={target.relative_to(root).as_posix()}"
                f"\nbytes={len(content.encode('utf-8'))}\nsha256={digest}"
                "\nNo commit, push, merge, or deployment was performed."
            )
        except (OSError, PolicyError) as exc:
            return f"WRITE_DENIED: {exc}"
