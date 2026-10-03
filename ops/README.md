# MetaMCP Gateway — VPS Operations

This directory contains the production operations artifacts for deploying the
**MetaMCP Gateway** (the remote JSON-RPC 2.0 / MCP endpoint that our Cloudflare
Pages Function at `/api/mcp` proxies to when `METAMCP_GATEWAY_URL` is set).

| File | Purpose |
| --- | --- |
| [`metamcp.service`](./metamcp.service) | Hardened systemd unit file (v3). Runs the gateway as an unprivileged, namespace-isolated, syscall-filtered service with automatic log/state/runtime directory management. |
| [`install-metamcp.sh`](./install-metamcp.sh) | Idempotent provisioning script — creates the `metamcp` system user, prepares `/opt/metamcp`, installs the unit, enables + starts the service, and runs a `systemd-analyze security` audit. |
| [`README.md`](./README.md) | This file. |

---

## 1. Prerequisites

* A Linux VPS with **systemd ≥ 245** (required for `RestartSteps=`,
  `LogsDirectory=`, `ProtectHostname=`, `ProtectClock=`).
  Verify with `systemctl --version`.
* **Node.js** installed at `/usr/bin/node`. Confirm with `which node`; if it
  lives elsewhere, edit the `ExecStart=` line in `metamcp.service` accordingly.
* The **built MetaMCP artifact** deployed under `/opt/metamcp`
  (`dist/index.js`, `node_modules/`, `package.json`).
* `sudo` privileges.

## 2. Installation

From the repository root on the VPS:

```bash
chmod +x ops/install-metamcp.sh
sudo ops/install-metamcp.sh
```

The script will:

1. Create the `metamcp` system user (locked shell, no home).
2. Create `/opt/metamcp` owned by `metamcp:metamcp`.
3. Copy `ops/metamcp.service` to `/etc/systemd/system/metamcp.service`.
4. Run `systemctl daemon-reload` + `systemctl enable --now metamcp.service`.
5. Print the `systemd-analyze security` score.

## 3. Verifying the Security Sandbox

The unit is designed to score in the "OK" or better range on
`systemd-analyze security` (target: **exposure level ≤ 2.0**).

Run it manually any time:

```bash
sudo systemd-analyze security metamcp.service
```

You should see output similar to:

```
→ Overall exposure level for metamcp.service: 1.6 OK 🙂
```

Key hardening directives already applied in `metamcp.service`:

| Directive | Effect |
| --- | --- |
| `User=metamcp` / `Group=metamcp` | Runs as a dedicated unprivileged user. |
| `CapabilityBoundingSet=` (empty) | Drops **all** Linux capabilities. |
| `NoNewPrivileges=true` | Prevents `setuid`/`setgid` privilege escalation. |
| `ProtectSystem=strict` | `/`, `/usr`, `/boot`, `/etc` all read-only. |
| `ProtectHome=true` | `/root` and `/home` are inaccessible. |
| `PrivateTmp=true` | Private `/tmp` and `/var/tmp`. |
| `PrivateDevices=true` | Blocks access to physical devices (`/dev/*`). |
| `PrivateUsers=true` | Runs inside a user namespace. |
| `ProtectKernelTunables/Modules/Logs=true` | Blocks `/proc/sys`, `/sys`, kmsg. |
| `LockPersonality=true` | Disables `personality(2)` syscall changes. |
| `RestrictRealtime/Namespaces/SUIDSGID=true` | Denies RT scheduling, new namespaces, and set-uid binaries. |
| `RemoveIPC=true` | Cleans up SysV/POSIX IPC when the service exits. |
| `SystemCallFilter=@system-service` | Allowlist of syscalls for a typical service. |
| `SystemCallFilter=~@debug @mount @cpu-emulation @obsolete @privileged @raw-io @reboot @swap` | Explicit denylist on top of the allowlist. |
| `LogsDirectory=metamcp` | Auto-manages `/var/log/metamcp` (mode 0750, owned by metamcp). |
| `RuntimeDirectory=metamcp` | Auto-manages `/run/metamcp`. |
| `StateDirectory=metamcp` | Auto-manages `/var/lib/metamcp`. |
| `MemoryMax=1G` / `CPUQuota=150%` | Resource caps. |
| `Restart=on-failure` + `RestartSteps=5` + `RestartMaxDelaySec=1m` | Exponential backoff crash-loop recovery. |

To see a per-directive breakdown of what's improving or hurting the score:

```bash
sudo systemd-analyze security metamcp.service --no-pager
```

Fields with a red icon are the biggest exposure sources — but with the current
config the remaining ones are usually just `IPAddressDeny=` (commented out;
uncomment the block at the bottom of the unit if you want to lock down egress).

## 4. Tailing Logs

The service writes stdout/stderr to the systemd journal **and** to
`/var/log/metamcp/` (automatically created by `LogsDirectory=metamcp`,
mode 0750, owned by `metamcp:metamcp`).

Live tail (recommended):

```bash
sudo journalctl -u metamcp -f
```

Recent log window:

```bash
sudo journalctl -u metamcp -n 200 --no-pager
```

Since boot:

```bash
sudo journalctl -u metamcp -b
```

Only errors:

```bash
sudo journalctl -u metamcp -p err
```

Raw log directory:

```bash
sudo ls -la /var/log/metamcp/
```

## 5. Everyday Operations

```bash
# Status (with recent log lines)
sudo systemctl status metamcp.service

# Restart
sudo systemctl restart metamcp.service

# Stop / start
sudo systemctl stop metamcp.service
sudo systemctl start metamcp.service

# Disable auto-start on boot
sudo systemctl disable metamcp.service

# Reload the unit file after editing metamcp.service
sudo cp ops/metamcp.service /etc/systemd/system/metamcp.service
sudo systemctl daemon-reload
sudo systemctl restart metamcp.service
```

## 6. Wiring the Gateway into Cloudflare Pages

Once the VPS gateway is running and reachable (e.g. behind Caddy or nginx at
`https://mcp.example.com`), point the Cloudflare Pages deployment at it with
two secrets:

```bash
# The public HTTPS URL where the MetaMCP gateway is listening
npx wrangler pages secret put METAMCP_GATEWAY_URL --project-name weathered-night-72f4

# The bearer token the gateway expects on the Authorization header
npx wrangler pages secret put METAMCP_BEARER_TOKEN --project-name weathered-night-72f4
```

The Pages Function at `/api/mcp` will detect `METAMCP_GATEWAY_URL` at runtime
and proxy JSON-RPC 2.0 requests to it (streaming SSE responses are piped back
to the client unmodified). If the env var is **not** set, it falls back to the
in-repo local dispatcher — so the app stays fully functional pre-integration.

See the top-level [`README.md`](../README.md#v531-alpha--metamcp-hybrid-gateway-integration)
for the full v5.3.1-alpha integration notes.

## 7. Uninstalling

```bash
sudo systemctl disable --now metamcp.service
sudo rm /etc/systemd/system/metamcp.service
sudo systemctl daemon-reload

# Optional — destructive:
sudo userdel metamcp
sudo rm -rf /opt/metamcp
sudo rm -rf /var/log/metamcp /var/lib/metamcp /run/metamcp
```
