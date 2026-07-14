<template>
  <div style="display: flex; flex-direction: column; gap: 2rem; width: 100%;">

    <!-- Header/Intro -->
    <div class="glass-card primer-intro">
      <h2 class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        BACnet Networking: The Fundamentals
      </h2>
      <p>Unlike typical web applications that communicate using point-to-point HTTP/TCP client-server architectures, <strong>Building Automation and Control networks (BACnet)</strong> heavily rely on <strong>device discovery (Who-Is/I-Am)</strong> through network-wide <strong>broadcast mechanisms</strong>.</p>
      <p>Because BACnet utilizes broadcasts for establishing bindings, a solid grasp of Layer 2 and Layer 3 subnet boundaries is critical. Misconfigurations in subnetting can easily cause devices to be discoverable but unable to communicate, or completely invisible across network segments.</p>
    </div>

    <!-- Section 1: BACnet/IP vs BACnet/Ethernet -->
    <div class="primer-section">
      <h3 class="card-title" style="border: none; padding-bottom: 0;">1. Layer 2 vs Layer 3: BACnet/Ethernet vs BACnet/IP</h3>
      <div class="primer-grid">
        <div class="primer-card">
          <h4 class="primer-subheading">BACnet/Ethernet (ISO 8802-3)</h4>
          <p>BACnet/Ethernet is a <strong>Layer 2 (Data Link)</strong> protocol. Devices communicate directly using raw Ethernet frames and MAC addresses. It does not use IP addresses.</p>
          <p><strong>Critical Limit:</strong> Because routers only forward Layer 3 (Network) traffic, BACnet/Ethernet frames <strong>cannot cross routers</strong>. They are strictly confined to the local physical switch segment or VLAN.</p>

          <h4 class="primer-subheading" style="margin-top: 1.25rem;">BACnet/Ethernet Broadcasts</h4>
          <p>For device discovery (Who-Is/I-Am), BACnet/Ethernet relies on the physical MAC broadcast address <strong><code>FF:FF:FF:FF:FF:FF</code></strong>.</p>
          <ul style="padding-left: 1.25rem; font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <li><strong>Local Confinement:</strong> Every device on the local network switch segment or VLAN receives the broadcast, but standard IP routers block L2 broadcasts completely.</li>
            <li><strong>No BBMD Support:</strong> BBMDs are an IP-specific (Annex J) concept. Because BACnet/Ethernet has no Layer 3 IP header, BBMD tunnels cannot be used to forward these broadcasts across IP routers.</li>
            <li><strong>Requires BACnet Routers:</strong> Bridging BACnet/Ethernet to other subnets requires a dedicated <em>BACnet Router</em> that parses and routes packets at the BACnet network layer, translating NPDUs to BACnet/IP or MS/TP.</li>
          </ul>

          <h4 class="primer-subheading" style="margin-top: 1.5rem;">BACnet/IP (Annex J)</h4>
          <p>BACnet/IP wraps BACnet frames inside standard <strong>UDP/IP (Layer 3 & 4)</strong> packets (usually on port <code>47808</code> / <code>0xBAC0</code>).</p>
          <p><strong>Benefit:</strong> Because it uses IP, BACnet/IP can traverse routers, allowing BACnet traffic to scale across large campus networks, and it can leverage BBMDs to tunnel broadcasts across subnets.</p>
        </div>

        <div class="primer-card">
          <h4 class="primer-subheading">Interactive Packet Explorer</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Select a protocol to inspect the header encapsulation stacks:</p>

          <div class="interactive-osi-selector" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
            <button class="osi-toggle-btn" :class="{ active: activeOsiTab === 'ip-local-uc' }" @click="activeOsiTab = 'ip-local-uc'">BACnet/IP Local Unicast</button>
            <button class="osi-toggle-btn" :class="{ active: activeOsiTab === 'ip-routed-uc' }" @click="activeOsiTab = 'ip-routed-uc'">BACnet/IP Routed Unicast</button>
            <button class="osi-toggle-btn" :class="{ active: activeOsiTab === 'ip-bbmd-tunnel' }" @click="activeOsiTab = 'ip-bbmd-tunnel'">BBMD Tunnel Forward</button>
            <button class="osi-toggle-btn" :class="{ active: activeOsiTab === 'eth-uc' }" @click="activeOsiTab = 'eth-uc'">BACnet/Ethernet Unicast</button>
            <button class="osi-toggle-btn" :class="{ active: activeOsiTab === 'eth-bc' }" @click="activeOsiTab = 'eth-bc'" style="grid-column: span 2;">BACnet/Ethernet Broadcast</button>
          </div>

          <div class="diagram-block" style="min-height: 230px;">
            <div class="packet-container" id="osi-packet-viewer">

              <!-- BACnet/IP Local Unicast -->
              <div v-if="activeOsiTab === 'ip-local-uc'" class="packet-layer-wrapper">
                <div class="packet-layer eth">
                  <span class="layer-meta">L2</span> Ethernet MAC Header (Src: Device A MAC | Dst: Device B MAC)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">Local segment delivery: targets destination MAC directly.</div>
                </div>
                <div class="packet-layer ip">
                  <span class="layer-meta">L3</span> IPv4 Header (Src IP: 192.168.1.10 | Dst IP: 192.168.1.20)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">Protocol: 17 UDP. Destination IP is on the same local subnet.</div>
                </div>
                <div class="packet-layer udp">
                  <span class="layer-meta">L4</span> UDP Header (Src Port: 47808 | Dst Port: 47808)
                </div>
                <div class="packet-layer bvll">
                  <span class="layer-meta">L5</span> BVLL (BACnet Virtual Link Layer: BVLC_ORIGINAL-UNICAST)
                </div>
                <div class="packet-layer bacnet">
                  <span class="layer-meta">L7</span> BACnet APDU (e.g. ReadProperty-Request)
                </div>
              </div>

              <!-- BACnet/IP Routed Unicast -->
              <div v-else-if="activeOsiTab === 'ip-routed-uc'" class="packet-layer-wrapper">
                <div class="packet-layer eth" style="border: 1px dashed var(--warning);">
                  <span class="layer-meta">L2</span> Ethernet MAC Header (Rewritten by Router!)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.9; color: var(--warning); line-height: 1.3;">
                    Segment A (A to Router): Src: A_MAC | Dst: Router_A_MAC<br>
                    Segment B (Router to B): Src: Router_B_MAC | Dst: B_MAC
                  </div>
                </div>
                <div class="packet-layer ip" style="border: 1px solid var(--primary);">
                  <span class="layer-meta">L3</span> IPv4 Header (Src IP: 192.168.1.10 | Dst IP: 192.168.2.10)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">Unaltered end-to-end IP routing. Router forwards packet across subnets.</div>
                </div>
                <div class="packet-layer udp">
                  <span class="layer-meta">L4</span> UDP Header (Port: 47808)
                </div>
                <div class="packet-layer bvll">
                  <span class="layer-meta">L5</span> BVLL (BACnet Virtual Link Layer: BVLC_ORIGINAL-UNICAST)
                </div>
                <div class="packet-layer bacnet">
                  <span class="layer-meta">L7</span> BACnet APDU (e.g. ReadProperty-Request)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">NPDU Hop Count decremented by 1 at the router.</div>
                </div>
              </div>

              <!-- BBMD Tunnel Forward -->
              <div v-else-if="activeOsiTab === 'ip-bbmd-tunnel'" class="packet-layer-wrapper">
                <div class="packet-layer eth">
                  <span class="layer-meta">L2</span> Ethernet MAC Header (Src: BBMD 1 MAC | Dst: Router_A_MAC)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">BBMD 1 sends unicast packet to its local gateway router.</div>
                </div>
                <div class="packet-layer ip" style="border: 1px solid var(--secondary);">
                  <span class="layer-meta">L3</span> IPv4 Header (Src IP: BBMD_1_IP | Dst IP: BBMD_2_IP)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.9; color: var(--secondary); line-height: 1.3;">
                    IP addresses rewritten as a Unicast Tunnel: BBMD 1 sends carrying frame directly to BBMD 2.
                  </div>
                </div>
                <div class="packet-layer udp">
                  <span class="layer-meta">L4</span> UDP Header (Port: 47808)
                </div>
                <div class="packet-layer bvll" style="border: 1px solid var(--primary); background: rgba(var(--primary-rgb), 0.15);">
                  <span class="layer-meta">L5</span> BVLL (BVLC_FORWARDED-NPDU | Originator IP: 192.168.1.10)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.9; color: var(--primary); line-height: 1.3;">
                    Crucial: BBMD appends original sender's IP so remote devices know who originated the discovery!
                  </div>
                </div>
                <div class="packet-layer bacnet">
                  <span class="layer-meta">L7</span> BACnet APDU (Who-Is Broadcast payload)
                </div>
              </div>

              <!-- BACnet/Ethernet Unicast -->
              <div v-else-if="activeOsiTab === 'eth-uc'" class="packet-layer-wrapper">
                <div class="packet-layer eth">
                  <span class="layer-meta">L2</span> Ethernet MAC Header (Src: DevA_MAC | Dst: DevB_MAC)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">IEEE 802.3 length-encoded frame. Unicast direct Layer 2 mapping.</div>
                </div>
                <div class="packet-layer eth" style="background: rgba(148, 216, 255, 0.15);">
                  <span class="layer-meta">L2</span> LLC Header (IEEE 802.2 DSAP: 0x82 | SSAP: 0x82 | Control: 0x03)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">Bypasses IP/UDP. Directly encapsulates BACnet NPDU.</div>
                </div>
                <div class="packet-layer bacnet">
                  <span class="layer-meta">L7</span> BACnet APDU (e.g. ReadProperty-Request)
                </div>
                <div style="text-align: center; font-size: 0.75rem; color: var(--error); border: 1px dashed var(--error); padding: 0.5rem; margin-top: 0.5rem; border-radius: var(--radius-sm);">
                  Notice: No Layer 3 (IP) or Layer 4 (UDP) encapsulation. Strictly confined to the local physical segment.
                </div>
              </div>

              <!-- BACnet/Ethernet Broadcast -->
              <div v-else-if="activeOsiTab === 'eth-bc'" class="packet-layer-wrapper">
                <div class="packet-layer eth" style="border: 1px solid var(--secondary); background: rgba(var(--secondary-rgb), 0.1);">
                  <span class="layer-meta">L2</span> Ethernet MAC Header (Src: DevA_MAC | Dst: FF:FF:FF:FF:FF:FF)
                  <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.9; color: var(--secondary);">
                    Destination MAC is the physical Layer 2 Broadcast address. Every node on the switch segment / VLAN receives this.
                  </div>
                </div>
                <div class="packet-layer eth" style="background: rgba(148, 216, 255, 0.15);">
                  <span class="layer-meta">L2</span> LLC Header (IEEE 802.2 DSAP: 0x82 | SSAP: 0x82 | Control: 0x03)
                </div>
                <div class="packet-layer bacnet">
                  <span class="layer-meta">L7</span> BACnet APDU (Who-Is Broadcast payload)
                </div>
                <div style="text-align: center; font-size: 0.75rem; color: var(--error); border: 1px dashed var(--error); padding: 0.5rem; margin-top: 0.5rem; border-radius: var(--radius-sm);">
                  Notice: Blocked by IP routers. Since there is no IP layer, BBMDs cannot bridge this. You must use a BACnet Router to cross segments.
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: IP Subnets & Broadcast Address Intersection -->
    <div class="primer-section">
      <h3 class="card-title" style="border: none; padding-bottom: 0;">2. IP Subnets & Broadcast Address Intersection</h3>
      <div class="primer-grid">
        <div class="primer-card">
          <h4 class="primer-subheading">What is a Subnet Broadcast?</h4>
          <p>In BACnet/IP networks, a device broadcasts a <strong>"Who-Is"</strong> service request to locate another device by its instance number (e.g. Device ID 10001). This request is sent to the <strong>Subnet Broadcast Address</strong>.</p>
          <p>Every IP network has a unique network ID and a broadcast address. The broadcast address is calculated by setting all the host bits of the subnet to binary <code>1</code>. Any device on that local segment listening to that broadcast address will process the packet.</p>

          <div class="callout-box" style="margin-top: 1rem;">
            <div class="callout-title" style="display: flex; align-items: center; gap: 0.5rem; font-weight: bold; color: var(--warning);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
              The Broadcast Intersection Trap
            </div>
            <div class="callout-content" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.25rem;">
              Consider Device A on <code>192.168.0.5/23</code> and Device B on <code>192.168.1.6/24</code>.
              <ul style="margin: 0.4rem 0 0.4rem 1.25rem;">
                <li><strong>Device A Broadcast IP:</strong> 192.168.1.255</li>
                <li><strong>Device B Broadcast IP:</strong> 192.168.1.255</li>
              </ul>
              They share the <em>exact same</em> broadcast address and hear each other's broadcasts if plugged into the same switch. However, Device B's network is <code>192.168.1.0/24</code>, so it does not believe Device A (<code>192.168.0.5</code>) is local, and attempts to send replies through a router gateway, breaking direct unicast!
            </div>
          </div>
        </div>

        <div class="primer-card">
          <h4 class="primer-subheading">Visualizing the Intersection Trap</h4>
          <p>When physical broadcast boundaries overlap with misaligned logical subnet configurations, communications become asymmetrical:</p>

          <table class="osi-table" style="width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.82rem;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color);">
                <th style="text-align: left; padding: 0.4rem;">Metric</th>
                <th style="text-align: left; padding: 0.4rem;">Device A (/23)</th>
                <th style="text-align: left; padding: 0.4rem;">Device B (/24)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.4rem;">IP Address</td>
                <td style="color:var(--primary); font-family:var(--font-mono); padding: 0.4rem;">192.168.0.5</td>
                <td style="color:var(--secondary); font-family:var(--font-mono); padding: 0.4rem;">192.168.1.6</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.4rem;">Subnet Mask</td>
                <td style="font-family:var(--font-mono); padding: 0.4rem;">255.255.254.0</td>
                <td style="font-family:var(--font-mono); padding: 0.4rem;">255.255.255.0</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.4rem;">Network Address</td>
                <td style="font-family:var(--font-mono); padding: 0.4rem;">192.168.0.0</td>
                <td style="font-family:var(--font-mono); padding: 0.4rem;">192.168.1.0</td>
              </tr>
              <tr style="background: rgba(245, 158, 11, 0.08); font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.4rem;">Broadcast IP</td>
                <td style="color:#fde68a; font-family:var(--font-mono); padding: 0.4rem;">192.168.1.255</td>
                <td style="color:#fde68a; font-family:var(--font-mono); padding: 0.4rem;">192.168.1.255</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 0.4rem;">Sees other as local?</td>
                <td style="color:#34d399; font-weight:600; padding: 0.4rem;">YES</td>
                <td style="color:#f87171; font-weight:600; padding: 0.4rem;">NO</td>
              </tr>
            </tbody>
          </table>

          <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; border: 1px solid var(--border-color); margin-top: 1rem;">
            <span style="color: var(--warning); font-weight:600; display: block; margin-bottom: 0.25rem;">Resulting Symptoms:</span>
            <ul class="custom-list" style="margin-bottom: 0; font-size: 0.8rem; padding-left: 1rem;">
              <li>Who-Is (Broadcast) requests reach both devices correctly.</li>
              <li>Device A replies/requests unicast directly to Device B (using Layer 2 MAC translation).</li>
              <li>Device B rejects A as local, forwarding packets to its Gateway router. If routing fails or lacks a return route, <strong>Device B cannot reply to A</strong>.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Interactive Subnet Mask & Bit Splitter Card -->
      <div class="glass-card" style="margin-top: 2rem;">
        <h4 class="primer-subheading">Interactive Subnet Mask & Bit Splitter</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Slide to change the Subnet Mask length (CIDR) and see how the 32-bit address divides between Network ID (green) and Host ID (blue):</p>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;">
            <div class="form-group" style="margin: 0; flex: 1.5;">
              <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">IP Address Reference</label>
              <input type="text" v-model="splitIp" style="padding: 0.4rem; font-size: 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm);">
            </div>
            <div class="form-group" style="margin: 0; flex: 2; min-width: 250px;">
              <label style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.25rem; display: block;">CIDR Subnet Mask: /{{ splitCidr }}</label>
              <input type="range" v-model.number="splitCidr" min="8" max="30" class="slider" style="width: 100%; cursor: pointer;">
            </div>
          </div>

          <table class="metrics-table" style="max-width: 500px; margin-top: 0.5rem;">
            <tbody>
              <tr>
                <td class="label">Equivalent Subnet Mask</td>
                <td class="value">{{ splitMask }}</td>
              </tr>
              <tr>
                <td class="label">Network ID</td>
                <td class="value">{{ splitNetId }}</td>
              </tr>
              <tr>
                <td class="label">Broadcast IP</td>
                <td class="value" style="color: #fff; font-weight: bold;">{{ splitBcast }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Render bits visual representation -->
          <div style="display: flex; flex-wrap: wrap; gap: 0.25rem; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color); align-items: center; justify-content: center; min-height: 50px;">
            <template v-for="(b, idx) in bitList" :key="idx">
              <!-- Separator -->
              <div v-if="b.isSeparator" style="display: flex; align-items: center; justify-content: center; width: 10px; color: var(--text-muted); font-weight: bold; font-size: 1.2rem;">.</div>
              <!-- Boundary Line -->
              <div v-else-if="b.isBoundary" style="width: 2px; background: var(--error); margin: 0 4px; position: relative; height: 32px;" :title="'Subnet boundary (/' + splitCidr + ')'">
                <div style="position: absolute; top: -14px; left: -15px; font-size: 8px; color: var(--error); font-weight: bold; width: 30px; text-align: center;">/{{ splitCidr }}</div>
              </div>
              <!-- Bit -->
              <div v-else :style="{
                width: '16px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: b.isNetwork ? 'rgba(193, 210, 0, 0.12)' : 'rgba(148, 216, 255, 0.1)',
                border: '1px solid ' + (b.isNetwork ? 'var(--primary)' : 'var(--secondary)'),
                borderRadius: '4px',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.75rem'
              }" :title="'Bit ' + (idx + 1) + ': ' + (b.isNetwork ? 'Network' : 'Host')">
                {{ b.bit }}
              </div>
            </template>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; border-left: 2px solid var(--primary); padding-left: 0.75rem;" v-html="splitExplanation">
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: BACnet Broadcast Management Devices (BBMD) -->
    <div class="primer-section">
      <h3 class="card-title" style="border: none; padding-bottom: 0;">3. Crossing Subnets: BACnet Broadcast Management Devices (BBMD)</h3>

      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="primer-card">
          <h4 class="primer-subheading">How BBMDs Work (Annex J)</h4>
          <p>Because standard IP routers block UDP broadcast packets (like BACnet Who-Is), device discovery across different subnets is impossible without helper infrastructure.</p>
          <p><strong>The BBMD Solution:</strong> You place one BBMD-enabled device (often a BACnet Router or BMS server) on each subnet. These BBMDs maintain a shared list of each other's IP addresses called a <strong>Broadcast Distribution Table (BDT)</strong>.</p>

          <h4 class="primer-subheading" style="margin-top: 1.25rem;">The Relay Workflow</h4>
          <ol style="padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.5rem;">
            <li><strong>Intercept:</strong> Device A broadcasts a Who-Is on Subnet 1. BBMD 1 intercepts it.</li>
            <li><strong>Tunnel:</strong> BBMD 1 wraps the broadcast inside a unicast <strong>BVLL (BACnet Virtual Link Layer)</strong> packet and tunnels it directly across the IP router to BBMD 2 on Subnet 2.</li>
            <li><strong>Re-Broadcast:</strong> BBMD 2 extracts the original Who-Is frame and broadcasts it locally on Subnet 2.</li>
            <li><strong>Reply:</strong> Device B receives the Who-Is and returns an <strong>I-Am</strong>. The origin can learn about the device through the forwarded discovery exchange, but that does not by itself prove the advertised source address is reachable for later unicast services.</li>
          </ol>
        </div>

        <!-- Interactive BBMD Simulation Diagram -->
        <div class="primer-card flex-col align-center" style="width: 100%;">
          <h4 class="primer-subheading" style="font-size: 0.95rem; margin-bottom: 0.5rem; text-align: center;">Interactive BBMD Broadcast Simulator</h4>
          <p style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary); text-align: center;">Click the buttons below to see how broadcasts cross subnets when BBMDs tunnel traffic, compared to when they are disabled.</p>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; width: 100%;">
            <svg ref="bbmdSvgRef" id="bbmd-svg" class="diagram-canvas" viewBox="0 0 700 280" width="100%">
              <!-- Subnet 1 Box -->
              <rect x="15" y="30" width="240" height="230" rx="10" fill="rgba(var(--primary-rgb), 0.02)" stroke="rgba(var(--primary-rgb), 0.15)" stroke-width="2" stroke-dasharray="4 4"></rect>
              <text x="135" y="52" font-family="Inter" font-size="12" font-weight="600" fill="var(--primary)" text-anchor="middle">Subnet 1 (192.168.1.0/24)</text>

              <!-- Subnet 2 Box -->
              <rect x="445" y="30" width="240" height="230" rx="10" fill="rgba(var(--secondary-rgb), 0.02)" stroke="rgba(var(--secondary-rgb), 0.15)" stroke-width="2" stroke-dasharray="4 4"></rect>
              <text x="565" y="52" font-family="Inter" font-size="12" font-weight="600" fill="var(--secondary)" text-anchor="middle">Subnet 2 (192.168.2.0/24)</text>

              <!-- Router in center -->
              <g class="node-group" id="node-router">
                <circle cx="350" cy="140" r="28" :stroke="routerStroke" stroke-width="2" fill="#1e293b" style="transition: stroke 0.3s;"></circle>
                <text x="350" y="144" font-family="Inter" font-size="11" fill="#fff" text-anchor="middle">Router</text>
              </g>

              <!-- Network Switch 1 -->
              <g class="node-group" id="node-sw1">
                <rect x="175" y="120" width="60" height="36" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"></rect>
                <text x="205" y="142" font-family="Inter" font-size="10" fill="#cbd5e1" text-anchor="middle">Switch 1</text>
              </g>

              <!-- Network Switch 2 -->
              <g class="node-group" id="node-sw2">
                <rect x="465" y="120" width="60" height="36" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"></rect>
                <text x="495" y="142" font-family="Inter" font-size="10" fill="#cbd5e1" text-anchor="middle">Switch 2</text>
              </g>

              <!-- Connections -->
              <line x1="235" y1="138" x2="322" y2="138" class="wire-path" stroke="rgba(255,255,255,0.1)" stroke-width="2"></line>
              <line x1="378" y1="138" x2="465" y2="138" class="wire-path" stroke="rgba(255,255,255,0.1)" stroke-width="2"></line>

              <!-- Subnet 1 Devices -->
              <g class="node-group" id="node-bbmd-devA">
                <rect x="35" y="70" width="105" height="46" rx="6" fill="#151c2e" stroke="#334155" stroke-width="1.5"></rect>
                <text x="87.5" y="90" class="node-label" font-size="11">Device A</text>
                <text x="87.5" y="104" class="node-ip" font-size="9">192.168.1.100</text>
              </g>
              <line x1="140" y1="93" x2="175" y2="130" class="wire-path" stroke="rgba(255,255,255,0.1)" stroke-width="2"></line>

              <!-- BBMD 1 -->
              <g class="node-group" id="node-bbmd-1">
                <rect x="35" y="160" width="105" height="46" rx="6" fill="#151c2e" stroke="var(--primary)" stroke-width="1.5"></rect>
                <text x="87.5" y="180" class="node-label" fill="var(--primary)" font-size="11">BBMD 1</text>
                <text x="87.5" y="194" class="node-ip" font-size="9">192.168.1.10</text>
              </g>
              <line x1="140" y1="183" x2="175" y2="146" class="wire-path" stroke="rgba(255,255,255,0.1)" stroke-width="2"></line>

              <!-- Subnet 2 Devices -->
              <g class="node-group" id="node-bbmd-devB">
                <rect x="560" y="70" width="105" height="46" rx="6" fill="#151c2e" stroke="#334155" stroke-width="1.5"></rect>
                <text x="612.5" y="90" class="node-label" font-size="11">Device B</text>
                <text x="612.5" y="104" class="node-ip" font-size="9">192.168.2.100</text>
              </g>
              <line x1="560" y1="93" x2="525" y2="130" class="wire-path" stroke="rgba(255,255,255,0.1)" stroke-width="2"></line>

              <!-- BBMD 2 -->
              <g class="node-group" id="node-bbmd-2">
                <rect x="560" y="160" width="105" height="46" rx="6" fill="#151c2e" stroke="var(--secondary)" stroke-width="1.5"></rect>
                <text x="612.5" y="180" class="node-label" fill="var(--secondary)" font-size="11">BBMD 2</text>
                <text x="612.5" y="194" class="node-ip" font-size="9">192.168.2.10</text>
              </g>
              <line x1="560" y1="183" x2="525" y2="146" class="wire-path" stroke="rgba(255,255,255,0.1)" stroke-width="2"></line>
            </svg>
          </div>

          <div class="bbmd-controls" style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.75rem; width: 100%;">
            <AppButton variant="primary" :disabled="primerAnimating" @click="runBbmdflow(false)">Simulate Without BBMD (Fails)</AppButton>
            <AppButton variant="secondary" :disabled="primerAnimating" @click="runBbmdflow(true)">Simulate With BBMD (Succeeds)</AppButton>
          </div>
        </div>

        <div class="primer-card flex-col align-center" style="width: 100%; border-color: rgba(255, 167, 38, 0.35);">
          <h4 class="primer-subheading" style="font-size: 0.95rem; margin-bottom: 0.5rem; text-align: center;">Discovery Succeeds, Unicast Fails</h4>
          <p style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary); text-align: center; max-width: 760px;">A BBMD can make a remote I-Am visible even when the originating workstation has no routed path to the device address. The device appears in discovery, but ReadProperty and other directed services still use ordinary IP unicast.</p>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; width: 100%;">
            <svg ref="unroutableSvgRef" class="diagram-canvas" viewBox="0 0 760 280" width="100%">
              <rect x="15" y="25" width="260" height="230" rx="10" fill="rgba(var(--primary-rgb), 0.02)" stroke="rgba(var(--primary-rgb), 0.2)" stroke-width="2" stroke-dasharray="4 4"></rect>
              <text x="145" y="47" font-family="Inter" font-size="12" font-weight="600" fill="var(--primary)" text-anchor="middle">BMS LAN · 10.10.10.0/24</text>
              <rect x="485" y="25" width="260" height="230" rx="10" fill="rgba(var(--secondary-rgb), 0.02)" stroke="rgba(var(--secondary-rgb), 0.2)" stroke-width="2" stroke-dasharray="4 4"></rect>
              <text x="615" y="47" font-family="Inter" font-size="12" font-weight="600" fill="var(--secondary)" text-anchor="middle">OT LAN · 172.20.40.0/24</text>

              <line x1="185" y1="93" x2="352" y2="136" class="wire-path" stroke="rgba(255,255,255,0.12)" stroke-width="2"></line>
              <line x1="185" y1="203" x2="352" y2="144" class="wire-path" stroke="rgba(255,255,255,0.12)" stroke-width="2"></line>
              <line x1="408" y1="136" x2="575" y2="93" class="wire-path" stroke="rgba(255,255,255,0.12)" stroke-width="2"></line>
              <line x1="408" y1="144" x2="575" y2="203" class="wire-path" stroke="rgba(255,255,255,0.12)" stroke-width="2"></line>

              <g class="node-group">
                <rect x="40" y="70" width="145" height="46" rx="7" fill="#151c2e" stroke="var(--primary)" stroke-width="1.5"></rect>
                <text x="112.5" y="90" class="node-label" font-size="11">Who-Is Origin</text>
                <text x="112.5" y="104" class="node-ip" font-size="9">10.10.10.50</text>
              </g>
              <g class="node-group">
                <rect x="40" y="180" width="145" height="46" rx="7" fill="#151c2e" stroke="var(--primary)" stroke-width="1.5"></rect>
                <text x="112.5" y="200" class="node-label" font-size="11">BMS BBMD</text>
                <text x="112.5" y="214" class="node-ip" font-size="9">10.10.10.10</text>
              </g>
              <g class="node-group">
                <circle cx="380" cy="140" r="28" :stroke="unroutablePhase === 'failed' ? 'var(--error)' : '#475569'" stroke-width="2" fill="#1e293b"></circle>
                <text x="380" y="137" font-family="Inter" font-size="10" fill="#fff" text-anchor="middle">IP Router</text>
                <text x="380" y="150" font-family="Inter" font-size="8" :fill="unroutablePhase === 'failed' ? 'var(--error)' : '#94a3b8'" text-anchor="middle">NO ROUTE</text>
              </g>
              <g class="node-group">
                <rect x="575" y="180" width="145" height="46" rx="7" fill="#151c2e" stroke="var(--secondary)" stroke-width="1.5"></rect>
                <text x="647.5" y="200" class="node-label" font-size="11">OT BBMD</text>
                <text x="647.5" y="214" class="node-ip" font-size="9">172.20.40.10</text>
              </g>
              <g class="node-group">
                <rect x="575" y="70" width="145" height="46" rx="7" fill="#151c2e" :stroke="unroutablePhase === 'idle' ? '#475569' : 'var(--success)'" stroke-width="1.5"></rect>
                <text x="647.5" y="90" class="node-label" font-size="11">Device 2001</text>
                <text x="647.5" y="104" class="node-ip" font-size="9">172.20.40.25</text>
              </g>
            </svg>
          </div>

          <div class="bbmd-reachability-results">
            <div :class="['bbmd-result-step', unroutablePhase !== 'idle' ? 'success' : 'pending']">
              <span>1</span><div><strong>Discovery table</strong><small>{{ unroutablePhase === 'idle' ? 'Waiting for Who-Is' : 'Device 2001 discovered at 172.20.40.25' }}</small></div>
            </div>
            <div :class="['bbmd-result-step', unroutablePhase === 'failed' ? 'error' : 'pending']">
              <span>2</span><div><strong>ReadProperty</strong><small>{{ unroutablePhase === 'failed' ? 'Timeout — no unicast route to 172.20.40.25' : 'Not tested' }}</small></div>
            </div>
          </div>

          <AppButton variant="secondary" :disabled="primerAnimating" @click="runUnroutableIamFlow">Run Discovery → ReadProperty</AppButton>
          <div class="verdict-box verdict-warning" style="width: 100%; margin-top: 1rem;">
            <div class="verdict-header"><span>Key troubleshooting lesson</span></div>
            <div class="verdict-body"><strong>Discovered does not mean reachable.</strong> BBMDs distribute BACnet broadcasts; they do not automatically route, proxy, or NAT subsequent unicast requests. Verify the client has a route and permitted UDP path to the exact IP address learned from the I-Am.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section: Split Horizon Case Study & Simulator -->
    <div class="primer-section">
      <h3 class="card-title" style="border: none; padding-bottom: 0;">4. Split Horizon BBMD Architectures</h3>
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="primer-card">
          <h4 class="primer-subheading">What is Split Horizon BBMD?</h4>
          <p>In multi-tenant buildings, network architects often need to route discovery traffic selectively. For example, a central BMS server must discover all devices, but individual tenant networks should not see or interfere with each other's subnets.</p>
          <p>In standard configurations, BBMD routing is <strong>symmetric</strong> (fully connected): every BBMD has every other BBMD registered in its Broadcast Distribution Table (BDT). This means broadcasts from one tenant are tunneled to all other tenants, exposing their networks.</p>
          <p><strong>Split Horizon</strong> configures BBMDs <strong>asymmetrically</strong>. BBMD tables are configured so that tenant subnets route traffic to the central BMS BBMD, but Tenant B and Tenant C BBMDs are excluded from each other's tables.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-top: 1rem; margin-bottom: 1rem;">
            <div style="background: rgba(0,0,0,0.2); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
              <strong style="font-size: 0.8rem; color: #fff; display: block; margin-bottom: 0.25rem;">BMS BBMD A BDT</strong>
              <ul style="margin: 0; padding-left: 1rem; font-size: 0.72rem; color: #fff;">
                <li>Tenant 1 B</li>
                <li>Tenant 2 C</li>
              </ul>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--secondary);">
              <strong style="font-size: 0.8rem; color: #fff; display: block; margin-bottom: 0.25rem;">Tenant 1 BBMD B BDT</strong>
              <ul style="margin: 0; padding-left: 1rem; font-size: 0.72rem; color: #fff;">
                <li>BMS A</li>
                <li style="color: var(--text-muted); text-decoration: line-through;">Tenant 2 C (Isolated)</li>
              </ul>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--secondary);">
              <strong style="font-size: 0.8rem; color: #fff; display: block; margin-bottom: 0.25rem;">Tenant 2 BBMD C BDT</strong>
              <ul style="margin: 0; padding-left: 1rem; font-size: 0.72rem; color: #fff;">
                <li>BMS A</li>
                <li style="color: var(--text-muted); text-decoration: line-through;">Tenant 1 B (Isolated)</li>
              </ul>
            </div>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">
            Tenant 1 (B) broadcasts are tunneled only to the central BMS (A). They are never relayed to Tenant 2 (C), maintaining subnet boundary security while allowing building engineers central visibility.
          </p>
        </div>

        <!-- Interactive Split Horizon Diagram -->
        <div class="primer-card flex-col align-center" style="width: 100%;">
          <h4 class="primer-subheading" style="font-size: 0.95rem; margin-bottom: 0.5rem; text-align: center;">Interactive Split Horizon BDT Simulator</h4>
          <p style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary); text-align: center;">Toggle BDT configurations to see how traffic is isolated between Tenant subnets.</p>

          <!-- Mode toggles -->
          <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 0.75rem; width: 100%;">
            <AppButton :variant="splitHorizonMode === 'symmetric' ? 'primary' : 'default'" @click="setShMode('symmetric')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; min-width: auto; height: auto;">Symmetric BDTs</AppButton>
            <AppButton :variant="splitHorizonMode === 'split' ? 'primary' : 'default'" @click="setShMode('split')" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; min-width: auto; height: auto;">Split Horizon BDTs</AppButton>
          </div>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; width: 100%;">
            <svg ref="shSvgRef" id="split-horizon-svg" class="diagram-canvas" viewBox="0 0 700 240" width="100%">
              <!-- BMS to Tenant 1 -->
              <line x1="350" y1="50" x2="180" y2="170" stroke="var(--primary)" stroke-width="2" style="transition: stroke 0.3s;"></line>
              <!-- BMS to Tenant 2 -->
              <line x1="350" y1="50" x2="520" y2="170" stroke="var(--primary)" stroke-width="2" style="transition: stroke 0.3s;"></line>
              <!-- Tenant 1 to Tenant 2 -->
              <line x1="180" y1="170" x2="520" y2="170" :stroke="splitHorizonMode === 'symmetric' ? 'var(--primary)' : 'rgba(255,255,255,0.15)'" :stroke-dasharray="splitHorizonMode === 'split' ? '4 4' : '0'" stroke-width="2" style="transition: stroke 0.3s, stroke-dasharray 0.3s;"></line>

              <!-- Node BMS Subnet (A) -->
              <g class="node-group" transform="translate(350, 50)">
                <circle r="28" fill="#1e293b" stroke="#cbd5e1" stroke-width="2.5"></circle>
                <text y="4" font-family="Inter" font-size="11" fill="#fff" font-weight="600" text-anchor="middle">BMS A</text>
                <text y="42" font-family="Inter" font-size="10.5" fill="var(--text-secondary)" text-anchor="middle">192.168.1.10</text>
              </g>

              <!-- Node Tenant 1 Subnet (B) -->
              <g class="node-group" transform="translate(180, 170)">
                <circle r="28" fill="#1e293b" stroke="var(--primary)" stroke-width="2.5"></circle>
                <text y="4" font-family="Inter" font-size="11" fill="#fff" font-weight="600" text-anchor="middle">Tenant 1 B</text>
                <text y="42" font-family="Inter" font-size="10.5" fill="var(--text-secondary)" text-anchor="middle">192.168.2.10</text>
              </g>

              <!-- Node Tenant 2 Subnet (C) -->
              <g class="node-group" transform="translate(520, 170)">
                <circle r="28" fill="#1e293b" stroke="var(--secondary)" stroke-width="2.5"></circle>
                <text y="4" font-family="Inter" font-size="11" fill="#fff" font-weight="600" text-anchor="middle">Tenant 2 C</text>
                <text y="42" font-family="Inter" font-size="10.5" fill="var(--text-secondary)" text-anchor="middle">192.168.3.10</text>
              </g>

              <!-- Link Label -->
              <g transform="translate(350, 170)">
                <rect x="-65" y="-9" width="130" height="18" rx="4" fill="#0f172a" stroke="rgba(255,255,255,0.08)"></rect>
                <text :fill="splitHorizonMode === 'symmetric' ? 'var(--primary)' : 'var(--text-muted)'" font-family="Inter" font-size="8" font-weight="bold" text-anchor="middle" y="3">
                  {{ splitHorizonMode === 'symmetric' ? 'B-C Routing Active' : 'B-C Isolated (Split)' }}
                </text>
              </g>
            </svg>
          </div>

          <!-- Simulation controls -->
          <div style="display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.75rem; width: 100%;">
            <AppButton variant="secondary" :disabled="shAnimating" @click="runShFlow('B')" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; min-width: auto; height: auto;">
              Broadcast from Tenant 1 (B)
            </AppButton>
            <AppButton variant="secondary" :disabled="shAnimating" @click="runShFlow('A')" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; min-width: auto; height: auto;">
              Broadcast from BMS (A)
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Global Console Panel for Primer Animations -->
      <div class="glass-card" style="margin-top: 1rem;">
        <h3 class="card-title" style="font-size: 0.95rem; border: none; padding-bottom: 0; color: var(--primary); margin: 0 0 0.5rem 0;">Simulation Event Stream</h3>
        <TerminalLog />
      </div>
    </div>

    <!-- Section 5: VLAN Tagging and Multi-Net Isolation -->
    <div class="primer-section">
      <h3 class="card-title" style="border: none; padding-bottom: 0;">5. Network Segmentation: VLAN Tagging</h3>
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem;">

        <!-- Explanation card -->
        <div class="primer-card">
          <h4 class="primer-subheading">VLAN Isolation Rules</h4>
          <p>Building automation switches leverage <strong>VLAN tagging (802.1Q)</strong> to isolate subnet traffic at the physical port level. Devices plugged into ports configured with the same VLAN ID can communicate directly. However, communication between different VLANs must pass through a router gateway, forcing all traffic to conform to network firewall policies.</p>
          <div style="background: rgba(255,255,255,0.02); border-left: 3px solid var(--secondary); padding: 0.85rem; border-radius: var(--radius-sm); margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.55;">
            <strong>VLAN Access vs. Trunk Ports:</strong>
            <ul style="margin: 0.35rem 0 0 1.25rem; padding: 0;">
              <li><strong>Access Ports:</strong> Un-encapsulated device connections. The network switch tags packets upon ingress and strips tags upon egress. Devices (like controllers or BMS servers) are unaware of the VLAN tags.</li>
              <li><strong>Trunk Ports:</strong> Carry traffic for multiple VLANs over a single physical link. Packets retain their 802.1Q tags, allowing multi-tenant BACnet ports to share physical ethernet backbones securely.</li>
            </ul>
          </div>
        </div>

        <!-- Interactive VLAN Diagram and Simulator -->
        <div class="primer-card flex-col align-center" style="width: 100%;">
          <h4 class="primer-subheading" style="font-size: 0.95rem; margin-bottom: 0.5rem; text-align: center;">Interactive VLAN Tagging & Inter-VLAN Routing Simulator</h4>
          <p style="font-size: 0.85rem; margin-bottom: 0.75rem; color: var(--text-secondary); text-align: center;">Simulate broadcasts or cross-VLAN unicast pings to see switch tagging behavior and routing gateways in action.</p>

          <!-- Mode / Toggle and Buttons Toolbar -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem; width: 100%; margin-bottom: 1rem; align-items: center;">
            <!-- Router Routing Mode toggle -->
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 0.85rem; color: var(--text-secondary);">Inter-VLAN Routing Gateway:</span>
              <AppButton :variant="routerEnabled ? 'primary' : 'default'" @click="routerEnabled = !routerEnabled" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; min-width: auto; height: auto;">
                {{ routerEnabled ? 'Router Enabled' : 'Router Disabled' }}
              </AppButton>
            </div>

            <!-- Action buttons -->
            <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; width: 100%;">
              <AppButton variant="secondary" :disabled="vlanAnimating" @click="runVlanBroadcast(10)" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; min-width: auto; height: auto;">
                Broadcast on VLAN 10 (Red)
              </AppButton>
              <AppButton variant="secondary" :disabled="vlanAnimating" @click="runVlanBroadcast(20)" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; min-width: auto; height: auto;">
                Broadcast on VLAN 20 (Blue)
              </AppButton>
              <AppButton variant="primary" :disabled="vlanAnimating" @click="runVlanPing" style="padding: 0.4rem 0.8rem; font-size: 0.78rem; min-width: auto; height: auto;">
                Ping cross-VLAN (Dev A &rarr; Dev D)
              </AppButton>
            </div>
          </div>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; width: 100%;">
            <svg ref="vlanSvgRef" id="vlan-svg" class="diagram-canvas" viewBox="0 0 700 320" width="100%">
              <!-- Legend in top-left -->
              <g transform="translate(15, 15)">
                <rect x="0" y="0" width="160" height="52" rx="4" fill="#0f172a" stroke="rgba(255,255,255,0.08)" stroke-width="1"></rect>

                <!-- VLAN 10 Legend -->
                <circle cx="15" cy="15" r="5" fill="#f97316" stroke="#ffedd5" stroke-width="1.5"></circle>
                <text x="26" y="18" font-family="Inter" font-size="9" fill="#fff" font-weight="600">VLAN 10 (Red Subnet)</text>

                <!-- VLAN 20 Legend -->
                <circle cx="15" cy="35" r="5" fill="#3b82f6" stroke="#dbeafe" stroke-width="1.5"></circle>
                <text x="26" y="38" font-family="Inter" font-size="9" fill="#fff" font-weight="600">VLAN 20 (Blue Subnet)</text>
              </g>

              <!-- Connection Links -->
              <!-- Trunk link between Switches -->
              <line x1="285" y1="180" x2="415" y2="180" stroke="#94a3b8" stroke-width="3" style="transition: stroke 0.3s;"></line>
              <text x="350" y="172" font-family="Inter" font-size="8.5" fill="var(--text-secondary)" text-anchor="middle" font-weight="bold">TRUNK LINK (VLAN 10, 20)</text>

              <!-- Switch 1 to Router Link -->
              <line x1="240" y1="180" x2="350" y2="60" :stroke="routerEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)'" :stroke-dasharray="routerEnabled ? '0' : '4 4'" stroke-width="2.5" style="transition: all 0.3s;"></line>
              <text x="295" y="110" font-family="Inter" font-size="8.5" :fill="routerEnabled ? 'var(--primary)' : 'var(--text-muted)'" text-anchor="middle" font-weight="bold" transform="rotate(-47.5, 295, 110)">
                Trunk link
              </text>

              <!-- Switch 1 Access Links -->
              <line x1="90" y1="110" x2="200" y2="160" stroke="#f97316" stroke-opacity="0.3" stroke-width="2"></line>
              <line x1="90" y1="180" x2="195" y2="180" stroke="#3b82f6" stroke-opacity="0.3" stroke-width="2"></line>
              <line x1="90" y1="250" x2="200" y2="200" stroke="#f97316" stroke-opacity="0.3" stroke-width="2"></line>

              <!-- Switch 2 Access Links -->
              <line x1="610" y1="110" x2="500" y2="160" stroke="#3b82f6" stroke-opacity="0.3" stroke-width="2"></line>
              <line x1="610" y1="180" x2="505" y2="180" stroke="#f97316" stroke-opacity="0.3" stroke-width="2"></line>
              <line x1="610" y1="250" x2="500" y2="200" stroke="#3b82f6" stroke-opacity="0.3" stroke-width="2"></line>

              <!-- Router Node -->
              <g class="node-group" transform="translate(350, 60)">
                <circle r="26" fill="#1e293b" :stroke="routerEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.15)'" stroke-width="2.5" style="transition: all 0.3s;"></circle>
                <!-- Router Symbol (crossed arrows) -->
                <path d="M-8,-8 L8,8 M8,-8 L-8,8" :stroke="routerEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.4)'" stroke-width="2"></path>
                <circle r="4" fill="#1e293b" :stroke="routerEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.4)'" stroke-width="2"></circle>

                <text y="-32" font-family="Inter" font-size="10.5" fill="#fff" font-weight="bold" text-anchor="middle">IP Router</text>
                <text y="-44" font-family="Inter" font-size="8" fill="var(--text-muted)" text-anchor="middle">
                  {{ routerEnabled ? 'Active (Routing Enabled)' : 'Offline' }}
                </text>

                <!-- Gateways -->
                <text x="-32" y="5" font-family="Inter" font-size="8" :fill="routerEnabled ? '#f97316' : 'var(--text-muted)'" text-anchor="end" font-weight="bold">GW .10.1</text>
                <text x="32" y="5" font-family="Inter" font-size="8" :fill="routerEnabled ? '#3b82f6' : 'var(--text-muted)'" text-anchor="start" font-weight="bold">GW .20.1</text>
              </g>

              <!-- Switch 1 Node -->
              <g class="node-group" transform="translate(240, 180)">
                <rect x="-45" y="-25" width="90" height="50" rx="6" fill="#1e293b" stroke="#94a3b8" stroke-width="2"></rect>
                <text y="-2" font-family="Inter" font-size="10.5" fill="#fff" font-weight="bold" text-anchor="middle">Switch 1</text>
                <text y="12" font-family="Inter" font-size="8.5" fill="var(--text-secondary)" text-anchor="middle">Core SW</text>
              </g>

              <!-- Switch 2 Node -->
              <g class="node-group" transform="translate(460, 180)">
                <rect x="-45" y="-25" width="90" height="50" rx="6" fill="#1e293b" stroke="#94a3b8" stroke-width="2"></rect>
                <text y="-2" font-family="Inter" font-size="10.5" fill="#fff" font-weight="bold" text-anchor="middle">Switch 2</text>
                <text y="12" font-family="Inter" font-size="8.5" fill="var(--text-secondary)" text-anchor="middle">Core SW</text>
              </g>

              <!-- Device Nodes (Left) -->
              <!-- Device A -->
              <g class="node-group" transform="translate(90, 110)">
                <circle r="18" fill="#1e293b" stroke="#f97316" stroke-width="2"></circle>
                <text y="4" font-family="Inter" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">A</text>
                <text x="-24" y="-2" font-family="Inter" font-size="8.5" fill="#fff" text-anchor="end">Dev A</text>
                <text x="-24" y="8" font-family="Inter" font-size="7.5" fill="var(--text-muted)" text-anchor="end">192.168.10.11</text>
                <text y="26" font-family="Inter" font-size="7.5" fill="#f97316" text-anchor="middle" font-weight="bold">Access V10</text>
              </g>
              <!-- Device B -->
              <g class="node-group" transform="translate(90, 180)">
                <circle r="18" fill="#1e293b" stroke="#3b82f6" stroke-width="2"></circle>
                <text y="4" font-family="Inter" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">B</text>
                <text x="-24" y="-2" font-family="Inter" font-size="8.5" fill="#fff" text-anchor="end">Dev B</text>
                <text x="-24" y="8" font-family="Inter" font-size="7.5" fill="var(--text-muted)" text-anchor="end">192.168.20.12</text>
                <text y="26" font-family="Inter" font-size="7.5" fill="#3b82f6" text-anchor="middle" font-weight="bold">Access V20</text>
              </g>
              <!-- Device C -->
              <g class="node-group" transform="translate(90, 250)">
                <circle r="18" fill="#1e293b" stroke="#f97316" stroke-width="2"></circle>
                <text y="4" font-family="Inter" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">C</text>
                <text x="-24" y="-2" font-family="Inter" font-size="8.5" fill="#fff" text-anchor="end">Dev C</text>
                <text x="-24" y="8" font-family="Inter" font-size="7.5" fill="var(--text-muted)" text-anchor="end">192.168.10.13</text>
                <text y="26" font-family="Inter" font-size="7.5" fill="#f97316" text-anchor="middle" font-weight="bold">Access V10</text>
              </g>

              <!-- Device Nodes (Right) -->
              <!-- Device D -->
              <g class="node-group" transform="translate(610, 110)">
                <circle r="18" fill="#1e293b" stroke="#3b82f6" stroke-width="2"></circle>
                <text y="4" font-family="Inter" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">D</text>
                <text x="24" y="-2" font-family="Inter" font-size="8.5" fill="#fff" text-anchor="start">Dev D</text>
                <text x="24" y="8" font-family="Inter" font-size="7.5" fill="var(--text-muted)" text-anchor="start">192.168.20.14</text>
                <text y="26" font-family="Inter" font-size="7.5" fill="#3b82f6" text-anchor="middle" font-weight="bold">Access V20</text>
              </g>
              <!-- Device E -->
              <g class="node-group" transform="translate(610, 180)">
                <circle r="18" fill="#1e293b" stroke="#f97316" stroke-width="2"></circle>
                <text y="4" font-family="Inter" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">E</text>
                <text x="24" y="-2" font-family="Inter" font-size="8.5" fill="#fff" text-anchor="start">Dev E</text>
                <text x="24" y="8" font-family="Inter" font-size="7.5" fill="var(--text-muted)" text-anchor="start">192.168.10.15</text>
                <text y="26" font-family="Inter" font-size="7.5" fill="#f97316" text-anchor="middle" font-weight="bold">Access V10</text>
              </g>
              <!-- Device F -->
              <g class="node-group" transform="translate(610, 250)">
                <circle r="18" fill="#1e293b" stroke="#3b82f6" stroke-width="2"></circle>
                <text y="4" font-family="Inter" font-size="10" fill="#fff" font-weight="bold" text-anchor="middle">F</text>
                <text x="24" y="-2" font-family="Inter" font-size="8.5" fill="#fff" text-anchor="start">Dev F</text>
                <text x="24" y="8" font-family="Inter" font-size="7.5" fill="var(--text-muted)" text-anchor="start">192.168.20.16</text>
                <text y="26" font-family="Inter" font-size="7.5" fill="#3b82f6" text-anchor="middle" font-weight="bold">Access V20</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import TerminalLog from './TerminalLog.vue';
