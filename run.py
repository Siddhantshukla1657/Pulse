"""
Pulse Launcher — Starts both FastAPI backend (port 8000) and Vite frontend (port 5173) concurrently.
Automatically handles port cleanup, graceful shutdown of child processes, and signal handling.
"""

import os
import sys
import subprocess
import time
import socket
import signal

BACKEND_PORT = 8000
FRONTEND_PORT = 5173

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def free_port(port: int):
    """Finds and terminates any orphaned process holding the specified port."""
    if not is_port_in_use(port):
        return
        
    print(f"Port {port} is currently in use. Releasing port...")
    if os.name == "nt":
        try:
            output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
            pids = set()
            for line in output.strip().split("\n"):
                parts = line.strip().split()
                if len(parts) >= 5 and "LISTENING" in line.upper():
                    pid = parts[-1]
                    if pid and pid != "0" and pid != str(os.getpid()):
                        pids.add(pid)
            for pid in pids:
                try:
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    print(f"  Closed lingering process PID {pid} on port {port}.")
                except Exception:
                    pass
        except Exception:
            pass
    else:
        try:
            subprocess.run(f"fuser -k {port}/tcp", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass
            
    time.sleep(1)

def kill_process_tree(proc):
    if proc is None:
        return
    try:
        if os.name == "nt":
            subprocess.run(f"taskkill /F /T /PID {proc.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            proc.terminate()
            proc.kill()
    except Exception:
        pass

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    
    print("=" * 60)
    print("  PULSE — AI Fraud-Spike Risk Sentinel")
    print("  Razorpay AI Buildathon Track 02")
    print("=" * 60)
    
    # 1. Check if model artifact exists, if not train it
    model_artifact = os.path.join(root_dir, "backend", "ml", "artifacts", "xgboost_model.joblib")
    if not os.path.exists(model_artifact):
        print("\n[1/3] Training XGBoost fraud classifier and generating held-out metrics...")
        subprocess.run([sys.executable, "-m", "backend.ml.train"], cwd=root_dir, check=True)
        print("[2/3] Generating synthetic replay stream & time-to-detection benchmark...")
        subprocess.run([sys.executable, "-m", "backend.engine.spike_detector"], cwd=root_dir, check=True)
    else:
        print("[1/2] Verified ML model artifact and held-out benchmark reports.")

    # Free ports if occupied by lingering runs
    free_port(BACKEND_PORT)
    free_port(FRONTEND_PORT)

    # 2. Launch FastAPI Backend
    print(f"\n[2/2] Starting FastAPI Backend on http://127.0.0.1:{BACKEND_PORT} ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=root_dir
    )

    # 3. Launch Frontend
    print(f"Starting Vite React Frontend on http://localhost:{FRONTEND_PORT} ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", str(FRONTEND_PORT)],
        cwd=frontend_dir,
        shell=(os.name == "nt")
    )

    time.sleep(2.5)
    print("\n" + "=" * 60)
    print("  PULSE IS RUNNING!")
    print(f"  -> Dashboard: http://localhost:{FRONTEND_PORT}")
    print(f"  -> API Docs:  http://127.0.0.1:{BACKEND_PORT}/docs")
    print("=" * 60 + "\n")
    print("Press Ctrl+C to stop all servers.\n")

    def signal_handler(sig, frame):
        print("\nShutting down Pulse servers...")
        kill_process_tree(backend_proc)
        kill_process_tree(frontend_proc)
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            if backend_proc.poll() is not None or frontend_proc.poll() is not None:
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        print("\nCleaning up server processes...")
        kill_process_tree(backend_proc)
        kill_process_tree(frontend_proc)

if __name__ == "__main__":
    main()
