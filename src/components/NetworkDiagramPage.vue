<template>
  <section class="diagram-page">
    <div class="diagram-page-heading">
      <div>
        <p class="eyebrow">COMMUNICATE THE CONDITION</p>
        <h2>Network Diagram Builder</h2>
        <p>Document BACnet/IP subnets, MS/TP trunks, ARCNET segments, field devices, and infrastructure. The diagram updates as you edit it.</p>
      </div>
      <div class="diagram-actions">
        <AppButton @click="fileInput?.click()">Open JSON</AppButton>
        <AppButton @click="saveJson">Save project</AppButton>
        <AppButton variant="primary" @click="saveSvg">Export SVG</AppButton>
        <AppButton :disabled="isExportingPdf" @click="savePdf">{{ isExportingPdf ? 'Building PDF…' : 'Export PDF' }}</AppButton>
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="openJson">
      </div>
    </div>

    <div class="diagram-workspace">
      <aside class="diagram-editor">
        <div class="glass-card diagram-settings-card">
          <div class="form-group">
            <label for="diagram-title">Diagram title</label>
            <input id="diagram-title" v-model="project.title" type="text" placeholder="Network condition or site name">
          </div>
          <div class="form-group compact-group">
            <label for="diagram-notes">Condition / troubleshooting notes</label>
            <textarea id="diagram-notes" v-model="project.notes" rows="3" placeholder="Describe symptoms, expected traffic, or the condition being illustrated."></textarea>
          </div>
          <span class="autosave-status">Saved automatically in this browser</span>
        </div>

        <div class="editor-section-heading">
          <div><span class="step-number">1</span><h3>Subnets & devices</h3></div>
          <button class="icon-text-button" type="button" @click="addSubnet">+ Add subnet</button>
        </div>

        <article v-for="(subnet, subnetIndex) in project.subnets" :key="subnet.id" class="glass-card subnet-editor-card" :style="{ '--subnet-color': subnet.color }">
          <div class="editor-card-header">
            <strong>{{ subnet.name || `Subnet ${subnetIndex + 1}` }}</strong>
            <button class="remove-button" type="button" title="Remove subnet" @click="removeSubnet(subnet.id)">Remove</button>
          </div>
          <div class="editor-grid two-columns">
            <div class="form-group"><label>Name</label><input v-model="subnet.name" type="text" placeholder="Controls LAN"></div>
            <div class="form-group"><label>Datalink type</label><select v-model="subnet.networkType"><option value="bacnet-ip">BACnet/IP</option><option value="mstp">BACnet MS/TP</option><option value="arcnet">BACnet ARCNET</option></select></div>
          </div>
          <div v-if="!subnet.networkType || subnet.networkType === 'bacnet-ip'" class="editor-grid two-columns">
            <div class="form-group"><label>VLAN (optional)</label><input v-model="subnet.vlan" type="text" placeholder="10"></div>
            <div class="form-group">
            <label>Network address & mask</label>
            <div class="input-row">
              <input v-model="subnet.address" type="text" placeholder="192.168.10.0" :class="{ 'input-invalid': !subnetIsValid(subnet) }">
              <select v-model.number="subnet.cidr" class="cidr-select">
                <option v-for="cidr in cidrOptions" :key="cidr" :value="cidr">/{{ cidr }}</option>
              </select>
            </div>
            </div>
          </div>
          <div v-else class="editor-grid two-columns">
            <div class="form-group"><label>BACnet network number</label><input v-model="subnet.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="2001"></div>
            <div v-if="subnet.networkType === 'mstp'" class="form-group"><label>Baud rate</label><select v-model.number="subnet.mstpBaudRate"><option v-for="baud in mstpBaudRates" :key="baud" :value="baud">{{ baud.toLocaleString() }} baud</option></select></div>
            <div v-else class="form-group"><label>Data rate</label><select v-model.number="subnet.arcnetDataRate"><option :value="156">156.25 kbps</option><option :value="2500">2.5 Mbps</option><option :value="5000">5 Mbps</option><option :value="10000">10 Mbps</option></select></div>
            <div v-if="subnet.networkType === 'mstp'" class="form-group"><label>Max Master</label><input v-model.number="subnet.mstpMaxMaster" type="number" min="0" max="127"></div>
          </div>

          <div class="device-list-header">
            <span>Devices ({{ subnet.devices.length }})</span>
            <button class="icon-text-button small" type="button" @click="addDevice(subnet)">+ Device</button>
          </div>
          <div v-if="!subnet.devices.length" class="empty-editor-state">No devices yet. Add the equipment involved in this condition.</div>
          <div v-for="device in subnet.devices" :key="device.id" class="device-editor-block">
            <div class="device-editor-row">
              <div class="device-fields">
                <input v-model="device.name" type="text" aria-label="Device name" placeholder="Device name">
                <select v-model="device.kind" aria-label="Device type">
                  <option v-for="option in deviceKindOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <span class="device-address-count">{{ device.nics.length }} NIC{{ device.nics.length === 1 ? '' : 's' }} · {{ addressCount(device) }} address{{ addressCount(device) === 1 ? '' : 'es' }}</span>
              </div>
              <button class="row-remove-button" type="button" title="Remove device" @click="removeDevice(subnet, device.id)">×</button>
            </div>
            <div class="interface-summary"><span>Network interfaces and assigned addresses</span><button type="button" @click="addDeviceNic(device, subnet.id)">+ Add NIC</button></div>
            <div v-for="(nic, nicIndex) in device.nics" :key="nic.id" class="nic-editor-card">
              <div class="nic-editor-heading">
                <input v-model="nic.name" type="text" aria-label="NIC name" placeholder="NIC name">
                <button type="button" @click="addNicAddress(nic, subnet.id)">+ Address</button>
                <button class="row-remove-button" type="button" :disabled="device.nics.length <= 1" title="Remove NIC" @click="removeDeviceNic(device, nic.id)">×</button>
              </div>
              <div v-for="(address, addressIndex) in nic.addresses" :key="address.id" class="interface-editor-row">
                <input v-model="address.label" type="text" aria-label="Address label" :placeholder="addressIndex === 0 && nicIndex === 0 ? 'Primary' : 'Address label'">
                <select v-model="address.subnetId" aria-label="Address subnet">
                  <option value="">Choose subnet</option>
                  <option v-for="optionSubnet in project.subnets" :key="optionSubnet.id" :value="optionSubnet.id">{{ optionSubnet.name }}</option>
                </select>
                <input v-model="address.ip" type="text" :aria-label="addressFieldLabel(address)" :placeholder="addressFieldLabel(address)" :class="addressEntryClass(address)">
                <button class="row-remove-button" type="button" :disabled="nic.addresses.length <= 1" title="Remove address" @click="removeNicAddress(nic, address.id)">×</button>
              </div>
            </div>
          </div>
        </article>

        <div class="editor-section-heading infrastructure-heading">
          <div><span class="step-number">2</span><h3>IT infrastructure</h3></div>
          <button class="icon-text-button" type="button" @click="addInfrastructure">+ Add infrastructure</button>
        </div>
        <div v-if="!project.infrastructure.length" class="glass-card empty-editor-state infrastructure-empty">Add routers, switches, firewalls, gateways, or BBMDs and connect them to the relevant subnets.</div>
        <article v-for="item in project.infrastructure" :key="item.id" class="glass-card infrastructure-editor-card">
          <div class="editor-card-header">
            <strong>{{ item.name || 'Unnamed infrastructure' }}</strong>
            <button class="remove-button" type="button" @click="removeInfrastructure(item.id)">Remove</button>
          </div>
          <div class="editor-grid two-columns">
            <div class="form-group"><label>Name</label><input v-model="item.name" type="text" placeholder="Core Router"></div>
            <div class="form-group"><label>Type</label><select v-model="item.kind"><option v-for="option in infrastructureKindOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></div>
          </div>
          <div class="form-group"><label>Management / interface IP (optional)</label><input v-model="item.ip" type="text" placeholder="10.0.0.1" :class="{ 'input-invalid': item.ip && !isIpValid(item.ip) }"></div>
          <div class="form-group compact-group">
            <label>Connected subnets</label>
            <div v-if="project.subnets.length" class="subnet-checkboxes">
              <label v-for="subnet in project.subnets" :key="subnet.id" class="checkbox-chip">
                <input v-model="item.subnetIds" type="checkbox" :value="subnet.id">
                <span :style="{ '--chip-color': subnet.color }">{{ subnet.name || 'Unnamed subnet' }}</span>
              </label>
            </div>
            <span v-else class="field-hint">Add a subnet before making connections.</span>
          </div>
          <div class="form-group compact-group"><label>Notes</label><input v-model="item.notes" type="text" placeholder="Interface, ACL, NAT, or routing detail"></div>
        </article>

        <div class="editor-section-heading paths-heading">
          <div><span class="step-number">3</span><h3>Connectivity tests</h3></div>
          <button class="icon-text-button" type="button" :disabled="endpointOptions.length < 2" @click="addPath">+ Add path</button>
        </div>
        <div v-if="!project.paths.length" class="glass-card empty-editor-state infrastructure-empty">Add a ping or service test, order its endpoints and intermediate hops, then mark the observed result.</div>
        <article v-for="path in project.paths" :key="path.id" class="glass-card path-editor-card" :class="path.outcome">
          <div class="editor-card-header">
            <strong>{{ path.name || 'Unnamed connectivity test' }}</strong>
            <button class="remove-button" type="button" @click="removePath(path.id)">Remove</button>
          </div>
          <div class="editor-grid path-settings-grid">
            <div class="form-group"><label>Test name</label><input v-model="path.name" type="text" placeholder="Gateway ping"></div>
            <div class="form-group"><label>Test type</label><select v-model="path.testType" @change="handleTestTypeChange(path)"><option value="ping">Ping (ICMP)</option><option value="bacnet-whois">BACnet Who-Is</option><option value="custom">Custom service</option></select></div>
            <div class="form-group"><label>Observed result</label><select v-model="path.outcome"><option value="success">Successful</option><option value="failure">Unsuccessful</option></select></div>
          </div>
          <div v-if="path.testType === 'custom'" class="form-group"><label>Protocol / service</label><input v-model="path.protocol" type="text" placeholder="BACnet ReadProperty, TCP 47808, etc."></div>
          <div v-if="path.testType === 'bacnet-whois'" class="form-group whois-broadcast-field">
            <label>Broadcast address used</label>
            <div class="input-row">
              <input v-model="path.broadcastAddress" type="text" placeholder="e.g. 172.28.131.255" :class="{ 'input-invalid': !isIpValid(path.broadcastAddress) }">
              <button type="button" class="use-broadcast-button" :disabled="!suggestedWhoIsBroadcast(path)" @click="useSuggestedBroadcast(path)">Use subnet broadcast</button>
            </div>
            <span class="field-hint">Record the actual limited or directed broadcast used for this Who-Is.</span>
          </div>
          <label>Ordered path</label>
          <div class="path-hop-list">
            <div v-for="(_, hopIndex) in path.hops" :key="`${path.id}-${hopIndex}`" class="path-hop-row">
              <span>{{ hopIndex === 0 ? 'FROM' : hopIndex === path.hops.length - 1 ? 'TO' : `VIA ${hopIndex}` }}</span>
              <select v-model="path.hops[hopIndex]" @change="hopIndex === 0 && syncWhoIsBroadcast(path)">
                <option value="">Choose endpoint</option>
                <option v-for="endpoint in endpointOptions" :key="endpoint.id" :value="endpoint.id">{{ endpoint.label }}</option>
              </select>
              <button class="row-remove-button" type="button" :disabled="path.hops.length <= 2" title="Remove hop" @click="removePathHop(path, hopIndex)">×</button>
            </div>
          </div>
          <button class="add-hop-button" type="button" @click="addPathHop(path)">+ Add intermediate hop</button>
          <div class="form-group compact-group path-notes"><label>Notes</label><input v-model="path.notes" type="text" placeholder="Timeout, ACL, expected route, or test context"></div>
        </article>
      </aside>

      <main class="diagram-preview-column">
        <div v-if="diagnostics.length" class="diagnostics-panel">
          <div v-for="diagnostic in diagnostics" :key="diagnostic.message" :class="['diagnostic-item', diagnostic.level]">
            <span>{{ diagnostic.level === 'error' ? '!' : '△' }}</span>{{ diagnostic.message }}
          </div>
        </div>
        <div class="diagram-preview-toolbar">
          <div><strong>Live preview</strong><span>{{ project.subnets.length }} subnets · {{ deviceCount }} devices · {{ project.infrastructure.length }} infrastructure · {{ project.paths.length }} tests</span></div>
          <button type="button" class="reset-button" @click="resetProject">Reset example</button>
        </div>
        <div class="diagram-scroll-frame">
          <svg ref="diagramSvg" class="network-diagram-svg" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`" :width="canvasWidth" :height="canvasHeight" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="project.title">
            <defs>
              <marker id="path-arrow-success" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#14ae5c" /></marker>
              <marker id="path-arrow-failure" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#df1219" /></marker>
            </defs>
            <rect class="export-bg" width="100%" height="100%" rx="14" />
            <text class="export-title" x="40" y="42">{{ clipped(project.title || 'Untitled network diagram', 70) }}</text>
            <text v-if="project.notes" class="export-notes" x="40" y="67">{{ clipped(project.notes, 130) }}</text>
            <text class="layer-label" x="24" y="102">INFRASTRUCTURE</text>
            <text class="layer-label" x="24" :y="subnetY - 10">NETWORK SEGMENTS</text>
            <text v-if="hostNodes.length" class="layer-label" x="24" :y="hostY - 10">HOSTS</text>

            <g v-for="(item, index) in project.infrastructure" :key="`preview-${item.id}`">
              <path v-for="subnetId in validConnections(item)" :key="`${item.id}-${subnetId}`" class="connection" :d="connectionPath(index, item.id, subnetId)" />
              <circle v-for="subnetId in validConnections(item)" :key="`dot-${item.id}-${subnetId}`" class="connection-dot" :cx="subnetCenter(subnetId)" :cy="subnetY" r="4" />
              <g :transform="`translate(${infrastructureX(index) - 75}, 82)`">
                <title>{{ item.name }}{{ item.ip ? ` — ${item.ip}` : '' }}</title>
                <rect class="infra-box" width="150" height="72" rx="10" />
                <text class="infra-type" x="12" y="18">{{ item.kind.toUpperCase() }}</text>
                <text class="infra-name" x="12" y="39">{{ clipped(item.name || 'Unnamed', 20) }}</text>
                <text v-if="item.ip" class="infra-ip" x="12" y="58">{{ item.ip }}</text>
              </g>
            </g>

            <g v-for="link in addressLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="address-link" :d="link.path" :stroke="link.color" />
              <circle class="address-endpoint" :cx="link.startX" :cy="link.startY" r="3.5" :fill="link.color" />
              <circle class="address-endpoint" :cx="link.endX" :cy="link.endY" r="3.5" :fill="link.color" />
            </g>

            <g v-for="(subnet, subnetIndex) in project.subnets" :key="`preview-${subnet.id}`" :transform="`translate(${subnetX(subnetIndex)}, ${subnetY})`">
              <title>{{ subnet.name }} — {{ subnetCidr(subnet) }}{{ subnet.vlan ? ` — VLAN ${subnet.vlan}` : '' }}</title>
              <rect class="subnet-box" :width="subnetWidth" :height="subnetHeight" rx="14" :stroke="subnet.color" />
              <rect :width="subnetWidth" height="7" rx="4" :fill="subnet.color" />
              <text class="node-category" x="16" y="25">{{ networkTypeLabel(subnet).toUpperCase() }}</text>
              <text class="subnet-name" x="16" y="47">{{ clipped(subnet.name || `Subnet ${subnetIndex + 1}`, 27) }}</text>
              <text class="subnet-address" x="16" y="69">{{ subnetCidr(subnet) }}</text>
              <text v-if="subnet.vlan" class="subnet-meta" :x="subnetWidth - 16" y="25" text-anchor="end">VLAN {{ clipped(subnet.vlan, 8) }}</text>
              <text class="subnet-meta" :x="subnetWidth - 16" y="69" text-anchor="end">{{ subnetAddressCount(subnet.id) }} address{{ subnetAddressCount(subnet.id) === 1 ? '' : 'es' }}</text>
            </g>

            <g v-for="(host, hostIndex) in hostNodes" :key="`host-${host.device.id}`" :transform="`translate(${hostX(hostIndex)}, ${hostY})`">
              <title>{{ deviceTooltip(host.device) }}</title>
              <rect class="host-box" :width="hostWidth" :height="hostHeight" rx="12" />
              <text class="node-category" x="16" y="21">HOST</text>
              <circle class="device-icon" cx="25" cy="45" r="13" />
              <text x="25" y="49" text-anchor="middle" font-size="12">{{ deviceSymbol(host.device.kind) }}</text>
              <text class="device-name" x="47" y="42">{{ clipped(host.device.name || 'Unnamed device', 25) }}</text>
              <text class="device-kind" x="47" y="58">{{ host.device.kind }}</text>
              <text class="host-address-summary" x="16" y="81">{{ clipped(hostAddressSummary(host.device), 35) }}</text>
              <rect class="host-count-badge" :x="hostWidth - 61" y="10" width="47" height="18" rx="9" />
              <text class="host-count-text" :x="hostWidth - 37.5" y="22" text-anchor="middle">{{ host.device.nics.length }} NIC / {{ addressCount(host.device) }} addr</text>
            </g>
            <g v-for="segment in pathSegments" :key="segment.id" class="test-path-group">
              <title>{{ segment.label }}</title>
              <path :class="['test-path', segment.outcome]" :d="segment.path" :marker-end="`url(#path-arrow-${segment.outcome})`" />
            </g>
            <g v-if="pathLegends.length">
              <text class="layer-label" x="40" :y="legendStart - 14">CONNECTIVITY TESTS</text>
              <g v-for="legend in pathLegends" :key="`legend-${legend.id}`" :transform="`translate(${legend.x}, ${legend.y})`">
                <rect :class="['path-legend-bg', legend.outcome]" :width="legendCardWidth" :height="legendCardHeight(legend)" rx="9" />
                <circle :class="['path-legend-dot', legend.outcome]" cx="16" cy="17" r="4" />
                <text class="path-legend-title" x="28" y="21">{{ clipped(`${legend.name} · ${legend.protocol}`, legendTextLimit - 10) }}</text>
                <rect :class="['path-result-badge', legend.outcome]" :x="legendCardWidth - 64" y="8" width="50" height="19" rx="9.5" />
                <text :class="['path-result-text', legend.outcome]" :x="legendCardWidth - 39" y="21" text-anchor="middle">{{ legend.outcome === 'success' ? 'PASS' : 'FAIL' }}</text>
                <g v-for="(row, rowIndex) in legend.rows" :key="`${legend.id}-${row.label}`">
                  <text class="path-route-label" x="16" :y="43 + rowIndex * 19">{{ row.label }}</text>
                  <text class="path-route-text" x="76" :y="43 + rowIndex * 19">{{ clipped(row.value, legendTextLimit - 3) }}</text>
                </g>
              </g>
            </g>
            <text class="footer-label" x="40" :y="canvasHeight - 22">Generated with Ace IoT BACnet Network Calculator</text>
          </svg>
        </div>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppButton from './AppButton.vue';
import { getSubnetDetails, ipToLong } from '../lib/subnet';
import {
  addressState, createDefaultProject, createDevice, createDeviceAddress, createInfrastructure, createNic, createSubnet,
  createTestPath, getDiagramDiagnostics, getWhoIsSuggestedBroadcast, isDiagramProject, normalizeDiagramProject, subnetCidr,
  type DeviceKind, type DiagramDevice, type DiagramDeviceAddress, type DiagramInfrastructure, type DiagramNic,
  type DiagramProject, type DiagramSubnet, type DiagramTestPath
} from '../lib/network-diagram';

const STORAGE_KEY = 'aceiot-network-diagram-v1';
const SVG_EXPORT_STYLES = `.export-bg{fill:#121212}.export-title{font:700 24px Montserrat,Arial,sans-serif;fill:#f8fafc}.export-notes{font:13px Inter,Arial,sans-serif;fill:#94a3b8}.layer-label{font:700 8px Inter,Arial,sans-serif;fill:#475569;letter-spacing:1.5px}.connection{fill:none;stroke:#64748b;stroke-width:2;stroke-linejoin:round}.connection-dot{fill:#94a3b8}.infra-box{fill:#1e293b;stroke:#94d8ff;stroke-width:2}.infra-type{font:700 10px Inter,Arial,sans-serif;fill:#94d8ff;letter-spacing:1px}.infra-name{font:600 13px Inter,Arial,sans-serif;fill:#f8fafc}.infra-ip{font:11px monospace;fill:#94a3b8}.subnet-box{fill:#171722;stroke-width:2}.subnet-name{font:700 15px Inter,Arial,sans-serif;fill:#f8fafc}.subnet-address{font:12px monospace;fill:#cbd5e1}.subnet-meta{font:11px Inter,Arial,sans-serif;fill:#94a3b8}.device-icon{fill:#334155}.device-name{font:600 12px Inter,Arial,sans-serif;fill:#f8fafc}.device-kind{font:9px Inter,Arial,sans-serif;fill:#94a3b8;text-transform:uppercase}.footer-label{font:10px Inter,Arial,sans-serif;fill:#64748b}.node-category{font:700 9px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:1.2px}.host-box{fill:#252536;stroke:#64748b;stroke-width:1.5}.host-address-summary{font:10px monospace;fill:#cbd5e1}.host-count-badge{fill:#0f3d39;stroke:#2dd4bf}.host-count-text{font:700 7px Inter,Arial,sans-serif;fill:#99f6e4}.address-link{fill:none;stroke-width:2}.address-endpoint{stroke:#121212;stroke-width:1}.test-path{fill:none;stroke-width:2.75;opacity:.78}.test-path.success{stroke:#14ae5c}.test-path.failure{stroke:#df1219;stroke-dasharray:8 6}.path-legend-bg{fill:#181820;stroke:#334155}.path-legend-bg.success{stroke:#14ae5c}.path-legend-bg.failure{stroke:#df1219}.path-legend-dot.success{fill:#14ae5c}.path-legend-dot.failure{fill:#df1219}.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}`;
const project = ref<DiagramProject>(createDefaultProject());
const fileInput = ref<HTMLInputElement | null>(null);
const diagramSvg = ref<SVGSVGElement | null>(null);
const isExportingPdf = ref(false);
const subnetWidth = 240;
const subnetHeight = 88;
const subnetY = 210;
const hostWidth = 240;
const hostHeight = 96;
const hostY = 390;
const cidrOptions = Array.from({ length: 25 }, (_, index) => index + 8);
const mstpBaudRates = [9600, 19200, 38400, 76800, 115200];
const deviceKindOptions: { value: DeviceKind; label: string }[] = [
  { value: 'controller', label: 'Controller' }, { value: 'workstation', label: 'Workstation' },
  { value: 'server', label: 'Server' }, { value: 'sensor', label: 'Sensor / field device' }, { value: 'other', label: 'Other' }
];
const infrastructureKindOptions = [
  { value: 'router', label: 'Router' }, { value: 'switch', label: 'Switch' }, { value: 'firewall', label: 'Firewall' },
  { value: 'bbmd', label: 'BBMD' }, { value: 'gateway', label: 'Gateway' }
];

const diagnostics = computed(() => getDiagramDiagnostics(project.value));
const deviceCount = computed(() => project.value.subnets.reduce((total, subnet) => total + subnet.devices.length, 0));
const hostNodes = computed(() => project.value.subnets.flatMap(ownerSubnet => ownerSubnet.devices.map(device => ({ device, ownerSubnet }))));
const endpointOptions = computed(() => [
  ...project.value.infrastructure.map(item => ({ id: item.id, nodeId: item.id, label: `${item.name || 'Unnamed infrastructure'} — ${item.ip || 'IP not set'} (${item.kind})` })),
  ...hostNodes.value.flatMap(host => host.device.nics.flatMap(nic => nic.addresses.map(address => {
    const subnet = project.value.subnets.find(item => item.id === address.subnetId);
    return {
      id: address.id,
      nodeId: host.device.id,
      label: `${host.device.name || 'Unnamed host'} — ${displayAddress(address)} — ${nic.name} / ${subnet?.name || 'No network'}`
    };
  })))
]);
const canvasWidth = computed(() => Math.max(
  960,
  80 + project.value.subnets.length * 275,
  80 + hostNodes.value.length * 275,
  80 + project.value.infrastructure.length * 190
));
const legendColumns = computed(() => canvasWidth.value >= 1250 ? 2 : 1);
const legendCardWidth = computed(() => (canvasWidth.value - 80 - (legendColumns.value - 1) * 20) / legendColumns.value);
const legendTextLimit = computed(() => Math.max(32, Math.floor((legendCardWidth.value - 90) / 6.3)));
const legendRows = computed(() => Math.ceil(project.value.paths.length / legendColumns.value));
const legendStart = computed(() => hostNodes.value.length ? hostY + hostHeight + 75 + project.value.paths.length * 18 : 330);
const canvasHeight = computed(() => Math.max(hostNodes.value.length ? 625 : 430, legendStart.value + legendRows.value * 124 + 42));

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (isDiagramProject(parsed)) project.value = normalizeDiagramProject(parsed);
  } catch { /* Ignore incomplete browser storage. */ }
});

