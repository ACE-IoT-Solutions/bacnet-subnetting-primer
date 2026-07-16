# BACnet Network & Subnet Calculator

An interactive, visual subnet calculator and primer explaining how IP subnet masks and Layer 2/Layer 3 networking affect **BACnet/IP** and **BACnet/Ethernet** networks.

This is designed for control engineers, network integrators, and building automation specialists who need to configure and troubleshoot communications on modern building automation networks.

## Features

- **Interactive Subnet Calculator:** Compute Network ID, Broadcast IP, usable range, and host count for two devices simultaneously.
- **Port-Separated BACnet/IP Networks:** Model multiple BACnet/IP network numbers on one IP subnet using distinct UDP ports, with an always-available calculator scenario and advanced planner/diagram controls.
- **Dynamic Binary Breakdown:** Visualizes IP address structures in binary, highlighting the dividing line between network and host bits.
- **Verdict & Trap Analyzer:** Automatically identifies misconfigurations, such as:
  - **Broadcast Intersection Traps:** (e.g. Device A: `192.168.0.5/23` & Device B: `192.168.1.6/24`) sharing a broadcast address but belonging to different logical subnets.
  - **Asymmetrical Subnets:** Where subnet mask mismatch causes one-way local routing conflicts.
  - **Isolated Subnets:** Standard routed separation requiring BBMD configuration.
- **Live Network Simulator:** Send simulated Who-Is (Broadcast) and ReadProperty (Unicast) packets and trace their paths across switches, routers, and BBMD tunnels in real-time.
- **Network Diagram Builder:** Document any number of subnets, devices with multiple NICs and multiple addresses per NIC, routers, switches, firewalls, gateways, and BBMDs in a live topology. Draw ordered connectivity tests through intermediate hops, distinguish successful and unsuccessful paths, surface address warnings, and export shareable SVG, PDF, or editable JSON files.
- **Interactive Networking Primer:**
  - **Layer 2 vs Layer 3:** Compares BACnet/Ethernet (MAC-level) vs BACnet/IP (UDP-level) with an interactive encapsulation packet inspector.
  - **BBMD Tunneling Simulator:** Traces how BACnet Broadcast Management Devices encapsulate and tunnel broadcasts across IP routers.
  - **Discovery vs. Reachability:** Demonstrates how a BBMD-forwarded I-Am can make a device visible even though later ReadProperty and other unicast services fail because the advertised address is not routable.

## Technology Stack

- **Core:** Vue 3, TypeScript, and modern ESM modules
- **Styling:** Custom responsive CSS3 with glassmorphism effects and modern typography
- **Graphics:** Dynamic animated vector SVGs for all diagram elements
- **Local Dev Server:** Vite (optional, zero-config)

## Getting Started

### Local Development

To run the application locally, you can use the Vite server configured in `package.json`:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

Alternatively, because the app is built on standard HTML/JS/CSS modules, you can serve it locally using any simple static web server (such as Python's HTTP server):
```bash
python3 -m http.server --bind 127.0.0.1 8000
```

> [!TIP]
> **LAN Sharing:** To expose the servers to your local network (LAN) for testing on mobile or other devices, run `npx vite --host` or `python3 -m http.server --bind 0.0.0.0 8000`.

## GitHub Pages Deployment

This project includes an automated GitHub Actions workflow to build and deploy the application.

To deploy:
1. Push or merge changes to the `deploy` branch.
2. The GitHub Actions workflow defined in [.github/workflows/deploy.yml](file:///.github/workflows/deploy.yml) will automatically run, installing dependencies via `npm ci`, compiling the production bundle, and deploying the resulting `dist/` directory.
3. In your GitHub repository settings under **Pages**, ensure that **Build and deployment** -> **Source** is set to **GitHub Actions**.
