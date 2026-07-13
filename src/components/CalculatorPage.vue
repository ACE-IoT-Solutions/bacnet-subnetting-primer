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
        </select>
      </div>

      <!-- Device A Inputs -->
      <div style="margin-bottom: 2rem; border-left: 3px solid var(--primary); padding-left: 0.75rem;">
        <h3 style="font-family: var(--font-heading); font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--primary);">Device A (Source)</h3>
        <div class="form-group">
          <label>IP Address</label>
          <input type="text" v-model="devAIp" :style="{ borderColor: isIpValid(devAIp) ? '' : 'var(--error)' }" placeholder="e.g. 192.168.0.5">
        </div>
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
      <div style="border-left: 3px solid var(--secondary); padding-left: 0.75rem;">
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
      </div>

      <!-- BBMD Infrastructure Configuration Panel -->
      <div v-if="isRouted" style="border-top: 1px solid var(--border-color); margin-top: 1.5rem; padding-top: 1.5rem;">
        <h3 style="font-family: var(--font-heading); font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
          BBMD Configuration
        </h3>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.35;">BBMD is required to relay discoveries (Who-Is) between separate subnets. Configure their parameters below.</p>

        <!-- BBMD A Config -->
        <div style="margin-bottom: 1.25rem; padding-left: 0.5rem; border-left: 2px solid var(--primary);">
          <label style="font-size: 0.8rem; color: var(--primary); font-weight: 600; display: block; margin-bottom: 0.25rem;">Subnet A BBMD IP</label>
          <input type="text" v-model="bbmdAIp" placeholder="e.g. 192.168.0.99" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; margin-bottom: 0.5rem; width: 100%;">

          <label style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem; font-weight: 500;">BBMD A BDT Table</label>
          <div style="display: flex; flex-direction: column; gap: 0.3rem;">
            <input v-for="(_, idx) in bdtEntriesA" :key="'a-' + idx" type="text" v-model="bdtEntriesA[idx]" placeholder="Slot IP" style="padding: 0.3rem 0.4rem; font-size: 0.8rem; width: 100%;">
          </div>
        </div>

        <!-- BBMD B Config -->
        <div style="padding-left: 0.5rem; border-left: 2px solid var(--secondary);">
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
            <text x="320" y="224" font-family="Inter" font-size="11" fill="#cbd5e1" text-anchor="middle">
              {{ isRouted ? 'Switch A' : 'Switch' }}
            </text>
          </g>

          <!-- Switch B -->
          <g v-show="isRouted" class="node-group" id="sim-node-swB">
            <rect x="450" y="200" width="60" height="40" rx="6" fill="#1e293b" stroke="#475569" stroke-width="2"></rect>
            <text x="480" y="224" font-family="Inter" font-size="11" fill="#cbd5e1" text-anchor="middle">Switch B</text>
          </g>

          <!-- IP Router -->
          <g v-show="isRouterVisible" class="node-group" id="sim-node-router">
            <circle cx="400" cy="100" r="24" fill="#1a2238" stroke="#475569" stroke-width="2"></circle>
            <text x="400" y="104" font-family="Inter" font-size="10" fill="#94a3b8" text-anchor="middle">Router</text>
          </g>

          <!-- Device A Node -->
          <g class="node-group" id="sim-node-devA">
            <rect x="40" y="120" width="120" height="65" rx="8"></rect>
            <text x="100" y="142" class="node-label">Device A</text>
            <text x="100" y="158" class="node-ip">{{ devAIp }}</text>
            <text x="100" y="172" font-family="Inter" font-size="9" fill="#64748b" text-anchor="middle">/{{ devACidr }}</text>
          </g>

          <!-- Device B Node -->
          <g class="node-group" id="sim-node-devB">
            <rect x="640" y="120" width="120" height="65" rx="8"></rect>
            <text x="700" y="142" class="node-label">Device B</text>
            <text x="700" y="158" class="node-ip">{{ devBIp }}</text>
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
          <label class="sim-checkbox-label" style="margin-bottom: 0.5rem; flex: 1 1 100%; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
            <input type="checkbox" v-model="bcastIam">
            Send I-Am replies as Broadcasts (standard BACnet behavior)
          </label>

          <label v-if="isRouted" class="sim-checkbox-label" style="margin-bottom: 0.5rem; flex: 1 1 100%; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer;">
            <input type="checkbox" v-model="bbmdEnabled">
            Enable BBMD Over Tunnel
          </label>

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
  'direct-trap': { ipA: '192.168.0.5', cidrA: 23, ipB: '192.168.1.6', cidrB: 24 },
  'same-subnet': { ipA: '192.168.1.50', cidrA: 24, ipB: '192.168.1.60', cidrB: 24 },
  'isolated-subnets': { ipA: '192.168.1.50', cidrA: 24, ipB: '192.168.2.60', cidrB: 24 },
  'overlapping-asym': { ipA: '192.168.0.50', cidrA: 23, ipB: '192.168.1.60', cidrB: 24 }
};

const selectedPreset = ref<keyof typeof presets>('direct-trap');

