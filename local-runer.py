#!/usr/bin/env python3
"""
Run start.sh and run.sh together: wait for tunnel readiness, show split output, coordinate shutdown.
"""
from __future__ import annotations

import os
import signal
import subprocess
import sys
import threading
import time
from collections import deque
from pathlib import Path
from typing import Deque, Optional

ROOT = Path(__file__).resolve().parent
START_SH = ROOT / "start.sh"
RUN_SH = ROOT / "run.sh"
READY_SNIPPET = "All tunnels are ready"
MAX_VISIBLE_LINES = 300
LIVE_HZ = 12

try:
    from rich.console import Console
    from rich.layout import Layout
    from rich.live import Live
    from rich.panel import Panel
    from rich.text import Text
except ImportError:
    print(
        "Missing dependency: install with `pip install -r requirements.txt`",
        file=sys.stderr,
    )
    sys.exit(1)


def preexec() -> None:
    if os.name != "nt":
        os.setsid()


def terminate_process_tree(proc: subprocess.Popen, *, grace: float = 8.0) -> None:
    """SIGINT the whole process group (docker compose reacts better than SIGKILL)."""
    if proc.poll() is not None:
        return
    if os.name == "nt":
        proc.terminate()
        try:
            proc.wait(timeout=grace)
        except subprocess.TimeoutExpired:
            proc.kill()
        return
    try:
        gid = os.getpgid(proc.pid)
        os.killpg(gid, signal.SIGINT)
    except (ProcessLookupError, PermissionError):
        proc.terminate()
    try:
        proc.wait(timeout=grace)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            proc.kill()
        proc.wait(timeout=2)


def main() -> None:
    if not START_SH.is_file() or not RUN_SH.is_file():
        print(f"Expected {START_SH} and {RUN_SH} to exist.", file=sys.stderr)
        sys.exit(1)

    console = Console()

    start_lines: Deque[str] = deque(maxlen=MAX_VISIBLE_LINES)
    run_lines: Deque[str] = deque(maxlen=MAX_VISIBLE_LINES)
    lock = threading.Lock()

    ready = threading.Event()
    start_finished = threading.Event()
    run_finished = threading.Event()
    start_rc: list[Optional[int]] = [None]
    run_rc: list[Optional[int]] = [None]

    start_proc = subprocess.Popen(
        ["bash", str(START_SH)],
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        preexec_fn=preexec if os.name != "nt" else None,
    )
    assert start_proc.stdout is not None

    run_proc_holder: list[Optional[subprocess.Popen]] = [None]

    def pump_start() -> None:
        try:
            for line in iter(start_proc.stdout.readline, ""):
                with lock:
                    start_lines.append(line.rstrip("\n\r"))
                if READY_SNIPPET in line:
                    ready.set()
        finally:
            start_proc.wait()
            start_rc[0] = start_proc.returncode
            start_finished.set()

    def pump_run() -> None:
        proc = run_proc_holder[0]
        if proc is None or proc.stdout is None:
            return
        try:
            for line in iter(proc.stdout.readline, ""):
                with lock:
                    run_lines.append(line.rstrip("\n\r"))
        finally:
            proc.wait()
            run_rc[0] = proc.returncode
            run_finished.set()

    t_start = threading.Thread(target=pump_start, daemon=True)
    t_start.start()

    layout = Layout()
    layout.split_row(
        Layout(name="start", ratio=1),
        Layout(name="run", ratio=1),
    )

    def render() -> Layout:
        with lock:
            left = "\n".join(start_lines) if start_lines else "(no output yet)"
            right = (
                "\n".join(run_lines)
                if run_lines
                else (
                    "(waiting for tunnels...)"
                    if not ready.is_set()
                    else "(no output yet)"
                )
            )
        layout["start"].update(
            Panel(
                Text(left, overflow="ellipsis", no_wrap=False),
                title="start.sh",
                border_style="cyan",
            )
        )
        layout["run"].update(
            Panel(
                Text(right, overflow="ellipsis", no_wrap=False),
                title="run.sh",
                border_style="green",
            )
        )
        return layout

    run_thread: Optional[threading.Thread] = None
    exit_code = 1

    try:
        with Live(
            render(),
            console=console,
            refresh_per_second=LIVE_HZ,
            screen=True,
        ) as live:

            while not ready.is_set():
                live.update(render())
                if start_finished.is_set() and start_rc[0] not in (None, 0):
                    console.print("[red]start.sh exited before tunnels were ready.[/red]")
                    sys.exit(start_rc[0] if start_rc[0] is not None else 1)
                if start_finished.is_set() and not ready.is_set():
                    console.print("[red]start.sh ended without ready signal.[/red]")
                    sys.exit(start_rc[0] if start_rc[0] is not None else 1)
                time.sleep(1 / LIVE_HZ)

            run_proc_holder[0] = subprocess.Popen(
                ["bash", str(RUN_SH)],
                cwd=str(ROOT),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                preexec_fn=preexec if os.name != "nt" else None,
            )
            run_proc = run_proc_holder[0]
            assert run_proc.stdout is not None

            run_thread = threading.Thread(target=pump_run, daemon=True)
            run_thread.start()

            while not run_finished.is_set():
                live.update(render())
                if start_finished.is_set() and start_rc[0] not in (None, 0):
                    terminate_process_tree(run_proc)
                    break
                time.sleep(1 / LIVE_HZ)

            live.update(render())

        # run.sh finished: stop start stack
        if start_proc.poll() is None:
            terminate_process_tree(start_proc)

        if run_thread:
            run_thread.join(timeout=2)
        t_start.join(timeout=15)

        r, s = run_rc[0], start_rc[0]
        if r is not None:
            exit_code = 0 if r == 0 else r
        elif s is not None:
            exit_code = 0 if s == 0 else s
        else:
            exit_code = 1

    except KeyboardInterrupt:
        if run_proc_holder[0] is not None and run_proc_holder[0].poll() is None:
            terminate_process_tree(run_proc_holder[0])
        if start_proc.poll() is None:
            terminate_process_tree(start_proc)
        exit_code = 130
    finally:
        if run_proc_holder[0] is not None and run_proc_holder[0].poll() is None:
            terminate_process_tree(run_proc_holder[0])
        if start_proc.poll() is None:
            terminate_process_tree(start_proc)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
