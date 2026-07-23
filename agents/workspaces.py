#!/usr/bin/env python3
"""Manage local Git worktrees for the two manual Codex sessions."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Agent:
    name: str
    branch: str
    prompt: str
    output: str


AGENTS = (
    Agent(
        "implementation",
        "agent/implementation",
        "implementation.md",
        "artifacts/handoffs/implementation.md",
    ),
    Agent(
        "review",
        "agent/review",
        "review.md",
        "artifacts/reviews/review.md",
    ),
)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent


class WorkspaceError(RuntimeError):
    pass


def git(*args: str, cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", *args],
        cwd=cwd or PROJECT_DIR,
        check=check,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def repo_root() -> Path:
    result = git("rev-parse", "--show-toplevel")
    return Path(result.stdout.strip()).resolve()


def agents_root() -> Path:
    return repo_root().parent / "basketball-agents"


def worktree_path(agent: Agent) -> Path:
    return agents_root() / agent.name


def prompt_path(base: Path, agent: Agent) -> Path:
    return base / "agents" / "prompts" / agent.prompt


def output_path(base: Path, agent: Agent) -> Path:
    return base / agent.output


def branch_exists(branch: str) -> bool:
    return git("show-ref", "--verify", "--quiet", f"refs/heads/{branch}", check=False).returncode == 0


def worktrees() -> dict[Path, str | None]:
    entries: dict[Path, str | None] = {}
    current_path: Path | None = None
    current_branch: str | None = None

    for line in git("worktree", "list", "--porcelain").stdout.splitlines():
        if line.startswith("worktree "):
            if current_path is not None:
                entries[current_path] = current_branch
            current_path = Path(line.removeprefix("worktree ")).resolve()
            current_branch = None
        elif line.startswith("branch "):
            current_branch = line.removeprefix("branch refs/heads/")
        elif not line and current_path is not None:
            entries[current_path] = current_branch
            current_path = None
            current_branch = None

    if current_path is not None:
        entries[current_path] = current_branch
    return entries


def dirty_paths(base: Path) -> list[str]:
    result = git("status", "--porcelain", "--untracked-files=all", cwd=base)
    return [line for line in result.stdout.splitlines() if line]


def ensure_prompts_readable(base: Path) -> list[str]:
    errors: list[str] = []
    for agent in AGENTS:
        path = prompt_path(base, agent)
        if not path.is_file():
            errors.append(f"missing prompt for {agent.name}: {path}")
            continue
        try:
            path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"unreadable prompt for {agent.name}: {path} ({exc})")
    return errors


def setup(dry_run: bool) -> int:
    root = repo_root()
    prompt_errors = ensure_prompts_readable(root)
    if prompt_errors:
        raise WorkspaceError("\n".join(prompt_errors))

    changes = dirty_paths(root)
    if changes:
        preview = "\n".join(f"  {line}" for line in changes[:20])
        suffix = "\n  ..." if len(changes) > 20 else ""
        raise WorkspaceError(
            "setup requires a clean repository so every worktree starts from committed content.\n"
            f"Commit or otherwise handle these paths first:\n{preview}{suffix}"
        )

    known = worktrees()
    root_path = agents_root()
    print(f"Agent worktree root: {root_path}")

    for agent in AGENTS:
        path = worktree_path(agent)
        registered_branch = known.get(path.resolve())

        if registered_branch is not None:
            if registered_branch != agent.branch:
                raise WorkspaceError(
                    f"{path} is already registered for {registered_branch}, expected {agent.branch}"
                )
            print(f"ready  {agent.name}: {path} ({agent.branch})")
            continue

        if path.exists() and any(path.iterdir()):
            raise WorkspaceError(f"refusing to overwrite non-empty unregistered directory: {path}")

        if branch_exists(agent.branch):
            command = ["git", "worktree", "add", str(path), agent.branch]
        else:
            command = ["git", "worktree", "add", "-b", agent.branch, str(path), "HEAD"]

        if dry_run:
            print("would run:", " ".join(command))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(command, cwd=root, check=True)
            print(f"created {agent.name}: {path} ({agent.branch})")

    return 0


def status() -> int:
    root = repo_root()
    known = worktrees()
    print(f"Repository: {root}")
    print(f"Agent root: {agents_root()}")
    print(f"Repository clean: {'yes' if not dirty_paths(root) else 'no'}")

    for agent in AGENTS:
        path = worktree_path(agent)
        branch = known.get(path.resolve())
        branch_state = "exists" if branch_exists(agent.branch) else "missing"
        if branch is None:
            tree_state = "missing"
            dirty_state = "-"
        else:
            tree_state = branch
            dirty_state = "dirty" if dirty_paths(path) else "clean"
        prompt_state = "readable" if prompt_path(root, agent).is_file() else "missing"
        output_state = "present" if output_path(path if branch else root, agent).is_file() else "missing"
        print(
            f"{agent.name:15} branch={branch_state:7} "
            f"worktree={tree_state:25} state={dirty_state:5} "
            f"prompt={prompt_state:8} output={output_state}"
        )
    return 0


def instructions() -> int:
    print("Open one VS Code window and one Codex chat per worktree:\n")
    for agent in AGENTS:
        path = worktree_path(agent)
        prompt = path / "agents" / "prompts" / agent.prompt
        print(f"{agent.name}:")
        print(f"  code {path}")
        print(f"  prompt: {prompt}")
        print(f"  branch: {agent.branch}")
    print("\nRun implementation first; run review after implementation is committed.")
    return 0


def open_worktrees() -> int:
    executable = shutil.which("code")
    if executable is None:
        raise WorkspaceError("the 'code' command is not available on PATH")

    known = worktrees()
    missing = [str(worktree_path(agent)) for agent in AGENTS if worktree_path(agent).resolve() not in known]
    if missing:
        raise WorkspaceError("run setup before open; missing worktrees:\n  " + "\n  ".join(missing))

    for agent in AGENTS:
        subprocess.Popen(
            [executable, str(worktree_path(agent))],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    print("Requested one VS Code window for each agent worktree.")
    return 0


def validate(require_outputs: bool) -> int:
    root = repo_root()
    errors = ensure_prompts_readable(root)
    known = worktrees()

    for agent in AGENTS:
        path = worktree_path(agent)
        branch = known.get(path.resolve())
        if branch is not None and branch != agent.branch:
            errors.append(f"{path} uses {branch}, expected {agent.branch}")
        if require_outputs:
            base = path if branch is not None else root
            output = output_path(base, agent)
            if not output.is_file():
                errors.append(f"missing output for {agent.name}: {output}")

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Prompt files, branch names, and registered worktree mappings are consistent.")
    return 0


def cleanup(dry_run: bool) -> int:
    known = worktrees()
    removed = 0
    for agent in AGENTS:
        path = worktree_path(agent)
        if path.resolve() not in known:
            print(f"skip   {agent.name}: no registered worktree")
            continue
        changes = dirty_paths(path)
        if changes:
            print(f"keep   {agent.name}: worktree has uncommitted changes")
            continue
        if dry_run:
            print(f"would remove clean worktree: {path}")
        else:
            git("worktree", "remove", str(path), cwd=repo_root())
            print(f"removed clean worktree: {path}")
        removed += 1

    if removed == 0:
        print("No clean agent worktrees were eligible for removal.")
    print("Agent branches were not deleted.")
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    subparsers = result.add_subparsers(dest="command", required=True)

    setup_parser = subparsers.add_parser("setup", help="create branches and worktrees")
    setup_parser.add_argument("--dry-run", action="store_true")
    subparsers.add_parser("status", help="report branch, worktree, prompt, and handoff state")
    subparsers.add_parser("instructions", help="print VS Code and prompt paths")
    subparsers.add_parser("open", help="open all existing worktrees in VS Code")
    validate_parser = subparsers.add_parser(
        "validate", help="validate prompt, worktree, and optional output mappings"
    )
    validate_parser.add_argument(
        "--require-outputs",
        "--require-handoffs",
        dest="require_outputs",
        action="store_true",
    )
    cleanup_parser = subparsers.add_parser("cleanup", help="remove clean worktrees, never branches")
    cleanup_parser.add_argument("--dry-run", action="store_true")
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "setup":
            return setup(args.dry_run)
        if args.command == "status":
            return status()
        if args.command == "instructions":
            return instructions()
        if args.command == "open":
            return open_worktrees()
        if args.command == "validate":
            return validate(args.require_outputs)
        if args.command == "cleanup":
            return cleanup(args.dry_run)
    except (WorkspaceError, subprocess.CalledProcessError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