watch(project, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true });

function addSubnet() { project.value.subnets.push(createSubnet(project.value.subnets.length + 1)); }
function removeSubnet(id: string) {
  const removedEndpointIds = project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
    device.nics.flatMap(nic => nic.addresses.filter(address => subnet.id === id || address.subnetId === id).map(address => address.id))
  ));
  project.value.subnets = project.value.subnets.filter(subnet => subnet.id !== id);
  project.value.infrastructure.forEach(item => { item.subnetIds = item.subnetIds.filter(subnetId => subnetId !== id); });
  project.value.subnets.forEach(subnet => subnet.devices.forEach(device => {
    device.nics.forEach(nic => { nic.addresses = nic.addresses.filter(address => address.subnetId !== id); });
    device.nics = device.nics.filter(nic => nic.addresses.length > 0);
    if (!device.nics.length) device.nics.push(createNic(subnet.id));
  }));
  removeEndpointsFromPaths(removedEndpointIds);
}
function addDevice(subnet: DiagramSubnet) { subnet.devices.push(createDevice(subnet.devices.length + 1, subnet.id)); }
function removeDevice(subnet: DiagramSubnet, id: string) {
  const device = subnet.devices.find(item => item.id === id);
  const removedEndpointIds = device ? allAddresses(device).map(address => address.id) : [];
  subnet.devices = subnet.devices.filter(device => device.id !== id);
  removeEndpointsFromPaths(removedEndpointIds);
}
function addDeviceNic(device: DiagramDevice, defaultSubnetId: string) { device.nics.push(createNic(defaultSubnetId, device.nics.length + 1)); }
function removeDeviceNic(device: DiagramDevice, id: string) {
  if (device.nics.length <= 1) return;
  const nic = device.nics.find(item => item.id === id);
  if (nic) removeEndpointsFromPaths(nic.addresses.map(address => address.id));
  device.nics = device.nics.filter(item => item.id !== id);
}
function addNicAddress(nic: DiagramNic, defaultSubnetId: string) {
  nic.addresses.push(createDeviceAddress(defaultSubnetId, `Address ${nic.addresses.length + 1}`));
}
function removeNicAddress(nic: DiagramNic, id: string) {
  if (nic.addresses.length <= 1) return;
  removeEndpointsFromPaths([id]);
  nic.addresses = nic.addresses.filter(address => address.id !== id);
}
function addInfrastructure() { project.value.infrastructure.push(createInfrastructure(project.value.infrastructure.length + 1)); }
function removeInfrastructure(id: string) {
  project.value.infrastructure = project.value.infrastructure.filter(item => item.id !== id);
  project.value.paths.forEach(path => { path.hops = path.hops.filter(endpointId => endpointId !== id); });
}
function addPath() {
  const first = endpointOptions.value[0];
  const second = endpointOptions.value.find(endpoint => endpoint.nodeId !== first?.nodeId);
  project.value.paths.push(createTestPath([first?.id, second?.id].filter((id): id is string => Boolean(id))));
}
function removePath(id: string) { project.value.paths = project.value.paths.filter(path => path.id !== id); }
function addPathHop(path: DiagramTestPath) { path.hops.splice(Math.max(1, path.hops.length - 1), 0, ''); }
function removePathHop(path: DiagramTestPath, index: number) { if (path.hops.length > 2) path.hops.splice(index, 1); }
function suggestedWhoIsBroadcast(path: DiagramTestPath) { return getWhoIsSuggestedBroadcast(project.value, path); }
function syncWhoIsBroadcast(path: DiagramTestPath) {
  if (path.testType !== 'bacnet-whois') return;
  const suggested = suggestedWhoIsBroadcast(path);
  if (suggested) path.broadcastAddress = suggested;
}
function useSuggestedBroadcast(path: DiagramTestPath) {
  const suggested = suggestedWhoIsBroadcast(path);
  if (suggested) path.broadcastAddress = suggested;
}
function handleTestTypeChange(path: DiagramTestPath) {
  if (path.testType === 'ping') {
    path.protocol = 'ICMP';
    path.broadcastAddress = '';
    if (!path.name || path.name === 'BACnet Who-Is') path.name = 'Ping test';
  } else if (path.testType === 'bacnet-whois') {
    path.protocol = 'BACnet/IP Who-Is';
    if (!path.name || path.name === 'Ping test') path.name = 'BACnet Who-Is';
    syncWhoIsBroadcast(path);
  }
}
function removeEndpointsFromPaths(endpointIds: string[]) {
  const removed = new Set(endpointIds);
  project.value.paths.forEach(path => { path.hops = path.hops.filter(endpointId => !removed.has(endpointId)); });
}
function resetProject() { if (window.confirm('Replace the current diagram with the starter example?')) project.value = createDefaultProject(); }
function subnetIsValid(subnet: DiagramSubnet) {
  if (subnet.networkType === 'mstp' || subnet.networkType === 'arcnet') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  return getSubnetDetails(subnet.address, subnet.cidr) !== null;
}
function isIpValid(ip: string) { return ipToLong(ip) !== null; }
function networkTypeLabel(subnet: DiagramSubnet) { return subnet.networkType === 'mstp' ? 'MS/TP' : subnet.networkType === 'arcnet' ? 'ARCNET' : 'BACnet/IP subnet'; }
function addressFieldLabel(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  return subnet?.networkType === 'mstp' ? 'MS/TP MAC (0–127)' : subnet?.networkType === 'arcnet' ? 'ARCNET node (0–255)' : 'IP address';
}
function displayAddress(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  if (!address.ip) return subnet?.networkType === 'mstp' ? 'MAC not set' : subnet?.networkType === 'arcnet' ? 'Node not set' : 'IP not set';
  return subnet?.networkType === 'mstp' ? `MAC ${address.ip}` : subnet?.networkType === 'arcnet' ? `Node ${address.ip}` : address.ip;
}
function addressEntryClass(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  const state = addressState(address, subnet);
  return { 'input-invalid': state === 'invalid', 'input-warning': state === 'outside' };
}
function allAddresses(device: DiagramDevice) { return device.nics.flatMap(nic => nic.addresses); }
function addressCount(device: DiagramDevice) { return allAddresses(device).length; }
function primaryAddress(device: DiagramDevice) { return device.nics[0]?.addresses[0]; }
function hostAddressSummary(device: DiagramDevice) {
  const address = primaryAddress(device);
  if (!address) return 'No addresses configured';
  const nicName = device.nics[0]?.name || 'NIC';
  return `${nicName}: ${displayAddress(address)}${addressCount(device) > 1 ? `  +${addressCount(device) - 1} more` : ''}`;
}
function subnetAddressCount(subnetId: string) {
  return hostNodes.value.reduce((total, host) => total + allAddresses(host.device).filter(address => address.subnetId === subnetId).length, 0);
}
function deviceTooltip(device: DiagramDevice) {
  const addresses = device.nics.flatMap(nic => nic.addresses.map(address => `${nic.name}: ${displayAddress(address)}`));
  return `${device.name} — ${device.kind}${addresses.length ? ` — ${addresses.join(' · ')}` : ''}`;
}
function clipped(value: string, length: number) { return value.length > length ? `${value.slice(0, length - 1)}…` : value; }
function deviceSymbol(kind: DeviceKind) { return kind === 'controller' ? 'C' : kind === 'workstation' ? 'W' : kind === 'server' ? 'S' : kind === 'sensor' ? '•' : '?'; }
function subnetX(index: number) { return canvasWidth.value * (index + 1) / (project.value.subnets.length + 1) - subnetWidth / 2; }
function subnetCenter(id: string) { const index = project.value.subnets.findIndex(subnet => subnet.id === id); return index < 0 ? 0 : subnetX(index) + subnetWidth / 2; }
function hostX(index: number) { return canvasWidth.value * (index + 1) / (hostNodes.value.length + 1) - hostWidth / 2; }
function infrastructureX(index: number) { return canvasWidth.value * (index + 1) / (project.value.infrastructure.length + 1); }
function validConnections(item: DiagramInfrastructure) { return item.subnetIds.filter(id => project.value.subnets.some(subnet => subnet.id === id)); }
function connectionPath(index: number, itemId: string, subnetId: string) {
  const item = project.value.infrastructure.find(candidate => candidate.id === itemId);
  if (!item) return '';
  const startX = infrastructureX(index);
  const endX = subnetCenter(subnetId);
  const laneY = 174 + index * 9;
  return `M ${startX} 154 L ${startX} ${laneY} L ${endX} ${laneY} L ${endX} ${subnetY}`;
}

