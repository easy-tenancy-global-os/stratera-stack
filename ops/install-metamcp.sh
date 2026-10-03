#!/usr/bin/env bash
#
# install-metamcp.sh — Provision the hardened MetaMCP gateway on a Linux VPS.
#
# What it does:
#   1. Creates a locked-down `metamcp` system user (no shell, no home).
#   2. Ensures /opt/metamcp exists and is owned by metamcp:metamcp.
#      (This is where you deploy the built gateway artifact — dist/index.js etc.)
#   3. Installs the hardened systemd unit from ops/metamcp.service.
#   4. Reloads systemd, enables + starts the service.
#   5. Runs `systemd-analyze security metamcp.service` and prints the score
#      so you can verify the sandbox surface is minimal (target: < 2.0 "OK").
#
# Prerequisites:
#   * You have the built MetaMCP artifact deployed under /opt/metamcp
#     (e.g. dist/index.js, node_modules/, package.json).
#   * Node.js is installed at /usr/bin/node (adjust ExecStart in metamcp.service
#     if your node lives elsewhere — `which node` to check).
#   * You run this script from the repo root so `ops/metamcp.service` resolves.
#
# Usage:
#   chmod +x ops/install-metamcp.sh
#   sudo ops/install-metamcp.sh
#
# Uninstall (manual):
#   sudo systemctl disable --now metamcp.service
#   sudo rm /etc/systemd/system/metamcp.service
#   sudo systemctl daemon-reload
#   sudo userdel metamcp                # optional
#   sudo rm -rf /opt/metamcp            # optional (destroys deployed code)
#   sudo rm -rf /var/log/metamcp /var/lib/metamcp /run/metamcp  # optional

set -euo pipefail

echo "==> Creating metamcp system user..."
id -u metamcp &>/dev/null || sudo useradd -r -s /bin/false metamcp

echo "==> Setting up target directory /opt/metamcp..."
sudo mkdir -p /opt/metamcp
sudo chown -R metamcp:metamcp /opt/metamcp

echo "==> Installing unit file..."
sudo cp ops/metamcp.service /etc/systemd/system/metamcp.service
sudo chmod 644 /etc/systemd/system/metamcp.service

echo "==> Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable --now metamcp.service

echo "==> Security Score Audit:"
sudo systemd-analyze security metamcp.service || true

echo ""
echo "==> Installation complete."
echo "    Tail logs:      sudo journalctl -u metamcp -f"
echo "    Service status: sudo systemctl status metamcp.service"
echo "    Restart:        sudo systemctl restart metamcp.service"