// Device A Inputs
const devAIp = ref('192.168.0.5');
const devAMask = ref('255.255.254.0');
const devACidr = ref(23);

// Device B Inputs
const devBIp = ref('192.168.1.6');
const devBMask = ref('255.255.255.0');
const devBCidr = ref(24);

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

  if (r.sameSubnet) {
    return {
      class: 'verdict-success',
      title: 'Subnets Match: Direct BACnet/IP Enabled',
      icon: `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`,
      body: `Both Device A and Device B belong to the exact same subnet (${dA.network}/${dA.cidr}). Unicast and broadcast BACnet services will work natively without BBMD routing infrastructure.`
    };
  } else if (r.broadcastIntersectionTrap) {
    return {
      class: 'verdict-error',
      title: 'Broadcast Intersection Trap Detected!',
      icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      body: `<strong>Asymmetrical communication failure!</strong> Devices A and B share the identical broadcast address (<code>${dA.broadcast}</code>) but belong to separate logical subnets: Device A is <code>/${dA.cidr}</code>, Device B is <code>/${dB.cidr}</code>. <br><br>Because they share a physical segment, local BACnet broadcasts (Who-Is) will reach both nodes. Device A sees Device B's IP as local and replies directly. However, Device B sees Device A as remote and attempts to reply through its router gateway. Direct unicast communication will fail unless asymmetric routes are specially configured.`
    };
  } else if (r.asymmetricalSubnet) {
    const localThinker = r.aThinksBInSubnet ? 'Device A' : 'Device B';
    const remoteThinker = r.aThinksBInSubnet ? 'Device B' : 'Device A';
    return {
      class: 'verdict-warning',
      title: 'Asymmetrical Overlapping Subnets',
      icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      body: `One-way local communication trap! <strong>${localThinker}</strong> thinks the other is local, but <strong>${remoteThinker}</strong> thinks the other is remote. This is caused by unequal subnet mask definitions. ${localThinker} will send direct ARP and Layer 2 frames, while ${remoteThinker} will send replies to its gateway, creating broken connections.`
    };
  } else if (r.overlappingSubnet) {
    return {
      class: 'verdict-warning',
      title: 'Symmetrical Subnet Overlap: Broadcast Mismatch',
      icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`,
      body: `<strong>Symmetrical subnet overlap detected!</strong> Both Device A and Device B believe the other is local because their IP addresses fall within each other's usable ranges. <br><br>Direct unicast communication (such as ReadProperty) will work because both sides will send replies locally over Layer 2. However, because they have different subnet masks (<code>/${dA.cidr}</code> vs <code>/${dB.cidr}</code>), they calculate different broadcast IPs (<code>${dA.broadcast}</code> vs <code>${dB.broadcast}</code>). Consequently, their IP stacks will drop each other's local BACnet discoveries (Who-Is), preventing automatic device binding.`
    };
  } else {
    return {
      class: 'verdict-warning',
      title: 'Isolated Subnets: BBMD Infrastructure Required',
      icon: `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`,
      body: `Device A (${dA.network}/${dA.cidr}) and Device B (${dB.network}/${dB.cidr}) are in completely separate subnets. Routers will block their local BACnet discoveries. To resolve, configure BBMDs on both subnets or register Device B as a Foreign Device (FDR).`
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
      logToConsole(`[Device A] Sending Who-Is (Broadcast) on port 47808`, 'info');
      logToConsole(`[Device A] Target Broadcast address: ${dA.broadcast}`, 'info');

      await animatePacket(coords.devA, coords.swA, 'Who-Is (BC)');
      logToConsole(`[Switch A] Broadcast received. Flooding packet out all ports.`, 'success');

      if (r.sameSubnet) {
        await animatePacket(coords.swA, coords.devB, 'Who-Is (BC)');

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

        logToConsole(`[Router] Received broadcast. Dropped (IP Routers block UDP broadcasts).`, 'error');
        logToConsole(`[Device B] Received Who-Is. Believes sender A (${dA.ip}) is remote.`, 'warning');
        logToConsole(`[Device B] Generating I-Am reply. Target is remote: routing to Gateway...`, 'warning');

        await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
        await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
        logToConsole(`[Router] Received routed reply from B for remote IP ${dA.ip}.`, 'error');
        logToConsole(`[Router] DROP: Device A (${dA.ip}) is on the same physical link. Router will not loop packet back. Packet lost!`, 'error');
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
            logToConsole(`[Router] Routed packet dropped due to asymmetrical hairpin interface rules.`, 'error');
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

        logToConsole(`[Device B] Received broadcast frame on port 47808.`, 'warning');
        logToConsole(`[Device B] DROP: Packet Broadcast IP (${dA.broadcast}) does not match B's broadcast IP (${dB.broadcast}).`, 'error');
        logToConsole(`[Device B] No response generated (broadcast mismatch).`, 'error');
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
          logToConsole(`[BBMD A] Intercepted local Who-Is broadcast. Wrapping into BVLL unicast tunnel to BBMD B (${bbmdBIp.value})...`, 'success');
          await animatePacket(coords.bbmd1, coords.swA, 'BVLL (UC)');
          await animatePacket(coords.swA, coords.router, 'BVLL (UC)');
          await animatePacket(coords.router, coords.swB, 'BVLL (UC)');
          await animatePacket(coords.swB, coords.bbmd2, 'BVLL (UC)');

          const longB = ipToLong(bbmdBIp.value);
          const bdtB = bdtEntriesB.value.map(ipToLong).filter((val): val is number => val !== null);
          const selfALong = ipToLong(bbmdAIp.value);

          if (longB === null || selfALong === null || !bdtB.includes(selfALong)) {
            logToConsole(`[BBMD B] DROP: Received BVLL tunnel packet but sender BBMD A (${bbmdAIp.value}) is not in BBMD B's BDT table. Registration mismatch!`, 'error');
            logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
            return;
          }

          logToConsole(`[BBMD B] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
          logToConsole(`[BBMD B] Broadcasting Who-Is locally on Subnet B...`, 'success');
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

            logToConsole(`[BBMD B] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD A (${bbmdAIp.value})...`, 'success');
            await animatePacket(coords.bbmd2, coords.swB, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swB, coords.router, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.router, coords.swA, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swA, coords.bbmd1, 'BVLL (UC)', 'secondary');

            const longA = ipToLong(bbmdAIp.value);
            const bdtA = bdtEntriesA.value.map(ipToLong).filter((val): val is number => val !== null);
            const selfBLong = ipToLong(bbmdBIp.value);

            if (longA === null || selfBLong === null || !bdtA.includes(selfBLong)) {
              logToConsole(`[Subnet A] Received tunnel packet but destination BBMD A is inactive/unregistered. Dropped.`, 'error');
              logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
              return;
            }

            logToConsole(`[BBMD A] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
            logToConsole(`[BBMD A] Broadcasting I-Am locally on Subnet A...`, 'success');
            await animatePacket(coords.bbmd1, coords.swA, 'I-Am (BC)', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
            logToConsole(`[Device A] Received I-Am broadcast reply. Discovery successful via two-way BBMD Tunnel!`, 'success');
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
      logToConsole(`[Device B] Sending Who-Is (Broadcast) on port 47808`, 'info');
      logToConsole(`[Device B] Target Broadcast address: ${dB.broadcast}`, 'info');

      if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
        await animatePacket(coords.devB, coords.swA, 'Who-Is (BC)');
        logToConsole(`[Switch A] Broadcast received. Forwarding to all ports.`, 'success');

        await Promise.all([
          animatePacket(coords.swA, coords.devA, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped broadcast.`, 'error');

        if (r.overlappingSubnet) {
          logToConsole(`[Device A] Received broadcast frame on port 47808.`, 'warning');
          logToConsole(`[Device A] DROP: Packet Broadcast IP (${dB.broadcast}) does not match A's broadcast IP (${dA.broadcast}).`, 'error');
          logToConsole(`[Device A] No response generated (broadcast mismatch).`, 'error');
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
          logToConsole(`[BBMD B] Intercepted broadcast. Wrapping into BVLL unicast tunnel to BBMD A (${bbmdAIp.value})...`, 'success');
          await animatePacket(coords.bbmd2, coords.swB, 'BVLL (UC)');
          await animatePacket(coords.swB, coords.router, 'BVLL (UC)');
          await animatePacket(coords.router, coords.swA, 'BVLL (UC)');
          await animatePacket(coords.swA, coords.bbmd1, 'BVLL (UC)');

          const longA = ipToLong(bbmdAIp.value);
          const bdtA = bdtEntriesA.value.map(ipToLong).filter((val): val is number => val !== null);
          const selfBLong = ipToLong(bbmdBIp.value);

          if (longA === null || selfBLong === null || !bdtA.includes(selfBLong)) {
            logToConsole(`[BBMD A] DROP: Received BVLL tunnel packet but sender BBMD B (${bbmdBIp.value}) is not in BBMD A's BDT table.`, 'error');
            logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
            return;
          }

          logToConsole(`[BBMD A] Unicast tunnel packet received. Extracting Who-Is broadcast.`, 'success');
          logToConsole(`[BBMD A] Broadcasting Who-Is locally on Subnet A...`, 'success');
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

            logToConsole(`[BBMD A] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD B (${bbmdBIp.value})...`, 'success');
            await animatePacket(coords.bbmd1, coords.swA, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swA, coords.router, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.router, coords.swB, 'BVLL (UC)', 'secondary');
            await animatePacket(coords.swB, coords.bbmd2, 'BVLL (UC)', 'secondary');

            const longB = ipToLong(bbmdBIp.value);
            const bdtB = bdtEntriesB.value.map(ipToLong).filter((val): val is number => val !== null);
            const selfALong = ipToLong(bbmdAIp.value);

            if (longB === null || selfALong === null || !bdtB.includes(selfALong)) {
              logToConsole(`[Subnet B] Received tunnel packet but destination BBMD B is inactive/unregistered. Dropped.`, 'error');
              logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
              return;
            }

            logToConsole(`[BBMD B] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
            logToConsole(`[BBMD B] Broadcasting I-Am locally on Subnet B...`, 'success');
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