interface DiagramPoint { x: number; y: number }
const addressLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => {
  const addressTotal = addressCount(host.device);
  let flatAddressIndex = 0;
  return host.device.nics.flatMap(nic => nic.addresses.flatMap(address => {
    const targetIndex = project.value.subnets.findIndex(candidate => candidate.id === address.subnetId);
    if (targetIndex < 0) return [];
    const offset = (flatAddressIndex++ - (addressTotal - 1) / 2) * 12;
    const start = { x: subnetX(targetIndex) + subnetWidth / 2 + offset, y: subnetY + subnetHeight };
    const end = { x: hostX(hostIndex) + hostWidth / 2 + offset, y: hostY };
    const midY = (start.y + end.y) / 2;
    return [{
      id: address.id,
      path: `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`,
      color: project.value.subnets[targetIndex].color,
      label: `${nic.name} · ${displayAddress(address)}`,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      labelX: (start.x + end.x) / 2,
      labelY: midY - 6
    }];
  }));
}));

function endpointPoint(endpointId: string): DiagramPoint | null {
  const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === endpointId);
  if (infrastructureIndex >= 0) return { x: infrastructureX(infrastructureIndex), y: 154 };
  const resolved = resolveAddressEndpoint(endpointId);
  if (resolved) {
    const addresses = allAddresses(resolved.host.device);
    const addressIndex = addresses.findIndex(address => address.id === endpointId);
    const offset = (addressIndex - (addresses.length - 1) / 2) * 12;
    return { x: hostX(resolved.hostIndex) + hostWidth / 2 + offset, y: hostY + hostHeight };
  }
  return null;
}

