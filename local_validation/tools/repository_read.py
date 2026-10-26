import sys
from pathlib import Path
from typing import Type

from pydantic import BaseModel, Field
from crewai.tools import BaseTool

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from governance import PolicyError, repository_root, resolve_read_target


class RepositoryReadInput(BaseModel):
    path: str = Field(..., description="Repository-relative POSIX path to a text file; never provide a secret path.")


class RepositoryReadTool(BaseTool):
    name: str = "repository_read"
    description: str = "Read a text source or policy file from the AFAGHX Git checkout. Secret, environment, private-key, database and generated paths are blocked. Provide a repository-relative path."
    args_schema: Type[BaseModel] = RepositoryReadInput

    def _run(self, path: str) -> str:
        try:
            root = repository_root(Path.cwd())
            target = resolve_read_target(root, path)
            if not target.is_file():
                return "DENIED: path is a directory; use repository_search with a scope instead."
            if target.stat().st_size > 256_000:
                return "DENIED: file exceeds the 256 KB read limit."
            try:
                content = target.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                return "DENIED: binary or non-UTF-8 file."
            return f"PATH: {target.relative_to(root).as_posix()}\n--- BEGIN FILE ---\n{content}\n--- END FILE ---"
        except (OSError, PolicyError) as exc:
            return f"DENIED: {exc}"