import AppButton from './AppButton.vue';
import { ipToLong, longToIp, getSubnetDetails, cidrToMask, toBinaryString } from '../lib/subnet';

const activeOsiTab = ref('ip-local-uc');

// Bit Splitter Inputs
const splitIp = ref('192.168.0.5');
const splitCidr = ref(23);

const splitMask = computed(() => longToIp(cidrToMask(splitCidr.value)));
const splitNetId = computed(() => {
  const details = getSubnetDetails(splitIp.value, splitCidr.value);
  return details ? details.network : 'N/A';
});
const splitBcast = computed(() => {
  const details = getSubnetDetails(splitIp.value, splitCidr.value);
  return details ? details.broadcast : 'N/A';
});

const bitList = computed(() => {
  const ipLong = ipToLong(splitIp.value);
  if (ipLong === null) return [];
  const binaryIp = (ipLong >>> 0).toString(2).padStart(32, '0');

  const list: { bit: string; isNetwork: boolean; isSeparator: boolean; isBoundary: boolean }[] = [];
  for (let i = 0; i < 32; i++) {
    const bitVal = binaryIp[i];
    const isNetwork = i < splitCidr.value;

    if (i > 0 && i % 8 === 0) {
      list.push({ bit: '.', isNetwork: false, isSeparator: true, isBoundary: false });
    }

    if (i === splitCidr.value) {
      list.push({ bit: '', isNetwork: false, isSeparator: false, isBoundary: true });
    }

    list.push({ bit: bitVal, isNetwork, isSeparator: false, isBoundary: false });
  }
  return list;
});