function resolveAddressEndpoint(endpointId: string) {
  for (let hostIndex = 0; hostIndex < hostNodes.value.length; hostIndex++) {
    const host = hostNodes.value[hostIndex];
    for (const nic of host.device.nics) {
      const address = nic.addresses.find(item => item.id === endpointId);
      if (address) return { host, hostIndex, nic, address };
    }
  }
  return null;
}

const pathSegments = computed(() => project.value.paths.flatMap((path, pathIndex) => path.hops.slice(0, -1).flatMap((endpointId, index) => {
  const start = endpointPoint(endpointId);
  const end = endpointPoint(path.hops[index + 1]);
  if (!start || !end) return [];
  const bothHosts = start.y > 300 && end.y > 300;
  const controlY = bothHosts ? hostY + hostHeight + 38 + pathIndex * 18 : (start.y + end.y) / 2 + pathIndex * 12;
  return [{
    id: `${path.id}-${index}`,
    outcome: path.outcome,
    path: `M ${start.x} ${start.y} C ${start.x} ${controlY}, ${end.x} ${controlY}, ${end.x} ${end.y}`,
    showLabel: index === 0,
    label: `${path.name} — ${path.protocol || 'Test'} ${path.outcome === 'success' ? 'passed' : 'failed'}`,
    labelX: (start.x + end.x) / 2,
    labelY: controlY
  }];
})));

