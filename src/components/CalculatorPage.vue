<template>
  <div class="grid-1-3col">
    <!-- Inputs Sidebar -->
    <div class="glass-card flex-col">
      <h2 class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        Configuration
      </h2>

      <div class="preset-selector form-group">
        <label for="preset-select">Scenarios & Presets</label>
        <select id="preset-select" v-model="selectedPreset" @change="loadPreset">
          <option value="direct-trap">Direct Subnet Trap (Broadcast Intersection)</option>
          <option value="same-subnet">Standard Same Subnet (Working)</option>
          <option value="isolated-subnets">Separate Subnets (Requires BBMD)</option>
          <option value="overlapping-asym">Asymmetrical Subnet Overlap</option>
          <option value="multi-port">Same IP Subnet, Separate BACnet Ports</option>
        </select>
      </div>

      <!-- Device A Inputs -->
      <div class="calculator-device-group source">
        <h3 style="font-family: var(--font-heading); font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--primary);">Device A (Source)</h3>
        <div class="form-group">
          <label>IP Address</label>
          <input type="text" v-model="devAIp" :style="{ borderColor: isIpValid(devAIp) ? '' : 'var(--error)' }" placeholder="e.g. 192.168.0.5">
        </div>
        <div class="form-group"><label>BACnet/IP UDP Port</label><input v-model.number="devAPort" type="number" min="1" max="65535"></div>
        <div class="form-group">
          <label>Subnet Mask</label>
          <div class="input-row">
            <input type="text" v-model="devAMask" :style="{ borderColor: isMaskValid(devAMask) ? '' : 'var(--error)' }" placeholder="255.255.254.0">
            <select v-model.number="devACidr" class="cidr-select">
              <option v-for="c in cidrOptions" :key="c" :value="c">/{{ c }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Device B Inputs -->
      <div class="calculator-device-group destination">
        <h3 style="font-family: var(--font-heading); font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--secondary);">Device B (Destination)</h3>
        <div class="form-group">
          <label>IP Address</label>
          <input type="text" v-model="devBIp" :style="{ borderColor: isIpValid(devBIp) ? '' : 'var(--error)' }" placeholder="e.g. 192.168.1.6">
        </div>
        <div class="form-group">
          <label>Subnet Mask</label>
          <div class="input-row">
            <input type="text" v-model="devBMask" :style="{ borderColor: isMaskValid(devBMask) ? '' : 'var(--error)' }" placeholder="255.255.255.0">
            <select v-model.number="devBCidr" class="cidr-select">
              <option v-for="c in cidrOptions" :key="c" :value="c">/{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>BACnet/IP UDP Port</label><input v-model.number="devBPort" type="number" min="1" max="65535"></div>
      </div>

      <!-- BBMD Infrastructure Configuration Panel -->
      <div v-if="isRouted" class="calculator-bbmd-config">
        <h3 style="font-family: var(--font-heading); font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
          BBMD Configuration
        </h3>
        <p class="field-hint">This scenario uses one BACnet/IP network spanning two IP subnets. Configure BBMD distribution for broadcast discovery; already-addressed unicast uses ordinary IP routing.</p>

        <!-- BBMD A Config -->
        <div class="calculator-bbmd-node source">
          <label style="font-size: 0.8rem; color: var(--primary); font-weight: 600; display: block; margin-bottom: 0.25rem;">Subnet A BBMD IP</label>
          <input type="text" v-model="bbmdAIp" placeholder="e.g. 192.168.0.99" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; margin-bottom: 0.5rem; width: 100%;">

          <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem; font-weight: 500;">BBMD A BDT Table</label>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <input v-for="(_, idx) in bdtEntriesA" :key="'a-' + idx" type="text" v-model="bdtEntriesA[idx]" placeholder="Slot IP" style="padding: 0.3rem 0.4rem; font-size: 0.8rem; width: 100%;">
          </div>
        </div>

        <!-- BBMD B Config -->
        <div class="calculator-bbmd-node destination">
          <label style="font-size: 0.8rem; color: var(--secondary); font-weight: 600; display: block; margin-bottom: 0.25rem;">Subnet B BBMD IP</label>
          <input type="text" v-model="bbmdBIp" placeholder="e.g. 192.168.1.99" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; margin-bottom: 0.5rem; width: 100%;">

          <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem; font-weight: 500;">BBMD B BDT Table</label>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <input v-for="(_, idx) in bdtEntriesB" :key="'b-' + idx" type="text" v-model="bdtEntriesB[idx]" placeholder="Slot IP" style="padding: 0.3rem 0.4rem; font-size: 0.8rem; width: 100%;">
          </div>
        </div>
      </div>
    </div>

    <!-- Calculations & Visual Simulator -->
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Subnet Comparison Tables -->
      <div class="glass-card">
        <h2 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Subnet Calculation & Analysis
        </h2>

        <div class="grid-2col">
          <!-- Device A Stats -->
          <div v-if="detailsA">
            <h4 style="font-family: var(--font-heading); font-size: 1rem; color: var(--primary); margin-bottom: 0.5rem;">Device A Subnet Details</h4>
            <table class="metrics-table">
              <tbody>
                <tr>
                  <td class="label">Subnet Mask</td>
                  <td class="value">{{ detailsA.mask }} (/{{ detailsA.cidr }})
                    <span class="binary">{{ toBinaryString(detailsA.maskLong) }}</span>
                  </td>
                </tr>
                <tr>
                  <td class="label">Network ID</td>
                  <td class="value">{{ detailsA.network }}</td>
                </tr>
                <tr>
                  <td class="label">Broadcast IP</td>
                  <td class="value" style="font-weight: 600; color: #fff;">{{ detailsA.broadcast }}</td>
                </tr>
                <tr>
                  <td class="label">Usable IP Range</td>
                  <td class="value">{{ detailsA.firstUsable }} - {{ detailsA.lastUsable }}</td>
                </tr>
                <tr>
                  <td class="label">Total Hosts</td>
                  <td class="value">{{ detailsA.numHosts }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Device B Stats -->
          <div v-if="detailsB">
            <h4 style="font-family: var(--font-heading); font-size: 1rem; color: var(--secondary); margin-bottom: 0.5rem;">Device B Subnet Details</h4>
            <table class="metrics-table">
              <tbody>
                <tr>
                  <td class="label">Subnet Mask</td>
                  <td class="value">{{ detailsB.mask }} (/{{ detailsB.cidr }})
                    <span class="binary">{{ toBinaryString(detailsB.maskLong) }}</span>
                  </td>
                </tr>
                <tr>
                  <td class="label">Network ID</td>
                  <td class="value">{{ detailsB.network }}</td>
                </tr>
                <tr>
                  <td class="label">Broadcast IP</td>
                  <td class="value" style="font-weight: 600; color: #fff;">{{ detailsB.broadcast }}</td>
                </tr>
                <tr>
                  <td class="label">Usable IP Range</td>
                  <td class="value">{{ detailsB.firstUsable }} - {{ detailsB.lastUsable }}</td>
                </tr>
                <tr>
                  <td class="label">Total Hosts</td>
                  <td class="value">{{ detailsB.numHosts }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Verdict Alert Card -->
        <div v-if="verdict" class="verdict-box" :class="verdict.class">
          <div class="verdict-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="verdict.icon">
            </svg>
            <span>{{ verdict.title }}</span>
          </div>
          <div class="verdict-body" v-html="verdict.body"></div>
        </div>
      </div>

      <!-- Network Path Simulator (SVG and control buttons) -->
      <div class="glass-card">
        <h2 class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Live Network Path & Packet Simulator
        </h2>

        <p>Simulate how BACnet/IP packets travel between Device A and Device B based on current configurations. Click an action to inject a BACnet service frame and trace its flow.</p>

        <!-- Simulator Canvas SVG -->
        <svg ref="svgRef" id="calc-sim-svg" class="diagram-canvas" viewBox="0 0 800 320" width="100%">
          <!-- Wires -->
          <path id="wire-a-to-swA" d="M 120 160 L 320 220" class="wire-path active"></path>
          <path v-show="!isRouted" id="wire-b-to-swA" d="M 700 152.5 L 320 220" class="wire-path active"></path>
          <path v-show="isRouted" id="wire-b-to-swB" d="M 700 152.5 L 480 220" class="wire-path active"></path>
          <path v-show="isRouterVisible" id="wire-swA-to-router" d="M 320 220 L 400 100" class="wire-path"></path>
          <path v-show="isRouted" id="wire-swB-to-router" d="M 480 220 L 400 100" class="wire-path"></path>

          <!-- Switch A -->
          <g class="node-group" id="sim-node-swA">
            <rect x="290" y="200" width="60" height="40" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"></rect>
            <use href="#ace-sim-network" class="sim-node-icon" x="310" y="204" width="20" height="20" />
            <text x="320" y="234" class="sim-node-caption">
              {{ isRouted ? 'Switch A' : 'Switch' }}
            </text>
          </g>

          <!-- Switch B -->
          <g v-show="isRouted" class="node-group" id="sim-node-swB">
            <rect x="450" y="200" width="60" height="40" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"></rect>
            <use href="#ace-sim-network" class="sim-node-icon" x="470" y="204" width="20" height="20" />
            <text x="480" y="234" class="sim-node-caption">Switch B</text>
          </g>

          <!-- IP Router -->
          <AceSvgNetworkNode v-show="isRouterVisible" :x="400" :y="100" :radius="24" :icon-size="24" label="Router" />

          <!-- Device A Node -->
          <g class="node-group" id="sim-node-devA">
            <rect x="40" y="120" width="120" height="65" rx="8"></rect>
            <use href="#ace-sim-device" class="sim-node-icon" x="50" y="130" width="22" height="22" />
            <text x="110" y="142" class="node-label">Device A</text>
            <text x="100" y="158" class="node-ip">{{ devAIp }}:{{ devAPort }}</text>
            <text x="100" y="172" font-family="Inter" font-size="9" fill="#64748b" text-anchor="middle">/{{ devACidr }}</text>
          </g>

          <!-- Device B Node -->
          <g class="node-group" id="sim-node-devB">
            <rect x="640" y="120" width="120" height="65" rx="8"></rect>
            <use href="#ace-sim-device" class="sim-node-icon secondary" x="650" y="130" width="22" height="22" />
            <text x="710" y="142" class="node-label">Device B</text>
            <text x="700" y="158" class="node-ip">{{ devBIp }}:{{ devBPort }}</text>
            <text x="700" y="172" font-family="Inter" font-size="9" fill="#64748b" text-anchor="middle">/{{ devBCidr }}</text>
          </g>

          <!-- BBMD Wires -->
          <path v-show="isRouted && bbmdEnabled" d="M 320 220 L 100 90" class="wire-path" style="stroke-dasharray: 4; stroke: var(--primary);"></path>
          <path v-show="isRouted && bbmdEnabled" d="M 480 220 L 700 90" class="wire-path" style="stroke-dasharray: 4; stroke: var(--secondary);"></path>

          <!-- BBMD Visual Overlays -->
          <g v-show="isRouted && bbmdEnabled" id="sim-bbmd-a">
            <rect x="70" y="70" width="60" height="20" rx="4" fill="var(--primary)" stroke="var(--primary)" stroke-width="1"></rect>
            <text x="100" y="83" font-family="Inter" font-size="9" font-weight="600" fill="#121212" text-anchor="middle">BBMD A</text>
            <text x="100" y="103" font-family="Inter" font-size="8" fill="var(--primary)" text-anchor="middle">{{ bbmdAIp }}</text>
          </g>

          <g v-show="isRouted && bbmdEnabled" id="sim-bbmd-b">
            <rect x="670" y="70" width="60" height="20" rx="4" fill="var(--secondary)" stroke="var(--secondary)" stroke-width="1"></rect>
            <text x="700" y="83" font-family="Inter" font-size="9" font-weight="600" fill="#121212" text-anchor="middle">BBMD B</text>
            <text x="700" y="103" font-family="Inter" font-size="8" fill="var(--secondary)" text-anchor="middle">{{ bbmdBIp }}</text>
          </g>
        </svg>

        <!-- Simulator Actions Buttons -->
        <div class="sim-controls-panel">
          <AceToggle v-model="bcastIam" class="sim-option-toggle" label="Broadcast I-Am in this scenario" description="Compare broadcast and directed response paths" />

          <AceToggle v-if="isRouted" v-model="bbmdEnabled" class="sim-option-toggle" label="Enable BBMD distribution" />

           <AppButton variant="primary" :disabled="isAnimating" @click="runSimulation('bcast-a')">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 0.4rem;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </template>
            Who-Is Broadcast (A)
          </AppButton>
          <AppButton variant="primary" :disabled="isAnimating" @click="runSimulation('bcast-b')">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 0.4rem;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </template>
            Who-Is Broadcast (B)
          </AppButton>
          <AppButton variant="secondary" :disabled="isAnimating" @click="runSimulation('unicast-a-b')">
            A &rarr; B Unicast (ReadProperty)
          </AppButton>
          <AppButton variant="secondary" :disabled="isAnimating" @click="runSimulation('unicast-b-a')">
            B &rarr; A Unicast (ReadProperty)
          </AppButton>
        </div>

        <!-- Output Console Log Component -->
        <TerminalLog />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import TerminalLog from './TerminalLog.vue';
import AppButton from './AppButton.vue';
import AceToggle from './AceToggle.vue';
import AceSvgNetworkNode from './AceSvgNetworkNode.vue';
import {
  ipToLong,
  longToIp,
  cidrToMask,
  maskToCidr,
  validateMaskString,
  getSubnetDetails,
  analyzeRelationship,
  toBinaryString,
  SubnetDetails
} from '../lib/subnet';

// Presets definitions
const presets = {
  'direct-trap': { ipA: '192.168.0.5', cidrA: 23, ipB: '192.168.1.6', cidrB: 24, portA: 47808, portB: 47808 },
  'same-subnet': { ipA: '192.168.1.50', cidrA: 24, ipB: '192.168.1.60', cidrB: 24, portA: 47808, portB: 47808 },
  'isolated-subnets': { ipA: '192.168.1.50', cidrA: 24, ipB: '192.168.2.60', cidrB: 24, portA: 47808, portB: 47808 },
  'overlapping-asym': { ipA: '192.168.0.50', cidrA: 23, ipB: '192.168.1.60', cidrB: 24, portA: 47808, portB: 47808 },
  'multi-port': { ipA: '192.168.1.50', cidrA: 24, ipB: '192.168.1.60', cidrB: 24, portA: 47808, portB: 47809 }
};

const selectedPreset = ref<keyof typeof presets>('direct-trap');

// Device A Inputs
const devAIp = ref('192.168.0.5');
const devAMask = ref('255.255.254.0');
const devACidr = ref(23);
const devAPort = ref(47808);

// Device B Inputs
const devBIp = ref('192.168.1.6');
const devBMask = ref('255.255.255.0');
const devBCidr = ref(24);
const devBPort = ref(47808);

// BBMD Configs
const bbmdEnabled = ref(false);
const bcastIam = ref(true);
const bbmdAIp = ref('192.168.0.99');
const bbmdBIp = ref('192.168.1.99');
const bdtEntriesA = ref<string[]>(['192.168.0.99', '192.168.1.99', '']);
const bdtEntriesB = ref<string[]>(['192.168.0.99', '192.168.1.99', '']);

const cidrOptions = Array.from({ length: 25 }, (_, i) => 8 + i); // /8 to /32

const isIpValid = (ip: string) => ipToLong(ip) !== null;
const isMaskValid = (mask: string) => validateMaskString(mask);

// Synchronize CIDRs and Masks
watch(devACidr, (val) => {
  devAMask.value = longToIp(cidrToMask(val));
});
watch(devAMask, (val) => {
  if (validateMaskString(val)) {
    const long = ipToLong(val);
    if (long !== null) devACidr.value = maskToCidr(long);
  }
});
watch(devBCidr, (val) => {
  devBMask.value = longToIp(cidrToMask(val));
});
watch(devBMask, (val) => {
  if (validateMaskString(val)) {
    const long = ipToLong(val);
    if (long !== null) devBCidr.value = maskToCidr(long);
  }
});

const loadPreset = () => {
  const p = presets[selectedPreset.value];
  if (p) {
    devAIp.value = p.ipA;
    devACidr.value = p.cidrA;
    devAMask.value = longToIp(cidrToMask(p.cidrA));
    devBIp.value = p.ipB;
    devAPort.value = p.portA;
    devBPort.value = p.portB;
    devBCidr.value = p.cidrB;
    devBMask.value = longToIp(cidrToMask(p.cidrB));
  }
};

// Subnet details computeds
const detailsA = computed<SubnetDetails | null>(() => getSubnetDetails(devAIp.value, devACidr.value));
const detailsB = computed<SubnetDetails | null>(() => getSubnetDetails(devBIp.value, devBCidr.value));

const relationship = computed(() => {
  if (!detailsA.value || !detailsB.value) return null;
  return analyzeRelationship(detailsA.value, detailsB.value);
});

const isRouted = computed(() => {
  const r = relationship.value;
  if (!r) return false;
  return !(r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet);
});

const isRouterVisible = computed(() => {
  const r = relationship.value;
  if (!r) return false;
  return isRouted.value || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet;
});

// Verdict text mapping
const verdict = computed(() => {
  const r = relationship.value;
  const dA = detailsA.value;
  const dB = detailsB.value;
  if (!r || !dA || !dB) return null;

  if (r.sameSubnet && devAPort.value !== devBPort.value) {
    return {
      class: 'verdict-warning',
      title: 'Same IP Subnet, Separate BACnet/IP Networks',
      icon: `<path d="M4 7h16M4 12h16M4 17h16"></path>`,
      body: `Both devices share ${dA.network}/${dA.cidr}, but Device A listens on UDP ${devAPort.value} and Device B listens on UDP ${devBPort.value}. Their local broadcasts use the same IPv4 broadcast address with different UDP destination ports, so they are separate B/IP datalinks. Communication between their BACnet network numbers requires a BACnet router with a port on each B/IP network; changing only an IP router or subnet mask does not join them.`
    };
  } else if (r.sameSubnet) {
    return {
      class: 'verdict-success',
      title: 'Subnets Match: Direct BACnet/IP Enabled',
      icon: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`,
      body: `Both devices calculate the same IP subnet (${dA.network}/${dA.cidr}), so local unicast and local B/IP broadcast do not require a router or BBMD. Communication can still fail because of duplicate IPs, host firewalls, switch/VLAN isolation, different BACnet UDP ports, or a stopped BACnet service.`
    };
  } else if (r.broadcastIntersectionTrap) {
    return {
      class: 'verdict-error',
      title: 'Broadcast Intersection Trap Detected!',
      icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      body: `<strong>Asymmetric forwarding risk.</strong> The masks produce the same broadcast destination (<code>${dA.broadcast}</code>) but different local/remote decisions. On a shared VLAN, both IP stacks may accept the discovery. Device A sends directly while Device B sends toward its gateway. Failure is plausible when the gateway is absent or wrong, a return route is missing, proxy ARP behaves unexpectedly, or an ACL blocks the directed reply.`
    };
  } else if (r.asymmetricalSubnet) {
    const localThinker = r.aThinksBInSubnet ? 'Device A' : 'Device B';
    const remoteThinker = r.aThinksBInSubnet ? 'Device B' : 'Device A';
    return {
      class: 'verdict-warning',
      title: 'Asymmetrical Overlapping Subnets',
      icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      body: `<strong>${localThinker}</strong> treats the peer as on-link while <strong>${remoteThinker}</strong> treats it as off-link because the masks differ. This does not guarantee failure, but it creates an asymmetric path. Check gateway configuration, routes in both directions, proxy ARP, ACLs, and whether both switch ports are actually in the same VLAN.`
    };
  } else if (r.overlappingSubnet) {
    return {
      class: 'verdict-warning',
      title: 'Symmetrical Subnet Overlap: Broadcast Mismatch',
      icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      body: `Both devices classify the peer as on-link, so directed traffic is expected to use ARP and Layer 2 delivery when they share a VLAN. Their different masks produce different broadcast addresses (<code>${dA.broadcast}</code> vs <code>${dB.broadcast}</code>), so a local Who-Is sent to one broadcast address may not be delivered to or accepted by the other host. Verify VLAN membership, host broadcast handling, BACnet ports, and masks.`
    };
  } else {
    return {
      class: 'verdict-warning',
      title: 'Separate IP Subnets: Broadcast Distribution Needed',
      icon: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,
      body: `The devices are on separate IP subnets. Ordinary IP routing can carry directed BACnet/IP traffic, but it does not forward the local B/IP broadcast used in this simulation. For one BACnet/IP network spanning both subnets, configure Annex J broadcast distribution or foreign-device registration. If they are distinct BACnet network numbers, use a BACnet router. Also verify routes, return routes, UDP ports, ACLs, and BDT/FDT entries.`
    };
  }
});

// Logs inject
const logToConsole = inject<(text: string, type?: 'system' | 'info' | 'success' | 'warning' | 'error') => void>('logToConsole', () => {});

// Node coordinates
const coords = {
  devA: { x: 100, y: 152.5 },
  devB: { x: 700, y: 152.5 },
  swA: { x: 320, y: 220 },
  swB: { x: 480, y: 220 },
  router: { x: 400, y: 100 },
  bbmd1: { x: 100, y: 90 },
  bbmd2: { x: 700, y: 90 }
};

const svgRef = ref<SVGSVGElement | null>(null);
const isAnimating = ref(false);

const animatePacket = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  labelText: string,
  type = 'primary'
) => {
  return new Promise<void>((resolve) => {
    const targetSvg = svgRef.value;
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

    const duration = 750;
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

const runSimulation = async (type: 'bcast-a' | 'bcast-b' | 'unicast-a-b' | 'unicast-b-a') => {
  if (isAnimating.value) return;
  isAnimating.value = true;

  const r = relationship.value;
  const dA = detailsA.value;
  const dB = detailsB.value;
  if (!r || !dA || !dB) {
    isAnimating.value = false;
    return;
  }

  const hasBbmd = bbmdEnabled.value && isRouted.value;

  logToConsole(`--- Starting packet transmission [Type: ${type.toUpperCase()}] ---`, 'system');

  try {
    if (type === 'bcast-a') {
      logToConsole(`[Device A] Sending Who-Is (Broadcast) on UDP ${devAPort.value}`, 'info');
      logToConsole(`[Device A] Target Broadcast address: ${dA.broadcast}`, 'info');

      await animatePacket(coords.devA, coords.swA, 'Who-Is (BC)');
      logToConsole(`[Switch A] Broadcast received. Flooding packet out all ports.`, 'success');

      if (r.sameSubnet) {
        await animatePacket(coords.swA, coords.devB, 'Who-Is (BC)');
        if (devAPort.value !== devBPort.value) {
          logToConsole(`[Device B] IP stack receives the Ethernet/IP broadcast, but no BACnet service is listening on UDP ${devAPort.value}. Device B belongs to the UDP ${devBPort.value} B/IP network.`, 'warning');
          logToConsole(`[Device A] TIMEOUT. A BACnet router attached to both B/IP ports is required to cross between the BACnet networks.`, 'error');
          return;
        }

        if (bcastIam.value) {
          logToConsole(`[Device B] Received Who-Is. Generating I-Am broadcast response to target ${dB.broadcast}`, 'success');
          await Promise.all([
            animatePacket(coords.devB, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ]);
          logToConsole(`[Switch A] Broadcast flooded. Device A receives it.`, 'success');
          await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device A] Received I-Am broadcast reply. Device Binding complete. Direct link online!`, 'success');
        } else {
          logToConsole(`[Device B] Received Who-Is. Generating I-Am unicast reply to ${dA.ip}`, 'success');
          await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swA, coords.devA, 'I-Am (UC)', 'secondary');
          logToConsole(`[Device A] Received I-Am reply. Device Binding complete. Direct link online!`, 'success');
        }
      }
      else if (r.broadcastIntersectionTrap) {
        logToConsole(`[Switch A] Broadcasting to local segment: Device B & Gateway Router both receive it`, 'warning');
        await Promise.all([
          animatePacket(coords.swA, coords.devB, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);

        logToConsole(`[Router] The local IP broadcast is not forwarded by this router configuration.`, 'error');
        logToConsole(`[Device B] Received Who-Is. Believes sender A (${dA.ip}) is remote.`, 'warning');
        logToConsole(`[Device B] Generating I-Am reply. Target is remote: routing to Gateway...`, 'warning');

        await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
        await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
        logToConsole(`[Router] Received the reply addressed to ${dA.ip}.`, 'error');
        logToConsole(`[Router] This scenario has no valid hairpin/return path to Device A, so the reply is dropped.`, 'error');
        logToConsole(`[Device A] TIMEOUT. Device A never receives I-Am from Device B. Discovery failed.`, 'error');
      }
      else if (r.asymmetricalSubnet) {
        logToConsole(`[Switch A] Local broadcast forwarded to B and Router.`, 'warning');
        await Promise.all([
          animatePacket(coords.swA, coords.devB, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped broadcast.`, 'error');

        if (bcastIam.value) {
          logToConsole(`[Device B] Generating I-Am broadcast response.`, 'success');
          await Promise.all([
            animatePacket(coords.devB, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ]);
          await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device A] Received I-Am broadcast reply. Discovery successful!`, 'success');
        } else {
          if (r.bThinksAInSubnet) {
            logToConsole(`[Device B] Thinks A is local. Sending I-Am direct reply.`, 'success');
            await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'I-Am (UC)', 'secondary');
            logToConsole(`[Device A] Received I-Am reply. Communication established.`, 'success');
          } else {
            logToConsole(`[Device B] Thinks A is remote. Routing I-Am reply to Gateway...`, 'warning');
            await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
            logToConsole(`[Router] This modeled gateway has no valid hairpin/return path, so the reply is dropped.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
          }
        }
      }
      else if (r.overlappingSubnet) {
        logToConsole(`[Switch A] Local broadcast forwarded to B and Router.`, 'warning');
        await Promise.all([
          animatePacket(coords.swA, coords.devB, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped broadcast.`, 'error');

        logToConsole(`[Device B] Received broadcast frame on UDP ${devAPort.value}.`, 'warning');
        logToConsole(`[Device B] This simulation rejects destination ${dA.broadcast}; B is configured to use ${dB.broadcast}.`, 'error');
        logToConsole(`[Device B] No response is generated under the modeled receive policy.`, 'error');
        logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
      }
      else {
        // Routed subnets
        await animatePacket(coords.swA, coords.router, 'Who-Is (BC)');
        logToConsole(`[Router] Received Who-Is broadcast. Blocked from crossing subnet boundary.`, 'error');

        if (!hasBbmd) {
          logToConsole(`[Subnet A] No BBMD configured. Broadcast Who-Is cannot cross subnets.`, 'error');
          logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
        } else {
          logToConsole(`[BBMD A] Received the Original-Broadcast-NPDU. Sending a Forwarded-NPDU to BBMD B (${bbmdBIp.value})...`, 'success');
          await animatePacket(coords.bbmd1, coords.swA, 'BVLL (UC)');
          await animatePacket(coords.swA, coords.router, 'BVLL (UC)');
          await animatePacket(coords.router, coords.swB, 'BVLL (UC)');
          await animatePacket(coords.swB, coords.bbmd2, 'BVLL (UC)');

          const longB = ipToLong(bbmdBIp.value);
          const bdtB = bdtEntriesB.value.map(ipToLong).filter((val): val is number => val !== null);
          const selfALong = ipToLong(bbmdAIp.value);

          if (longB === null || selfALong === null || !bdtB.includes(selfALong)) {
            logToConsole(`[BBMD B] This modeled configuration rejects the Forwarded-NPDU because BBMD A (${bbmdAIp.value}) is absent from BBMD B's configured peer list.`, 'error');
            logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
            return;
          }

          logToConsole(`[BBMD B] Forwarded-NPDU received. Distributing the embedded Who-Is on Subnet B...`, 'success');
          await animatePacket(coords.bbmd2, coords.swB, 'Who-Is (BC)');
          await animatePacket(coords.swB, coords.devB, 'Who-Is (BC)');

          if (bcastIam.value) {
            logToConsole(`[Device B] Received Who-Is. Generating I-Am broadcast response to target ${dB.broadcast}`, 'success');
            await Promise.all([
              animatePacket(coords.devB, coords.swB, 'I-Am (BC)', 'secondary'),
              animatePacket(coords.swB, coords.router, 'I-Am (BC)', 'secondary'),
              animatePacket(coords.swB, coords.bbmd2, 'I-Am (BC)', 'secondary')
            ]);
            logToConsole(`[Router] Received broadcast. Dropped.`, 'error');

            logToConsole(`[BBMD B] Received the local Original-Broadcast-NPDU. Sending a Forwarded-NPDU to BBMD A (${bbmdAIp.value})...`, 'success');
            await animatePacket(coords.bbmd2, coords.swB, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swB, coords.router, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.router, coords.swA, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swA, coords.bbmd1, 'BVLL (UC)', 'secondary');

            const longA = ipToLong(bbmdAIp.value);
            const bdtA = bdtEntriesA.value.map(ipToLong).filter((val): val is number => val !== null);
            const selfBLong = ipToLong(bbmdBIp.value);

            if (longA === null || selfBLong === null || !bdtA.includes(selfBLong)) {
              logToConsole(`[Subnet A] The Forwarded-NPDU cannot be delivered because BBMD A is inactive or missing from this configuration.`, 'error');
              logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
              return;
            }

            logToConsole(`[BBMD A] Forwarded-NPDU received. Distributing the embedded I-Am on Subnet A...`, 'success');
            await animatePacket(coords.bbmd1, coords.swA, 'I-Am (BC)', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
            logToConsole(`[Device A] Received the I-Am. Discovery succeeded through BBMD broadcast distribution.`, 'success');
          } else {
            logToConsole(`[Device B] Received Who-Is. Generating I-Am unicast reply to remote sender ${dA.ip}`, 'success');
            await animatePacket(coords.devB, coords.swB, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swB, coords.router, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.router, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'I-Am (UC)', 'secondary');
            logToConsole(`[Device A] Received I-Am unicast reply. Discovery successful!`, 'success');
          }
        }
      }
    }
    else if (type === 'bcast-b') {
      logToConsole(`[Device B] Sending Who-Is (Broadcast) on UDP ${devBPort.value}`, 'info');
      logToConsole(`[Device B] Target Broadcast address: ${dB.broadcast}`, 'info');

      if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
        await animatePacket(coords.devB, coords.swA, 'Who-Is (BC)');
        logToConsole(`[Switch A] Broadcast received. Forwarding to all ports.`, 'success');

        await Promise.all([
          animatePacket(coords.swA, coords.devA, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped broadcast.`, 'error');

        if (r.sameSubnet && devAPort.value !== devBPort.value) {
          logToConsole(`[Device A] IP stack receives the frame, but no BACnet service is listening on UDP ${devBPort.value}; A is configured for UDP ${devAPort.value}.`, 'warning');
          logToConsole(`[Device B] TIMEOUT. The two UDP ports identify separate B/IP datalinks.`, 'error');
          return;
        }

        if (r.overlappingSubnet) {
          logToConsole(`[Device A] Received broadcast frame on UDP ${devBPort.value}.`, 'warning');
          logToConsole(`[Device A] This simulation rejects destination ${dB.broadcast}; A is configured to use ${dA.broadcast}.`, 'error');
          logToConsole(`[Device A] No response is generated under the modeled receive policy.`, 'error');
          logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
          return;
        }

        logToConsole(`[Device A] Received Who-Is. Checking if B is local...`, 'success');

        if (bcastIam.value) {
          logToConsole(`[Device A] Generating I-Am broadcast response to target ${dA.broadcast}`, 'success');
          await Promise.all([
            animatePacket(coords.devA, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ]);
          logToConsole(`[Switch A] Broadcast flooded. Device B receives it.`, 'success');
          await animatePacket(coords.swA, coords.devB, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device B] Received I-Am broadcast reply. Discovery successful!`, 'success');
        } else {
          logToConsole(`[Device A] Generating I-Am unicast reply to ${dB.ip}`, 'success');
          await animatePacket(coords.devA, coords.swA, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swA, coords.devB, 'I-Am (UC)', 'secondary');
          logToConsole(`[Device B] Received I-Am. Discovery successful!`, 'success');
        }
      }
      else {
        // Routed subnets
        await animatePacket(coords.devB, coords.swB, 'Who-Is (BC)');
        logToConsole(`[Switch B] Broadcast forwarded to Router & BBMD B.`, 'success');
        await Promise.all([
          animatePacket(coords.swB, coords.router, 'Who-Is (BC)'),
          animatePacket(coords.swB, coords.bbmd2, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped Who-Is broadcast.`, 'error');

        if (!hasBbmd) {
          logToConsole(`[Subnet B] No BBMD configured. Broadcast cannot cross subnets.`, 'error');
          logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
        } else {
          logToConsole(`[BBMD B] Received the Original-Broadcast-NPDU. Sending a Forwarded-NPDU to BBMD A (${bbmdAIp.value})...`, 'success');
          await animatePacket(coords.bbmd2, coords.swB, 'BVLL (UC)');
          await animatePacket(coords.swB, coords.router, 'BVLL (UC)');
          await animatePacket(coords.router, coords.swA, 'BVLL (UC)');
          await animatePacket(coords.swA, coords.bbmd1, 'BVLL (UC)');

          const longA = ipToLong(bbmdAIp.value);
          const bdtA = bdtEntriesA.value.map(ipToLong).filter((val): val is number => val !== null);
          const selfBLong = ipToLong(bbmdBIp.value);

          if (longA === null || selfBLong === null || !bdtA.includes(selfBLong)) {
            logToConsole(`[BBMD A] This modeled configuration rejects the Forwarded-NPDU because BBMD B (${bbmdBIp.value}) is absent from BBMD A's configured peer list.`, 'error');
            logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
            return;
          }

          logToConsole(`[BBMD A] Forwarded-NPDU received. Distributing the embedded Who-Is on Subnet A...`, 'success');
          await animatePacket(coords.bbmd1, coords.swA, 'Who-Is (BC)');
          await animatePacket(coords.swA, coords.devA, 'Who-Is (BC)');

          if (bcastIam.value) {
            logToConsole(`[Device A] Received Who-Is. Generating I-Am broadcast response to target ${dA.broadcast}`, 'success');
            await Promise.all([
              animatePacket(coords.devA, coords.swA, 'I-Am (BC)', 'secondary'),
              animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary'),
              animatePacket(coords.swA, coords.bbmd1, 'I-Am (BC)', 'secondary')
            ]);
            logToConsole(`[Router] Received broadcast. Dropped.`, 'error');

            logToConsole(`[BBMD A] Received the local Original-Broadcast-NPDU. Sending a Forwarded-NPDU to BBMD B (${bbmdBIp.value})...`, 'success');
            await animatePacket(coords.bbmd1, coords.swA, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swA, coords.router, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.router, coords.swB, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swB, coords.bbmd2, 'BVLL (UC)', 'secondary');

            const longB = ipToLong(bbmdBIp.value);
            const bdtB = bdtEntriesB.value.map(ipToLong).filter((val): val is number => val !== null);
            const selfALong = ipToLong(bbmdAIp.value);

            if (longB === null || selfALong === null || !bdtB.includes(selfALong)) {
              logToConsole(`[Subnet B] The Forwarded-NPDU cannot be delivered because BBMD B is inactive or missing from this configuration.`, 'error');
              logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
              return;
            }

            logToConsole(`[BBMD B] Forwarded-NPDU received. Distributing the embedded I-Am on Subnet B...`, 'success');
            await animatePacket(coords.bbmd2, coords.swB, 'I-Am (BC)', 'secondary');
            await animatePacket(coords.swB, coords.devB, 'I-Am (BC)', 'secondary');
            logToConsole(`[Device B] Received I-Am broadcast reply. Discovery successful!`, 'success');
          } else {
            logToConsole(`[Device A] Received Who-Is. Generating I-Am unicast reply to remote sender ${dB.ip}`, 'success');
            await animatePacket(coords.devA, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.router, coords.swB, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swB, coords.devB, 'I-Am (UC)', 'secondary');
            logToConsole(`[Device B] Received I-Am unicast reply. Discovery successful!`, 'success');
          }
        }
      }
    }
    else if (type === 'unicast-a-b') {
      logToConsole(`[Device A] Injecting BACnet Unicast ReadProperty frame`, 'info');
      logToConsole(`[Device A] Destination IP: ${dB.ip}`, 'info');

      if (r.aThinksBInSubnet) {
        logToConsole(`[Device A] Thinks B is local. Resolving B's MAC address via ARP.`, 'success');
        logToConsole(`[Device A] Sending directly via Layer 2 switch segment.`, 'success');

        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          await animatePacket(coords.devA, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.devB, 'ReadProp');
          logToConsole(`[Device B] Received unicast request. Generating ACK reply.`, 'success');

          if (r.bThinksAInSubnet) {
            logToConsole(`[Device B] Thinks A is local. Replying directly.`, 'success');
            await animatePacket(coords.devB, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'ACK', 'secondary');
            logToConsole(`[Device A] Received ACK. Communication succeeded!`, 'success');
          } else {
            logToConsole(`[Device B] Thinks A is remote. Routing ACK reply to Gateway...`, 'warning');
            await animatePacket(coords.devB, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.router, 'ACK', 'secondary');
            logToConsole(`[Router] Routed packet dropped. Gateway communication blocked.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Reply lost.`, 'error');
          }
        } else {
          // Asymmetric error
          await animatePacket(coords.devA, coords.swA, 'ReadProp');
          logToConsole(`[Switch A] ARP failed to locate B's MAC (different physical segment!). Packet lost.`, 'error');
          logToConsole(`[Device B] Never received request.`, 'error');
        }
      } else {
        logToConsole(`[Device A] Thinks B is remote. Routing to Default Gateway...`, 'success');
        await animatePacket(coords.devA, coords.swA, 'ReadProp');
        await animatePacket(coords.swA, coords.router, 'ReadProp');

        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          logToConsole(`[Router] Hairpin drop: router rejects forwarding packet back to same physical interface.`, 'error');
          logToConsole(`[Device B] Never received request.`, 'error');
        } else {
          logToConsole(`[Router] Routed packet: forwarding to Switch B...`, 'success');
          await animatePacket(coords.router, coords.swB, 'ReadProp');
          await animatePacket(coords.swB, coords.devB, 'ReadProp');

          logToConsole(`[Device B] Received request. Checking sender A IP...`, 'success');
          if (r.bThinksAInSubnet) {
            logToConsole(`[Device B] Thinks A is local. Replying directly via switch (will fail ARP).`, 'warning');
            await animatePacket(coords.devB, coords.swB, 'ACK', 'secondary');
            logToConsole(`[Switch B] ARP failed to locate A's MAC (different switch segment!). Packet lost.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Reply lost.`, 'error');
          } else {
            logToConsole(`[Device B] Thinks A is remote. Routing to Gateway...`, 'success');
            await animatePacket(coords.devB, coords.swB, 'ACK', 'secondary');
            await animatePacket(coords.swB, coords.router, 'ACK', 'secondary');
            await animatePacket(coords.router, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'ACK', 'secondary');
            logToConsole(`[Device A] Received ACK. Communication succeeded!`, 'success');
          }
        }
      }
    }
    else if (type === 'unicast-b-a') {
      logToConsole(`[Device B] Injecting BACnet Unicast ReadProperty frame`, 'info');
      logToConsole(`[Device B] Destination IP: ${dA.ip}`, 'info');

      if (r.bThinksAInSubnet) {
        logToConsole(`[Device B] Thinks A is local. Resolving A's MAC address via ARP.`, 'success');
        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          await animatePacket(coords.devB, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.devA, 'ReadProp');

          logToConsole(`[Device A] Received request. Replying.`, 'success');
          if (r.aThinksBInSubnet) {
            await animatePacket(coords.devA, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.devB, 'ACK', 'secondary');
            logToConsole(`[Device B] Received ACK. Success!`, 'success');
          } else {
            logToConsole(`[Device A] Thinks B is remote. Routing to Gateway...`, 'warning');
            await animatePacket(coords.devA, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.router, 'ACK', 'secondary');
            logToConsole(`[Router] Routed reply lost due to hairpin routing constraints.`, 'error');
            logToConsole(`[Device B] TIMEOUT.`, 'error');
          }
        } else {
          await animatePacket(coords.devB, coords.swB, 'ReadProp');
          logToConsole(`[Switch B] ARP failed to locate A's MAC (different physical segment!). Packet lost.`, 'error');
          logToConsole(`[Device A] Never received request.`, 'error');
        }
      } else {
        logToConsole(`[Device B] Thinks A is remote. Routing to Gateway...`, 'warning');

        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          await animatePacket(coords.devB, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.router, 'ReadProp');
          logToConsole(`[Router] Routed packet dropped. Router gateway has no return path on same subnet.`, 'error');
          logToConsole(`[Device A] Never received request.`, 'error');
        } else {
          await animatePacket(coords.devB, coords.swB, 'ReadProp');
          await animatePacket(coords.swB, coords.router, 'ReadProp');
          await animatePacket(coords.router, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.devA, 'ReadProp');

          logToConsole(`[Device A] Received request. Replying.`, 'success');
          if (r.aThinksBInSubnet) {
            logToConsole(`[Device A] Thinks B is local. Replying directly (will fail ARP).`, 'warning');
            await animatePacket(coords.devA, coords.swA, 'ACK', 'secondary');
            logToConsole(`[Switch A] ARP failed to locate B's MAC. Packet lost.`, 'error');
          } else {
            logToConsole(`[Device A] Thinks B is remote. Routing to Gateway...`, 'success');
            await animatePacket(coords.devA, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.router, 'ACK', 'secondary');
            await animatePacket(coords.router, coords.swB, 'ACK', 'secondary');
            await animatePacket(coords.swB, coords.devB, 'ACK', 'secondary');
            logToConsole(`[Device B] Received ACK. Success!`, 'success');
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    isAnimating.value = false;
  }
};
</script>