const splitExplanation = computed(() => {
  const cidr = splitCidr.value;
  const details = getSubnetDetails(splitIp.value, cidr);
  if (!details) return '';

  const netLong = details.networkLong;
  const binaryNet = (netLong >>> 0).toString(2).padStart(32, '0');
  let formattedNetBin = '';
  for (let idx = 0; idx < 32; idx++) {
    if (idx > 0 && idx % 8 === 0) formattedNetBin += '.';
    if (idx < cidr) {
      formattedNetBin += `<b style="color: var(--primary);">${binaryNet[idx]}</b>`;
    } else {
      formattedNetBin += `<span style="opacity: 0.35;">${binaryNet[idx]}</span>`;
    }
  }

  return `
    <strong>How Devices Evaluate This Mask (CIDR /${cidr}):</strong>
    <ul style="margin-top: 0.5rem; margin-bottom: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
      <li><strong>The Bit Filter:</strong> The device compares the first <strong>${cidr} bits</strong> (green) of its own IP and the target IP. In binary, the filter network ID is: <code style="font-family: var(--font-mono); font-size: 0.8rem;">${formattedNetBin}</code>.</li>
      <li><strong>Decision Logic:</strong>
        <ul style="padding-left: 1rem; margin-top: 0.25rem;">
          <li>If the first <strong>${cidr} bits</strong> match exactly, the destination is recognized as <strong>LOCAL</strong>. The client ignores routers and broadcasts directly on Layer 2 or translates via ARP unicast.</li>
          <li>If any of the first <strong>${cidr} bits</strong> differ, the destination is recognized as <strong>REMOTE</strong>. The client wraps the packet in a Layer 3 IP header and routes it directly to the default gateway (Router).</li>
        </ul>
      </li>
    </ul>
  `;
});