function endpointName(id: string) {
  const infrastructure = project.value.infrastructure.find(item => item.id === id);
  if (infrastructure) return `${infrastructure.name || 'Unnamed infrastructure'} [${infrastructure.ip || 'IP not set'}]`;
  const resolved = resolveAddressEndpoint(id);
  return resolved ? `${resolved.host.device.name || 'Unnamed host'} [${displayAddress(resolved.address)}]` : 'Missing endpoint';
}

const pathLegends = computed(() => project.value.paths.map((path, index) => {
  const rows = [
    { label: 'FROM', value: endpointName(path.hops[0] ?? '') },
    ...(path.hops.length > 2 ? [{ label: 'VIA', value: path.hops.slice(1, -1).map(endpointName).join(' → ') }] : []),
    { label: 'TO', value: endpointName(path.hops[path.hops.length - 1] ?? '') },
    ...(path.testType === 'bacnet-whois' ? [{ label: 'BROADCAST', value: path.broadcastAddress || 'Not specified' }] : [])
  ];
  return {
    id: path.id,
    outcome: path.outcome,
    name: path.name || 'Connectivity test',
    protocol: path.protocol || 'Test',
    rows,
    x: 40 + (index % legendColumns.value) * (legendCardWidth.value + 20),
    y: legendStart.value + Math.floor(index / legendColumns.value) * 124
  };
}));

