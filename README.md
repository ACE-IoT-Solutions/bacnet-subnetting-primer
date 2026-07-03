# BACnet Network & Subnet Calculator

An interactive, visual subnet calculator and primer explaining how IP subnet masks and Layer 2/Layer 3 networking affect **BACnet/IP** and **BACnet/Ethernet** networks.

This is designed for control engineers, network integrators, and building automation specialists who need to configure and troubleshoot communications on modern building automation networks.

## Features

- **Interactive Subnet Calculator:** Compute Network ID, Broadcast IP, usable range, and host count for two devices simultaneously.
- **Dynamic Binary Breakdown:** Visualizes IP address structures in binary, highlighting the dividing line between network and host bits.
- **Verdict & Trap Analyzer:** Automatically identifies misconfigurations, such as:
  - **Broadcast Intersection Traps:** (e.g. Device A: `192.168.0.5/23` & Device B: `192.168.1.6/24`) sharing a broadcast address but belonging to different logical subnets.
  - **Asymmetrical Subnets:** Where subnet mask mismatch causes one-way local routing conflicts.
  - **Isolated Subnets:** Standard routed separation requiring BBMD configuration.
- **Live Network Simulator:** Send simulated Who-Is (Broadcast) and ReadProperty (Unicast) packets and trace their paths across switches, routers, and BBMD tunnels in real-time.
- **Interactive Networking Primer:**
  - **Layer 2 vs Layer 3:** Compares BACnet/Ethernet (MAC-level) vs BACnet/IP (UDP-level) with an interactive encapsulation packet inspector.
  - **BBMD Tunneling Simulator:** Traces how BACnet Broadcast Management Devices encapsulate and tunnel broadcasts across IP routers.

## Technology Stack

- **Core:** HTML5, modern ESM JavaScript (ES6+ Modules)
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

Alternatively, because the app is built on standard HTML/JS/CSS modules, you can serve it using any simple static web server (such as Python's HTTP server):
```bash
python3 -m http.server 8000
```

## GitHub Pages Deployment

To deploy this project to GitHub Pages:

1. Push this project to a GitHub repository.
2. In the repository settings, go to the **Pages** section.
3. Under **Build and deployment**, select **Deploy from a branch** and choose your branch (e.g., `main`), targeting the root `/` folder.
4. Save, and GitHub will automatically build and host the calculator.