// Logs inject
const logToConsole = inject<(text: string, type?: 'system' | 'info' | 'success' | 'warning' | 'error') => void>('logToConsole', () => {});

// Simulator 1: BBMD Broadcast Simulator
const bbmdSvgRef = ref<SVGSVGElement | null>(null);
const unroutableSvgRef = ref<SVGSVGElement | null>(null);
const primerAnimating = ref(false);
const routerStroke = ref('#475569');
const unroutablePhase = ref<'idle' | 'discovered' | 'failed'>('idle');

const bbmdCoords = {
  devA: { x: 87, y: 93 },
  bbmd1: { x: 87, y: 183 },
  sw1: { x: 205, y: 138 },
  router: { x: 350, y: 138 },
  sw2: { x: 495, y: 138 },
  bbmd2: { x: 612, y: 183 },
  devB: { x: 612, y: 93 }
};

const animateLocalSegment = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  labelText: string,
  type = 'primary',
  targetSvg: SVGSVGElement | null
) => {
  return new Promise<void>((resolve) => {
    if (!targetSvg) {
      resolve();
      return;
    }
    const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    packet.setAttribute('r', '7');
    packet.setAttribute('cx', String(start.x));
    packet.setAttribute('cy', String(start.y));
    packet.className.baseVal = type === 'secondary' ? 'packet-pulse secondary' : 'packet-pulse';
    packet.style.opacity = '1';

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.className.baseVal = 'packet-label';
    label.setAttribute('x', String(start.x));
    label.setAttribute('y', String(start.y - 12));
    label.textContent = labelText;
    label.style.opacity = '1';

    targetSvg.appendChild(packet);
    targetSvg.appendChild(label);

    const duration = 650;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const cx = start.x + (end.x - start.x) * progress;
      const cy = start.y + (end.y - start.y) * progress;

      packet.setAttribute('cx', String(cx));
      packet.setAttribute('cy', String(cy));

      label.setAttribute('x', String(cx));
      label.setAttribute('y', String(cy - 12));

      if (progress > 0.8) {
        const fade = (1 - progress) / 0.2;
        packet.style.opacity = String(fade);
        label.style.opacity = String(fade);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        packet.remove();
        label.remove();
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
};

const runBbmdflow = async (bbmdEnabled: boolean) => {
  if (primerAnimating.value) return;
  primerAnimating.value = true;
  routerStroke.value = '#475569';

  logToConsole(`--- Starting BBMD Discovery Simulation [Enabled: ${bbmdEnabled.toString().toUpperCase()}] ---`, 'system');

  try {
    // 1. Device A broadcasts to Switch 1
    logToConsole(`[Device A] Broadcasting Who-Is discovery on Subnet 1 (192.168.1.0/24)`, 'info');
    await animateLocalSegment(bbmdCoords.devA, bbmdCoords.sw1, 'Who-Is (BC)', 'primary', bbmdSvgRef.value);

    // 2. Switch 1 forwards to BBMD 1 and Router
    if (bbmdEnabled) {
      logToConsole(`[Switch 1] Flooding broadcast to BBMD 1 and Router.`, 'success');
      await Promise.all([
        animateLocalSegment(bbmdCoords.sw1, bbmdCoords.router, 'Who-Is (BC)', 'primary', bbmdSvgRef.value),
        animateLocalSegment(bbmdCoords.sw1, bbmdCoords.bbmd1, 'Who-Is (BC)', 'primary', bbmdSvgRef.value)
      ]);

      logToConsole(`[Router] UDP Broadcast blocked from crossing subnet boundary. Packet dropped.`, 'error');
      logToConsole(`[BBMD 1] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD 2 (192.168.2.10)...`, 'success');

      // BBMD 1 encapsulates and tunnels it
      await animateLocalSegment(bbmdCoords.bbmd1, bbmdCoords.sw1, 'BVLL Tunnel', 'primary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.sw1, bbmdCoords.router, 'BVLL Tunnel', 'secondary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.router, bbmdCoords.sw2, 'BVLL Tunnel', 'secondary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.sw2, bbmdCoords.bbmd2, 'BVLL Tunnel', 'primary', bbmdSvgRef.value);

      // BBMD 2 decapsulates and broadcasts
      logToConsole(`[BBMD 2] Unicast tunnel received. Decapsulating and broadcasting locally on Subnet 2...`, 'success');
      await animateLocalSegment(bbmdCoords.bbmd2, bbmdCoords.sw2, 'Who-Is (BC)', 'primary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.sw2, bbmdCoords.devB, 'Who-Is (BC)', 'primary', bbmdSvgRef.value);

      // Target receives! Success reply (unicast)
      logToConsole(`[Device B] Received Who-Is request. Generating I-Am unicast reply to Device A (${bbmdCoords.devA.x === 87 ? '192.168.1.100' : ''})...`, 'success');
      await animateLocalSegment(bbmdCoords.devB, bbmdCoords.sw2, 'I-Am (UC)', 'secondary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.sw2, bbmdCoords.router, 'I-Am (UC)', 'secondary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.router, bbmdCoords.sw1, 'I-Am (UC)', 'secondary', bbmdSvgRef.value);
      await animateLocalSegment(bbmdCoords.sw1, bbmdCoords.devA, 'I-Am (UC)', 'secondary', bbmdSvgRef.value);
      logToConsole(`[Device A] Received I-Am reply. Subnet discovery complete!`, 'success');
    } else {
      // Disabled mode: packet goes to router and dies
      logToConsole(`[Switch 1] Flooding broadcast to router...`, 'success');
      await animateLocalSegment(bbmdCoords.sw1, bbmdCoords.router, 'Who-Is (BC)', 'primary', bbmdSvgRef.value);
      logToConsole(`[Router] UDP Broadcast blocked from crossing subnet boundary. Packet dropped.`, 'error');
      logToConsole(`[BBMD 1] Inactive: local broadcast ignored.`, 'error');

      routerStroke.value = 'var(--error)';
      await new Promise(r => setTimeout(r, 600));
      routerStroke.value = '#475569';
      logToConsole(`[Device A] Discovery TIMEOUT. Device B was not discovered.`, 'error');
    }
  } catch (e) {
    console.error(e);
  } finally {
    primerAnimating.value = false;
  }
};

const unroutableCoords = {
  origin: { x: 112, y: 93 },
  bbmdA: { x: 112, y: 203 },
  router: { x: 380, y: 140 },
  bbmdB: { x: 647, y: 203 },
  device: { x: 647, y: 93 }
};

const runUnroutableIamFlow = async () => {
  if (primerAnimating.value) return;
  primerAnimating.value = true;
  unroutablePhase.value = 'idle';
  logToConsole(`--- Starting BBMD discovery with unreachable advertised address ---`, 'system');

  try {
    logToConsole(`[Who-Is Origin 10.10.10.50] Broadcasting Who-Is on the BMS LAN.`, 'info');
    await animateLocalSegment(unroutableCoords.origin, unroutableCoords.bbmdA, 'Who-Is (BC)', 'primary', unroutableSvgRef.value);
    logToConsole(`[BMS BBMD] Forwarding the discovery through its BDT tunnel to OT BBMD 172.20.40.10.`, 'success');
    await animateLocalSegment(unroutableCoords.bbmdA, unroutableCoords.router, 'BVLL Tunnel', 'secondary', unroutableSvgRef.value);
    await animateLocalSegment(unroutableCoords.router, unroutableCoords.bbmdB, 'BVLL Tunnel', 'secondary', unroutableSvgRef.value);
    await animateLocalSegment(unroutableCoords.bbmdB, unroutableCoords.device, 'Who-Is (BC)', 'primary', unroutableSvgRef.value);

    logToConsole(`[Device 2001] Who-Is received. Advertising I-Am from 172.20.40.25.`, 'success');
    await animateLocalSegment(unroutableCoords.device, unroutableCoords.bbmdB, 'I-Am', 'secondary', unroutableSvgRef.value);
    logToConsole(`[BBMD path] The I-Am is forwarded back to the BMS LAN, preserving visibility of 172.20.40.25.`, 'success');
    await animateLocalSegment(unroutableCoords.bbmdB, unroutableCoords.router, 'Forwarded I-Am', 'secondary', unroutableSvgRef.value);
    await animateLocalSegment(unroutableCoords.router, unroutableCoords.bbmdA, 'Forwarded I-Am', 'secondary', unroutableSvgRef.value);
    await animateLocalSegment(unroutableCoords.bbmdA, unroutableCoords.origin, 'I-Am', 'secondary', unroutableSvgRef.value);
    unroutablePhase.value = 'discovered';
    logToConsole(`[Who-Is Origin] Device 2001 is now visible in the discovery table at 172.20.40.25.`, 'success');

    await new Promise(resolve => setTimeout(resolve, 450));
    logToConsole(`[Who-Is Origin] Sending ReadProperty as ordinary UDP unicast to 172.20.40.25:47808.`, 'info');
    await animateLocalSegment(unroutableCoords.origin, unroutableCoords.router, 'ReadProperty (UC)', 'primary', unroutableSvgRef.value);
    unroutablePhase.value = 'failed';
    logToConsole(`[IP Router] DROP: No route or permitted unicast path from 10.10.10.0/24 to 172.20.40.25.`, 'error');
    logToConsole(`[Who-Is Origin] ReadProperty timed out even though the device was discovered. BBMD forwarding does not proxy unicast services.`, 'error');
  } catch (error) {
    console.error(error);
  } finally {
    primerAnimating.value = false;
  }
};



// Simulator 3: VLAN Tagging & Inter-VLAN Routing Simulator
const vlanSvgRef = ref<SVGSVGElement | null>(null);
const routerEnabled = ref(true);
const vlanAnimating = ref(false);

const vlanCoords = {
  A: { x: 90, y: 110 },
  B: { x: 90, y: 180 },
  C: { x: 90, y: 250 },
  D: { x: 610, y: 110 },
  E: { x: 610, y: 180 },
  F: { x: 610, y: 250 },
  sw1: { x: 240, y: 180 },
  sw2: { x: 460, y: 180 },
  router: { x: 350, y: 60 }
};

const animateVlanSegment = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  labelText: string,
  vlanTag: number | null,
  targetSvg: SVGSVGElement | null
) => {
  return new Promise<void>((resolve) => {
    if (!targetSvg) {
      resolve();
      return;
    }
    const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    packet.setAttribute('r', '7');
    packet.setAttribute('cx', String(start.x));
    packet.setAttribute('cy', String(start.y));

    // Color code based on VLAN
    if (vlanTag === 10) {
      packet.setAttribute('fill', '#f97316');
      packet.setAttribute('stroke', '#ffedd5');
    } else if (vlanTag === 20) {
      packet.setAttribute('fill', '#3b82f6');
      packet.setAttribute('stroke', '#dbeafe');
    } else {
      packet.setAttribute('fill', '#cbd5e1');
      packet.setAttribute('stroke', '#ffffff');
    }
    packet.setAttribute('stroke-width', '1.5');
    packet.style.opacity = '1';

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('font-family', 'Inter, sans-serif');
    label.setAttribute('font-weight', '600');
    label.setAttribute('font-size', '8px');
    label.setAttribute('fill', '#ffffff');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('x', String(start.x));
    label.setAttribute('y', String(start.y - 12));
    label.textContent = labelText;
    label.style.opacity = '1';

    let tagBadge: SVGElement | null = null;
    let tagText: SVGElement | null = null;
    if (vlanTag !== null) {
      tagBadge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      tagBadge.setAttribute('width', '34');
      tagBadge.setAttribute('height', '11');
      tagBadge.setAttribute('rx', '3');
      tagBadge.setAttribute('fill', vlanTag === 10 ? '#f97316' : '#3b82f6');
      tagBadge.setAttribute('stroke', '#ffffff');
      tagBadge.setAttribute('stroke-width', '0.75');

      tagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tagText.setAttribute('font-family', 'var(--font-mono)');
      tagText.setAttribute('font-size', '6.5px');
      tagText.setAttribute('font-weight', 'bold');
      tagText.setAttribute('fill', '#ffffff');
      tagText.setAttribute('text-anchor', 'middle');
      tagText.textContent = `VLAN:${vlanTag}`;
    }

    targetSvg.appendChild(packet);
    targetSvg.appendChild(label);
    if (tagBadge && tagText) {
      targetSvg.appendChild(tagBadge);
      targetSvg.appendChild(tagText);
    }

    const duration = 700;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const cx = start.x + (end.x - start.x) * progress;
      const cy = start.y + (end.y - start.y) * progress;

      packet.setAttribute('cx', String(cx));
      packet.setAttribute('cy', String(cy));

      label.setAttribute('x', String(cx));
      label.setAttribute('y', String(cy - 12));

      if (tagBadge && tagText) {
        tagBadge.setAttribute('x', String(cx - 17));
        tagBadge.setAttribute('y', String(cy + 9));
        tagText.setAttribute('x', String(cx));
        tagText.setAttribute('y', String(cy + 17));
      }

      if (progress > 0.8) {
        const fade = (1 - progress) / 0.2;
        packet.style.opacity = String(fade);
        label.style.opacity = String(fade);
        if (tagBadge && tagText) {
          tagBadge.style.opacity = String(fade);
          tagText.style.opacity = String(fade);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        packet.remove();
        label.remove();
        if (tagBadge && tagText) {
          tagBadge.remove();
          tagText.remove();
        }
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
};

const runVlanBroadcast = async (vlan: 10 | 20) => {
  if (vlanAnimating.value) return;
  vlanAnimating.value = true;

  logToConsole(`--- Starting VLAN Broadcast Simulation [VLAN ${vlan}] ---`, 'system');

  try {
    if (vlan === 10) {
      logToConsole(`[Device A] Sending broadcast discovery packet on VLAN 10 (Access port, untagged)`, 'info');
      // Dev A to Switch 1
      await animateVlanSegment(vlanCoords.A, vlanCoords.sw1, 'Broadcast', null, vlanSvgRef.value);

      logToConsole(`[Switch 1] Broadcast received on VLAN 10 Access Port. Tagging packet with VLAN:10 802.1Q tag.`, 'success');
      logToConsole(`[Switch 1] Flooding VLAN 10 packet to all matching ports: Access Dev C, Trunk Link, and Router Trunk link.`, 'info');

      // Flood parallel
      await Promise.all([
        // Switch 1 to Dev C (untagged at egress)
        (async () => {
          await animateVlanSegment(vlanCoords.sw1, vlanCoords.C, 'Broadcast', null, vlanSvgRef.value);
          logToConsole(`[Device C] Broadcast received (VLAN tag stripped by switch on Access Port C).`, 'success');
        })(),
        // Switch 1 across Trunk Link (tagged)
        (async () => {
          await animateVlanSegment(vlanCoords.sw1, vlanCoords.sw2, 'Broadcast', 10, vlanSvgRef.value);
          logToConsole(`[Switch 2] Tagged VLAN 10 packet received on Trunk Link. Flooding to local VLAN 10 access ports.`, 'success');
          // Switch 2 to Dev E (untagged)
          await animateVlanSegment(vlanCoords.sw2, vlanCoords.E, 'Broadcast', null, vlanSvgRef.value);
          logToConsole(`[Device E] Broadcast received (VLAN tag stripped by switch on Access Port E).`, 'success');
        })(),
        // Switch 1 to Router (tagged)
        (async () => {
          await animateVlanSegment(vlanCoords.sw1, vlanCoords.router, 'Broadcast', 10, vlanSvgRef.value);
          logToConsole(`[Router] Received VLAN 10 broadcast on sub-interface. Routers drop subnet broadcasts by default. Packet dropped.`, 'warning');
        })()
      ]);
    } else {
      logToConsole(`[Device D] Sending broadcast discovery packet on VLAN 20 (Access port, untagged)`, 'info');
      // Dev D to Switch 2
      await animateVlanSegment(vlanCoords.D, vlanCoords.sw2, 'Broadcast', null, vlanSvgRef.value);

      logToConsole(`[Switch 2] Broadcast received on VLAN 20 Access Port. Tagging packet with VLAN:20 802.1Q tag.`, 'success');
      logToConsole(`[Switch 2] Flooding VLAN 20 packet to all matching ports: Access Dev F and Trunk Link.`, 'info');

      // Flood parallel
      await Promise.all([
        // Switch 2 to Dev F (untagged)
        (async () => {
          await animateVlanSegment(vlanCoords.sw2, vlanCoords.F, 'Broadcast', null, vlanSvgRef.value);
          logToConsole(`[Device F] Broadcast received (VLAN tag stripped by switch on Access Port F).`, 'success');
        })(),
        // Switch 2 across Trunk Link (tagged)
        (async () => {
          await animateVlanSegment(vlanCoords.sw2, vlanCoords.sw1, 'Broadcast', 20, vlanSvgRef.value);
          logToConsole(`[Switch 1] Tagged VLAN 20 packet received on Trunk Link. Flooding to local VLAN 20 ports.`, 'success');
          // Switch 1 to Dev B & Router
          await Promise.all([
            (async () => {
              await animateVlanSegment(vlanCoords.sw1, vlanCoords.B, 'Broadcast', null, vlanSvgRef.value);
              logToConsole(`[Device B] Broadcast received (VLAN tag stripped by switch on Access Port B).`, 'success');
            })(),
            (async () => {
              await animateVlanSegment(vlanCoords.sw1, vlanCoords.router, 'Broadcast', 20, vlanSvgRef.value);
              logToConsole(`[Router] Received VLAN 20 broadcast on sub-interface. Routers drop subnet broadcasts. Packet dropped.`, 'warning');
            })()
          ]);
        })()
      ]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    vlanAnimating.value = false;
  }
};

const runVlanPing = async () => {
  if (vlanAnimating.value) return;
  vlanAnimating.value = true;

  logToConsole(`--- Starting Inter-VLAN Ping Simulation [Dev A (V10) to Dev D (V20)] ---`, 'system');

  try {
    logToConsole(`[Device A] Target 192.168.20.14 is on a different subnet. Sending Ping (ICMP) to Gateway IP 192.168.10.1 (untagged).`, 'info');
    // Dev A to Switch 1
    await animateVlanSegment(vlanCoords.A, vlanCoords.sw1, 'Ping (ICMP)', null, vlanSvgRef.value);

    logToConsole(`[Switch 1] Received untagged packet. Ingress port belongs to VLAN 10. Tagging packet with VLAN:10 tag.`, 'success');
    logToConsole(`[Switch 1] Destination MAC is Gateway Router. Forwarding tagged packet to Router Trunk link.`, 'info');

    // Switch 1 to Router (tagged VLAN 10)
    await animateVlanSegment(vlanCoords.sw1, vlanCoords.router, 'Ping (ICMP)', 10, vlanSvgRef.value);

    if (!routerEnabled.value) {
      logToConsole(`[Router] Link Inactive / Offline. Packet dropped. Ping failed.`, 'error');
      logToConsole(`Inter-subnets communication requires an active router acting as a Gateway!`, 'error');
      vlanAnimating.value = false;
      return;
    }

    logToConsole(`[Router] Received VLAN 10 packet. Stripping tag. Destination subnet is 192.168.20.0/24 (VLAN 20).`, 'success');
    logToConsole(`[Router] Routing packet to VLAN 20 sub-interface. Tagging packet with VLAN:20 tag and sending back to Switch 1.`, 'success');

    // Router to Switch 1 (tagged VLAN 20)
    await animateVlanSegment(vlanCoords.router, vlanCoords.sw1, 'Ping (ICMP)', 20, vlanSvgRef.value);

    logToConsole(`[Switch 1] Received tagged VLAN 20 packet from router. Forwarding across Trunk Link.`, 'info');

    // Switch 1 to Switch 2 (tagged VLAN 20)
    await animateVlanSegment(vlanCoords.sw1, vlanCoords.sw2, 'Ping (ICMP)', 20, vlanSvgRef.value);

    logToConsole(`[Switch 2] Received VLAN 20 packet on Trunk. Forwarding to Device D Access Port.`, 'info');

    // Switch 2 to Dev D (untagged at egress)
    await animateVlanSegment(vlanCoords.sw2, vlanCoords.D, 'Ping (ICMP)', null, vlanSvgRef.value);
    logToConsole(`[Device D] Ping request received! Generating unicast Ping Response (ICMP Reply) to Device A (untagged).`, 'success');

    // --- RETURN PATH (ICMP Reply) ---
    // Dev D to Switch 2
    await animateVlanSegment(vlanCoords.D, vlanCoords.sw2, 'Reply (ICMP)', null, vlanSvgRef.value);

    logToConsole(`[Switch 2] Tagging response packet with VLAN:20. Sending across Trunk Link to Switch 1.`, 'info');

    // Switch 2 to Switch 1 (tagged VLAN 20)
    await animateVlanSegment(vlanCoords.sw2, vlanCoords.sw1, 'Reply (ICMP)', 20, vlanSvgRef.value);

    logToConsole(`[Switch 1] Destination IP is on VLAN 10. Forwarding tagged VLAN 20 packet to Router to traverse subnets.`, 'info');

    // Switch 1 to Router (tagged VLAN 20)
    await animateVlanSegment(vlanCoords.sw1, vlanCoords.router, 'Reply (ICMP)', 20, vlanSvgRef.value);

    logToConsole(`[Router] Routing ICMP Reply from VLAN 20 to VLAN 10. Tagging with VLAN:10 and sending back to Switch 1.`, 'success');

    // Router to Switch 1 (tagged VLAN 10)
    await animateVlanSegment(vlanCoords.router, vlanCoords.sw1, 'Reply (ICMP)', 10, vlanSvgRef.value);

    logToConsole(`[Switch 1] Forwarding VLAN 10 response packet to Device A Access Port.`, 'info');

    // Switch 1 to Dev A (untagged)
    await animateVlanSegment(vlanCoords.sw1, vlanCoords.A, 'Reply (ICMP)', null, vlanSvgRef.value);

    logToConsole(`[Device A] Ping response received! Success: Inter-VLAN communication complete (RTT <1ms).`, 'success');
  } catch (err) {
    console.error(err);
  } finally {
    vlanAnimating.value = false;
  }
};

// Simulator 2: Split Horizon BDT Simulator
const shSvgRef = ref<SVGSVGElement | null>(null);
const splitHorizonMode = ref('symmetric');
const shAnimating = ref(false);

const shCoords = {
  A: { x: 350, y: 50 },
  B: { x: 180, y: 170 },
  C: { x: 520, y: 170 }
};

const setShMode = (mode: string) => {
  if (shAnimating.value) return;
  splitHorizonMode.value = mode;
  if (mode === 'symmetric') {
    logToConsole(`[BDT Config] Symmetrical routing loaded. All BBMDs cross-register in BDT tables.`, 'success');
  } else {
    logToConsole(`[BDT Config] Split Horizon active. BBMD B & BBMD C BDT tables partitioned.`, 'warning');
  }
};

const runShFlow = async (source: 'A' | 'B') => {
  if (shAnimating.value) return;
  shAnimating.value = true;

  logToConsole(`--- Starting Split Horizon simulation [Source: BBMD ${source}] ---`, 'system');

  try {
    if (source === 'A') {
      logToConsole(`[BMS A] Broadcaster triggers global discover. Tunneling to registered BDT partners...`, 'info');
      logToConsole(`[BMS A] BDT contains BBMD B & BBMD C. Sending parallel unicast tunnels...`, 'info');

      await Promise.all([
        animateLocalSegment(shCoords.A, shCoords.B, 'BVLL Tunnel', 'primary', shSvgRef.value),
        animateLocalSegment(shCoords.A, shCoords.C, 'BVLL Tunnel', 'primary', shSvgRef.value)
      ]);

      logToConsole(`[BBMD B] Received unicast tunnel from BMS A. Relaying broadcast to Tenant 1.`, 'success');
      logToConsole(`[BBMD C] Received unicast tunnel from BMS A. Relaying broadcast to Tenant 2.`, 'success');
      logToConsole(`[Result] BMS discovery reached all tenants successfully.`, 'success');
    }
    else if (source === 'B') {
      logToConsole(`[Tenant 1 B] Local controller initiates discovery. Relaying to BBMD B...`, 'info');

      if (splitHorizonMode.value === 'symmetric') {
        logToConsole(`[BBMD B] Symmetric mode: BDT registers BMS A & Tenant 2 C.`, 'info');
        logToConsole(`[BBMD B] Tunneling parallel unicasts to BBMD A and BBMD C...`, 'info');

        await Promise.all([
          animateLocalSegment(shCoords.B, shCoords.A, 'BVLL Tunnel', 'primary', shSvgRef.value),
          animateLocalSegment(shCoords.B, shCoords.C, 'BVLL Tunnel', 'primary', shSvgRef.value)
        ]);

        logToConsole(`[BMS A] Received tunnel from Tenant 1. Broadcast relayed to BMS segment.`, 'success');
        logToConsole(`[BBMD C] Received tunnel from Tenant 1. Broadcast relayed to Tenant 2 segment.`, 'success');
        logToConsole(`[Result] Security exposure! Tenant 1 discovery leaked to Tenant 2.`, 'warning');
      } else {
        logToConsole(`[BBMD B] Split Horizon mode: BDT registers BMS A *only* (Tenant 2 C is excluded).`, 'warning');
        logToConsole(`[BBMD B] Tunneling unicast *only* to BBMD A...`, 'info');

        await animateLocalSegment(shCoords.B, shCoords.A, 'BVLL Tunnel', 'primary', shSvgRef.value);

        logToConsole(`[BMS A] Received tunnel from Tenant 1. Broadcast relayed to BMS segment.`, 'success');
        logToConsole(`[Tenant 2 C] Isolated: BBMD C never receives Tenant 1 broadcasts. Broadcast contained!`, 'success');
        logToConsole(`[Result] Success! Broadcast contained at the subnet boundary.`, 'success');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    shAnimating.value = false;
  }
};
</script>