function legendCardHeight(legend: { rows: unknown[] }) { return 37 + legend.rows.length * 19; }

function download(content: BlobPart, type: string, extension: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = (project.value.title || 'network-diagram').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  link.href = url;
  link.download = `${filename || 'network-diagram'}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}
function saveJson() { download(JSON.stringify(project.value, null, 2), 'application/json', 'json'); }
function diagramFilename() {
  return (project.value.title || 'network-diagram').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'network-diagram';
}
function serializedDiagramSvg() {
  if (!diagramSvg.value) return;
  const clone = diagramSvg.value.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(canvasWidth.value));
  clone.setAttribute('height', String(canvasHeight.value));
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = SVG_EXPORT_STYLES;
  clone.prepend(style);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}
function saveSvg() {
  const svg = serializedDiagramSvg();
  if (svg) download(svg, 'image/svg+xml', 'svg');
}
async function savePdf() {
  const svg = serializedDiagramSvg();
  if (!svg || isExportingPdf.value) return;
  isExportingPdf.value = true;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to render diagram SVG'));
      image.src = svgUrl;
    });
    const renderScale = Math.min(2, 8192 / Math.max(canvasWidth.value, canvasHeight.value));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(canvasWidth.value * renderScale));
    canvas.height = Math.max(1, Math.round(canvasHeight.value * renderScale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PDF canvas is unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const { jsPDF } = await import('jspdf');
    const padding = 24;
    const pointScale = Math.min(0.75, (14_400 - padding * 2) / Math.max(canvasWidth.value, canvasHeight.value));
    const drawingWidth = canvasWidth.value * pointScale;
    const drawingHeight = canvasHeight.value * pointScale;
    const pageWidth = drawingWidth + padding * 2;
    const pageHeight = drawingHeight + padding * 2;
    const pdf = new jsPDF({
      orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pageWidth, pageHeight],
      compress: true,
      putOnlyUsedFonts: true
    });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', padding, padding, drawingWidth, drawingHeight, undefined, 'FAST');
    pdf.save(`${diagramFilename()}.pdf`);
  } catch (error) {
    console.error(error);
    window.alert('The PDF could not be generated. Please try exporting the SVG instead.');
  } finally {
    URL.revokeObjectURL(svgUrl);
    isExportingPdf.value = false;
  }
}
async function openJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const parsed: unknown = JSON.parse(await file.text());
    if (!isDiagramProject(parsed)) throw new Error('Unsupported diagram file');
    project.value = normalizeDiagramProject(parsed);
  } catch {
    window.alert('That file is not a valid Ace IoT network diagram project.');
  } finally {
    input.value = '';
  }
}
</script>

<style>
.export-bg{fill:#121212}.export-title{font:700 24px Montserrat,Arial,sans-serif;fill:#f8fafc}.export-notes{font:13px Inter,Arial,sans-serif;fill:#94a3b8}.layer-label{font:700 8px Inter,Arial,sans-serif;fill:#475569;letter-spacing:1.5px}.connection{fill:none;stroke:#64748b;stroke-width:2.5}.connection-dot{fill:#94a3b8}.infra-box{fill:#1e293b;stroke:#94d8ff;stroke-width:2}.infra-type{font:700 10px Inter,Arial,sans-serif;fill:#94d8ff;letter-spacing:1px}.infra-name{font:600 13px Inter,Arial,sans-serif;fill:#f8fafc}.infra-ip{font:11px monospace;fill:#94a3b8}.subnet-box{fill:#171722;stroke-width:2}.subnet-name{font:700 15px Inter,Arial,sans-serif;fill:#f8fafc}.subnet-address{font:12px monospace;fill:#cbd5e1}.subnet-meta{font:11px Inter,Arial,sans-serif;fill:#94a3b8}.device-icon{fill:#334155}.device-name{font:600 12px Inter,Arial,sans-serif;fill:#f8fafc}.device-kind{font:9px Inter,Arial,sans-serif;fill:#94a3b8;text-transform:uppercase}.footer-label{font:10px Inter,Arial,sans-serif;fill:#64748b}.node-category{font:700 9px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:1.2px}.host-box{fill:#252536;stroke:#64748b;stroke-width:1.5}.host-address-summary{font:10px monospace;fill:#cbd5e1}.host-count-badge{fill:#0f3d39;stroke:#2dd4bf}.host-count-text{font:700 7px Inter,Arial,sans-serif;fill:#99f6e4}.address-link{fill:none;stroke-width:2.5}.address-endpoint{stroke:#121212;stroke-width:1}.address-link-label{font:9px monospace;fill:#cbd5e1;paint-order:stroke;stroke:#121212;stroke-width:4px;stroke-linejoin:round}.test-path{fill:none;stroke-width:4;opacity:.9}.test-path.success{stroke:#14ae5c}.test-path.failure{stroke:#df1219;stroke-dasharray:9 6}.test-path-label-bg.success{fill:#0d3823;stroke:#14ae5c}.test-path-label-bg.failure{fill:#3d1719;stroke:#df1219}.test-path-label{font:700 9px Inter,Arial,sans-serif}.test-path-label.success{fill:#86efac}.test-path-label.failure{fill:#fca5a5}
.connection{stroke-width:2;stroke-linejoin:round}.address-link{stroke-width:2}.test-path{stroke-width:2.75;opacity:.78}.test-path.failure{stroke-dasharray:8 6}.path-legend-bg{fill:#181820;stroke:#334155}.path-legend-bg.success{stroke:#14ae5c}.path-legend-bg.failure{stroke:#df1219}.path-legend-dot.success{fill:#14ae5c}.path-legend-dot.failure{fill:#df1219}.path-legend-text{font:600 9px Inter,Arial,sans-serif;fill:#cbd5e1}
.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}
</style>
