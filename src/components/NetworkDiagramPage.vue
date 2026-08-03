<template>
  <section class="diagram-page">
    <div class="diagram-page-heading">
      <div>
        <p class="eyebrow">COMMUNICATE THE CONDITION</p>
        <h2>Network Diagram Builder</h2>
        <p>Document <GlossaryLink term="bacnet-ip">BACnet/IP</GlossaryLink> <GlossaryLink term="subnet">subnets</GlossaryLink>,
          <GlossaryLink term="mstp">MS/TP</GlossaryLink> trunks, <GlossaryLink term="arcnet">ARCNET</GlossaryLink> segments, field devices,
          and infrastructure. The diagram updates as you edit it.</p>
      </div>
      <div class="diagram-actions">
        <AppButton @click="openNmapImportDialog">Import Nmap</AppButton>
        <AppButton @click="fileInput?.click()">Open JSON</AppButton>
        <AppButton @click="saveJson">Save project</AppButton>
        <AppButton variant="primary" @click="saveSvg">Export SVG</AppButton>
        <AppButton :disabled="isExportingPdf" @click="openPdfExportDialog">{{ isExportingPdf ? 'Building PDF…' : 'Export PDF' }}</AppButton>
        <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" @change="openJson">
      </div>
    </div>

    <div v-if="nmapImportNotice" class="diagram-import-notice" role="status">
      <span>{{ nmapImportNotice }}</span>
      <button type="button" aria-label="Dismiss import result" @click="nmapImportNotice = ''">×</button>
    </div>

    <div class="diagram-workspace">
      <aside class="diagram-editor">
        <div class="glass-card diagram-settings-card">
          <div class="form-group">
            <label for="diagram-title">Diagram title</label>
            <input id="diagram-title" v-model="project.title" type="text" placeholder="Network condition or site name">
          </div>
          <div class="form-group">
            <label for="diagram-scope">Diagram scope</label>
            <select id="diagram-scope" v-model="project.viewMode"><option value="detailed">Detailed — all devices</option><option value="networks">Network topology — infrastructure &amp; key hosts</option></select>
          </div>
          <AceToggle v-model="advancedBacnetPorts" label="Advanced BACnet/IP ports" description="Configure multiple B/IP networks on one IP subnet" />
          <div class="form-group compact-group">
            <label for="diagram-notes">Condition / troubleshooting notes</label>
            <textarea id="diagram-notes" v-model="project.notes" rows="3" placeholder="Describe symptoms, expected traffic, or the condition being illustrated."></textarea>
          </div>
          <span class="autosave-status">Saved automatically in this browser</span>
        </div>

        <div class="editor-section-heading">
          <div><span class="step-number">1</span><h3>Networks, overlays & devices</h3></div>
          <button class="icon-text-button" type="button" @click="addSubnet">+ Add network</button>
        </div>

        <article v-for="(subnet, subnetIndex) in project.subnets" :key="subnet.id" class="glass-card subnet-editor-card" :style="{ '--subnet-color': subnet.color }">
          <div class="editor-card-header">
            <strong>{{ subnet.name || `Subnet ${subnetIndex + 1}` }}</strong>
            <button class="remove-button" type="button" title="Remove subnet" @click="removeSubnet(subnet.id)">Remove</button>
          </div>
          <div class="editor-grid two-columns">
            <div class="form-group"><label>Name</label><input v-model="subnet.name" type="text" placeholder="Controls LAN"></div>
            <div class="form-group"><label>Datalink type</label><select v-model="subnet.networkType"><option value="bacnet-ip">IP subnet</option><option value="mstp">BACnet MS/TP</option><option value="arcnet">BACnet ARCNET</option></select></div>
          </div>
          <div v-if="!subnet.networkType || subnet.networkType === 'bacnet-ip'" class="editor-grid network-address-grid">
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
            <div v-if="advancedBacnetPorts" class="form-group"><label>BACnet UDP port</label><input v-model.number="subnet.udpPort" type="number" min="1" max="65535" placeholder="47808"></div>
            <div v-if="advancedBacnetPorts" class="form-group"><label>BACnet network number</label><input v-model="subnet.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="1001"></div>
          </div>
          <div v-else-if="subnet.networkType === 'bacnet-sc'" class="editor-grid two-columns">
            <div class="form-group"><label>BACnet network number</label><input v-model="subnet.bacnetNetworkNumber" type="number" min="1" max="65534" placeholder="3001"></div>
            <AceToggle :model-value="Boolean(subnet.scDirectConnections)" label="Model direct node connections" description="Optional unicast path; hub connectivity remains the baseline" @update:model-value="subnet.scDirectConnections = $event" />
            <span class="field-hint" style="grid-column:1/-1">BACnet/SC uses secure WebSockets over IPv4 or IPv6. A valid BACnet path requires both working IP transport to the selected hub and continuous SC hub/direct connections between nodes.</span>
          </div>
          <div v-else class="editor-grid two-columns">
            <div class="form-group"><label>Upstream routed network</label><select v-model="subnet.upstreamSubnetId"><option value="">Choose upstream network</option><option v-for="upstream in upstreamNetworkOptions(subnet)" :key="upstream.id" :value="upstream.id">{{ upstream.name }} — {{ subnetCidr(upstream) }}</option></select></div>
            <div class="form-group"><label>Routing device on upstream</label><select v-model="subnet.routerId"><option value="">Choose connected device</option><option v-for="router in routingDevicesFor(subnet)" :key="router.id" :value="router.id">{{ router.name }} — {{ router.ip || 'Address not set' }}</option></select></div>
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
            <AceToggle :model-value="Boolean(device.requiredForRouting)" label="BACnet router / bridge between datalinks" description="Route between services or networks assigned to this device's NICs" @update:model-value="device.requiredForRouting = $event" />
            <AceToggle :model-value="Boolean(device.bbmdEnabled)" label="Hosts a BBMD service" description="Show this host as a combined device and BACnet Broadcast Management Device" @update:model-value="device.bbmdEnabled = $event" />
            <div class="interface-summary"><span>Network interfaces and assigned addresses</span><button type="button" @click="addDeviceNic(device, subnet.id)">+ Add NIC</button></div>
            <div v-for="(nic, nicIndex) in device.nics" :key="nic.id" class="nic-editor-card">
              <div class="nic-editor-heading">
                <input v-model="nic.name" type="text" aria-label="NIC name" placeholder="NIC name">
                <button type="button" @click="addNicAddress(nic, subnet.id)">+ Address</button>
                <button class="row-remove-button" type="button" :disabled="device.nics.length <= 1" title="Remove NIC" @click="removeDeviceNic(device, nic.id)">×</button>
              </div>
              <div class="device-service-selection"><AceCheckbox :model-value="Boolean(nic.bacnetIpEnabled)" label="BACnet/IP" @update:model-value="nic.bacnetIpEnabled = $event" /><AceCheckbox :model-value="Boolean(nic.bacnetScEnabled)" label="BACnet/SC" @update:model-value="nic.bacnetScEnabled = $event" /></div>
              <div v-if="nic.bacnetScEnabled" class="form-group compact-group sc-hub-assignment"><label>SC role</label><select v-model="nic.scHubRole"><option value="node">Node</option><option value="hub">Hub</option><option value="ha-hub">HA hub</option></select><template v-if="nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub'"><label>Hub WebSocket URI</label><input v-model="nic.scHubUri" type="text" placeholder="wss://device-hub.example.com"><template v-if="nic.scHubRole === 'ha-hub'"><label>Failover hub URI</label><input v-model="nic.scFailoverHubUri" type="text" placeholder="wss://device-hub-failover.example.com"></template></template><label>{{ nic.scHubRole === 'node' ? 'Hub assignment' : 'Upstream federating hub (optional)' }}</label><select v-model="nic.scHubId"><option value="">{{ nic.scHubRole === 'node' ? 'Choose hub' : 'No upstream — root hub' }}</option><option v-for="hub in scHubsForNic(nic)" :key="hub.id" :value="hub.id">{{ hub.name }} — {{ hub.label }}</option></select><AceToggle :model-value="Boolean(nic.scHubL3Reachable)" label="L3/TLS path verified" @update:model-value="nic.scHubL3Reachable = $event" /></div>
              <div v-for="(address, addressIndex) in nic.addresses" :key="address.id" class="interface-editor-row">
                <input v-model="address.label" type="text" aria-label="Address label" :placeholder="addressIndex === 0 && nicIndex === 0 ? 'Primary' : 'Address label'">
                <select v-model="address.subnetId" aria-label="Address network">
                  <option value="">Choose network</option>
                  <option v-for="optionSubnet in compatibleAddressNetworks(subnet)" :key="optionSubnet.id" :value="optionSubnet.id">{{ optionSubnet.name }}</option>
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
        <div v-if="!project.infrastructure.length" class="glass-card empty-editor-state infrastructure-empty">Add routers, switches, firewalls, gateways, BBMDs, or BACnet/SC hubs and connect them to the relevant networks.</div>
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
          <template v-if="item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster'">
            <div class="form-group"><label>Primary hub WebSocket URI</label><input v-model="item.uri" type="text" placeholder="wss://sc-hub.example.com"></div>
            <div v-if="item.kind === 'sc-hub-cluster'" class="editor-grid two-columns"><div class="form-group"><label>Failover hub IP</label><input v-model="item.failoverIp" type="text" placeholder="10.0.1.10"></div><div class="form-group"><label>Failover hub WebSocket URI</label><input v-model="item.failoverUri" type="text" placeholder="wss://sc-failover.example.com"></div></div>
            <div class="form-group compact-group"><label>Connected physical IP networks</label><div class="subnet-checkboxes"><label v-for="subnet in ipSubnets" :key="subnet.id" class="checkbox-chip"><input v-model="item.subnetIds" type="checkbox" :value="subnet.id"><span :style="{ '--chip-color': subnet.color }">{{ subnet.name }}</span></label></div></div>
            <div class="form-group compact-group"><label>Connections to other SC hubs</label><div class="subnet-checkboxes"><label v-for="peer in otherScHubs(item.id)" :key="peer.id" class="checkbox-chip"><input v-model="item.peerInfrastructureIds" type="checkbox" :value="peer.id"><span>{{ peer.name }}</span></label></div></div>
          </template>
          <div v-else class="form-group compact-group">
            <label>Connected BACnet/IP subnets</label>
            <div v-if="project.subnets.length" class="subnet-checkboxes">
              <label v-for="subnet in ipSubnets" :key="subnet.id" class="checkbox-chip">
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
              <input v-if="advancedBacnetPorts" v-model.number="path.udpPort" class="whois-port-input" type="number" min="1" max="65535" aria-label="Who-Is destination UDP port" placeholder="47808">
              <button type="button" class="use-broadcast-button" :disabled="!suggestedWhoIsBroadcast(path)" @click="useSuggestedBroadcast(path)">Use subnet broadcast</button>
            </div>
            <span class="field-hint">Record the actual limited or directed broadcast and UDP destination port used for this Who-Is.</span>
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
              <symbol id="ace-icon-network" viewBox="0 0 24 24"><path d="M17 3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4v2h1a1 1 0 0 1 1 1h7v2h-7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1H2v-2h7a1 1 0 0 1 1-1h1v-2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10Z" /></symbol>
              <symbol id="ace-icon-subnet" viewBox="0 0 24 24"><path d="M23.25 12.75v-1.5h-10.5V9h2.625A1.125 1.125 0 0 0 16.5 7.875v-6A1.125 1.125 0 0 0 15.375.75h-6.75A1.125 1.125 0 0 0 7.5 1.875v6A1.125 1.125 0 0 0 8.625 9h2.625v2.25H.75v1.5H4.5V15H1.94a1.125 1.125 0 0 0-1.125 1.125v6A1.125 1.125 0 0 0 1.94 23.25h6.685A1.125 1.125 0 0 0 9.75 22.125v-6A1.125 1.125 0 0 0 8.625 15H6v-2.25h12V15h-2.625a1.125 1.125 0 0 0-1.125 1.125v6a1.125 1.125 0 0 0 1.125 1.125h6.75a1.125 1.125 0 0 0 1.125-1.125v-6A1.125 1.125 0 0 0 22.125 15H19.5v-2.25h3.75ZM9 2.25h6V7.5H9Zm-.75 19.5H2.315V16.5H8.25Zm13.5 0h-6V16.5h6Z" /></symbol>
              <symbol id="ace-icon-device" viewBox="0 0 24 24"><path d="M13 18h1a1 1 0 0 1 1 1h7v2h-7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1H2v-2h7a1 1 0 0 1 1-1h1v-2H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3v2Zm0-12h1V4h-1v2ZM9 4v2h2V4H9Zm0 4v2h2V8H9Zm0 4v2h2v-2H9Z" /></symbol>
              <symbol id="ace-icon-router" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-7v3h2l-3 3-3-3h2v-3H5v2l-3-3 3-3v2h6V8H9l3-3 3 3h-2v3h6V9l3 3-3 3v-2h-6Z" /></symbol>
            </defs>
            <rect class="export-bg" width="100%" height="100%" rx="14" />
            <text class="export-title" x="40" y="42">{{ clipped(project.title || 'Untitled network diagram', 70) }}</text>
            <text v-if="project.notes" class="export-notes" x="40" y="67">{{ clipped(project.notes, 130) }}</text>
            <text class="layer-label" x="24" y="102">INFRASTRUCTURE</text>
            <text class="layer-label" x="24" :y="subnetY - 10">ROUTED BACNET DATALINKS</text>
            <text v-if="ipHostNodes.length" class="layer-label" x="24" :y="ipHostY - 10">IP DEVICES &amp; ROUTERS</text>
            <text v-if="fieldSegments.length" class="layer-label" x="24" :y="fieldBusY - 10">ROUTED FIELD BUSES</text>
            <text v-if="fieldHostNodes.length" class="layer-label" x="24" :y="fieldHostY - 10">FIELD DEVICES</text>

            <g v-for="(item, index) in project.infrastructure" :key="`preview-${item.id}`">
              <g v-for="subnetId in validConnections(item)" :key="`${item.id}-${subnetId}`">
                <title>{{ infrastructureConnectionLabel(item, subnetId) }}</title>
                <path :class="['connection', connectionKindClass(item)]" :d="connectionPath(index, item.id, subnetId)" />
                <circle :class="['connection-dot', `${connectionKindClass(item)}-dot`]" :cx="connectionTargetX(item.id, subnetId)" :cy="subnetY" r="4" />
              </g>
              <g :transform="`translate(${infrastructureX(index) - 75}, 82)`">
                <title>{{ item.name }}{{ item.ip ? ` — ${item.ip}` : '' }}</title>
                <rect class="infra-box" width="150" height="72" rx="10" />
              <text class="infra-type" x="12" y="18">{{ item.kind.toUpperCase() }}</text>
                <use :href="item.kind === 'router' || item.kind === 'gateway' ? '#ace-icon-router' : '#ace-icon-network'" class="ace-node-icon infra-node-icon" x="116" y="12" width="22" height="22" />
                <text class="infra-name" x="12" y="39">{{ clipped(item.name || 'Unnamed', 20) }}</text>
                <text v-if="item.ip" class="infra-ip" x="12" y="58">{{ item.ip }}</text>
              </g>
            </g>

            <g v-for="segment in fieldSegments" :key="`route-${segment.id}`">
              <path v-if="segment.upstreamSubnetId" class="connection field-bus-route" :d="fieldBusRoutePath(segment)" />
              <text v-if="segment.routerId" class="address-link-label" :x="networkCenter(segment.id)" :y="fieldBusY - 18" text-anchor="middle">via {{ clipped(routerName(segment.routerId), 28) }}</text>
            </g>

            <g v-for="link in addressLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="address-link" :d="link.path" :stroke="link.color" />
              <circle class="address-endpoint" :cx="link.startX" :cy="link.startY" r="3.5" :fill="link.color" />
              <circle class="address-endpoint" :cx="link.endX" :cy="link.endY" r="3.5" :fill="link.color" />
            </g>
            <g v-for="link in scLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="sc-service-link" :d="link.path" />
              <circle class="sc-service-endpoint" :cx="link.startX" :cy="link.startY" r="3.5" />
              <circle class="sc-service-endpoint" :cx="link.endX" :cy="link.endY" r="3.5" />
            </g>

            <g v-for="(subnet, subnetIndex) in project.subnets" :key="`preview-${subnet.id}`" :transform="`translate(${networkX(subnet)}, ${networkY(subnet)})`">
              <title>{{ subnet.name }} — {{ subnetCidr(subnet) }}{{ subnet.vlan ? ` — VLAN ${subnet.vlan}` : '' }}</title>
              <rect class="subnet-box" :width="subnetWidth" :height="subnetHeight" rx="14" :stroke="subnet.color" />
              <path class="subnet-accent" :d="roundedTopAccentPath(subnetWidth)" :style="{ '--subnet-accent-color': subnet.color }" />
              <use :href="(!subnet.networkType || subnet.networkType === 'bacnet-ip') ? '#ace-icon-subnet' : '#ace-icon-network'" class="ace-node-icon" x="15" y="17" width="22" height="22" :style="{ color: subnet.color }" />
              <text class="node-category" x="44" y="25">{{ networkDiagramLabel(subnet) }}</text>
              <text class="subnet-name" x="16" y="52">{{ clipped(subnet.name || `Subnet ${subnetIndex + 1}`, 27) }}</text>
              <text class="subnet-address" x="16" y="72">{{ subnetCidr(subnet) }}</text>
              <text v-if="subnet.vlan" class="subnet-meta" :x="subnetWidth - 16" y="25" text-anchor="end">VLAN {{ clipped(subnet.vlan, 8) }}</text>
              <text class="subnet-meta subnet-footer-meta" x="16" y="92">{{ subnetMetaLabel(subnet) }}</text>
            </g>

            <g v-for="(host, hostIndex) in hostNodes" :key="`host-${host.device.id}`" :transform="`translate(${hostX(host, hostIndex)}, ${hostYFor(host)})`">
              <title>{{ deviceTooltip(host.device) }}</title>
              <rect class="host-box" :width="hostWidth" :height="hostHeight" rx="12" />
              <text class="node-category" x="16" y="21">{{ deviceServiceLabel(host.device) }}</text>
              <circle class="device-icon" cx="25" cy="45" r="15" />
              <use :href="host.device.requiredForRouting ? '#ace-icon-router' : '#ace-icon-device'" class="ace-node-icon host-node-icon" x="15" y="35" width="20" height="20" />
              <text class="device-name" x="47" y="42">{{ clipped(host.device.name || 'Unnamed device', 25) }}</text>
              <text class="device-kind" x="47" y="58">{{ host.device.kind }}</text>
              <g v-for="(row, addressIndex) in hostAddressRows(host.device)" :key="row.id">
                <circle :cx="18" :cy="77 + addressIndex * 30" r="3" :fill="row.color" />
                <text class="host-address-label" x="28" :y="80 + addressIndex * 30">{{ clipped(row.label, 38) }}</text>
                <text class="host-address-summary" x="28" :y="93 + addressIndex * 30">{{ row.address || 'Address not set' }}</text>
              </g>
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
            <text class="footer-label export-footer" x="40" :y="canvasHeight - 22">Made with https://ace-iot-solutions.github.io/bacnet-subnetting-primer/</text>
          </svg>
        </div>
      </main>
    </div>

    <dialog ref="nmapImportDialog" class="nmap-import-dialog" aria-labelledby="nmap-import-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">DISCOVERED NETWORK INVENTORY</p>
          <h3 id="nmap-import-title">Import Nmap scan output</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close Nmap import" @click="nmapImportDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">
        Paste the text containing <code>Nmap scan report for…</code> and <code>Host is up…</code> lines. Host discovery does not prove that a device speaks BACnet, so imported devices begin as IP-only inventory.
      </p>

      <label class="nmap-import-output">
        <span>Nmap output</span>
        <textarea
          v-model="nmapOutput"
          rows="11"
          spellcheck="false"
          placeholder="Nmap scan report for _gateway (10.115.12.1)&#10;Host is up (0.0015s latency).&#10;Nmap scan report for 10.115.12.6&#10;Host is up (0.00077s latency)."
        ></textarea>
      </label>

      <div class="nmap-import-options">
        <label>
          <span>Network prefix</span>
          <select v-model.number="nmapCidr">
            <option v-for="cidr in cidrOptions" :key="`nmap-${cidr}`" :value="cidr">/{{ cidr }}</option>
          </select>
        </label>
        <p>Nmap does not report the subnet mask. The selected prefix groups addresses into diagram networks; change it to match the scanned LAN.</p>
      </div>

      <div class="nmap-import-preview" aria-live="polite">
        <template v-if="nmapHosts.length">
          <div class="nmap-import-summary">
            <span><strong>{{ nmapHosts.length }}</strong> responsive {{ nmapHosts.length === 1 ? 'address' : 'addresses' }}</span>
            <span><strong>{{ nmapGroups.length }}</strong> {{ nmapGroups.length === 1 ? 'subnet' : 'subnets' }}</span>
            <span><strong>{{ nmapNodeCount }}</strong> diagram {{ nmapNodeCount === 1 ? 'node' : 'nodes' }}</span>
          </div>
          <p v-if="nmapDuplicateCount" class="nmap-import-duplicates">
            {{ nmapDuplicateCount }} {{ nmapDuplicateCount === 1 ? 'address already exists' : 'addresses already exist' }} in this project and will be skipped.
          </p>
          <div class="nmap-import-hosts">
            <div v-for="host in nmapHosts" :key="host.ip">
              <span class="nmap-import-host-status" aria-hidden="true"></span>
              <span><strong>{{ nmapHostName(host) }}</strong><small>{{ host.ip }}<template v-if="host.latencySeconds !== undefined"> · {{ formatNmapLatency(host.latencySeconds) }}</template></small></span>
              <em v-if="isNmapGatewayHost(host)">Gateway</em>
              <em v-else-if="existingDiagramIps.has(host.ip)">Existing</em>
            </div>
          </div>
        </template>
        <p v-else class="nmap-import-empty">
          No responsive IPv4 hosts found yet. Paste standard Nmap text output to preview the import.
        </p>
      </div>

      <div class="pdf-export-dialog-actions">
        <AppButton @click="nmapImportDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" :disabled="nmapNewHostCount === 0" @click="importNmapHosts">
          Import {{ nmapNewHostCount || '' }} {{ nmapNewHostCount === 1 ? 'host' : 'hosts' }}
        </AppButton>
      </div>
    </dialog>

    <dialog ref="pdfExportDialog" class="pdf-export-dialog" aria-labelledby="pdf-export-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">PDF EXPORT</p>
          <h3 id="pdf-export-title">Choose an appearance</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close PDF export options" @click="pdfExportDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">Use the screen-ready dark version, or a high-contrast light version designed to conserve ink when printed.</p>
      <fieldset class="pdf-theme-options">
        <legend class="visually-hidden">PDF appearance</legend>
        <label :class="['pdf-theme-option', { selected: pdfTheme === 'light' }]">
          <input v-model="pdfTheme" type="radio" value="light">
          <span class="pdf-theme-swatch light" aria-hidden="true"></span>
          <span><strong>Light / print</strong><small>White background and print-optimized contrast</small></span>
        </label>
        <label :class="['pdf-theme-option', { selected: pdfTheme === 'dark' }]">
          <input v-model="pdfTheme" type="radio" value="dark">
          <span class="pdf-theme-swatch dark" aria-hidden="true"></span>
          <span><strong>Dark</strong><small>Matches the diagram builder preview</small></span>
        </label>
      </fieldset>
      <div class="pdf-export-dialog-actions">
        <AppButton @click="pdfExportDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" @click="confirmPdfExport">Export PDF</AppButton>
      </div>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import AppButton from './AppButton.vue';
import AceToggle from './AceToggle.vue';
import AceCheckbox from './AceCheckbox.vue';
import GlossaryLink from './GlossaryLink.vue';
import { getSubnetDetails, ipToLong } from '../lib/subnet';
import {
  groupNmapHostsBySubnet, isNmapGatewayHost, nmapHostName, parseNmapOutput, type NmapHost, type NmapSubnetGroup
} from '../lib/nmap-import';
import {
  addressState, createDefaultProject, createDevice, createDeviceAddress, createInfrastructure, createNic, createSubnet,
  createTestPath, getDiagramDiagnostics, getWhoIsSuggestedBroadcast, isDiagramProject, normalizeDiagramProject, subnetCidr,
  type DeviceKind, type DiagramDevice, type DiagramDeviceAddress, type DiagramInfrastructure, type DiagramNic,
  type DiagramProject, type DiagramSubnet, type DiagramTestPath
} from '../lib/network-diagram';

const STORAGE_KEY = 'aceiot-network-diagram-v1';
const advancedBacnetPorts = inject<Ref<boolean>>('advancedBacnetPorts', ref(false));
const TOOL_URL = 'https://ace-iot-solutions.github.io/bacnet-subnetting-primer/';
const SVG_SC_LINK_STYLES = `.sc-service-link{fill:none;stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:8 6;opacity:.9}.sc-service-endpoint{fill:#2dd4bf;stroke:#121212;stroke-width:1}`;
const SVG_CONNECTION_STYLES = `.connection--routing{stroke:#64748b;stroke-width:2.5}.connection--bbmd{stroke:#94d8ff;stroke-width:2.75;stroke-dasharray:9 6}.connection--sc{stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:2 6}.connection--local{stroke:#a78bfa;stroke-width:2}.connection--routing-dot{fill:#64748b}.connection--bbmd-dot{fill:#94d8ff}.connection--sc-dot{fill:#2dd4bf}.connection--local-dot{fill:#a78bfa}`;
const SVG_EXPORT_STYLES = `.export-bg{fill:#121212}.export-title{font:700 24px Montserrat,Arial,sans-serif;fill:#f8fafc}.export-notes{font:13px Inter,Arial,sans-serif;fill:#94a3b8}.layer-label{font:700 8px Inter,Arial,sans-serif;fill:#475569;letter-spacing:1.5px}.connection{fill:none;stroke:#64748b;stroke-width:2;stroke-linejoin:round}.connection-dot{fill:#94a3b8}.infra-box{fill:#1e293b;stroke:#94d8ff;stroke-width:2}.infra-type{font:700 10px Inter,Arial,sans-serif;fill:#94d8ff;letter-spacing:1px}.infra-name{font:600 13px Inter,Arial,sans-serif;fill:#f8fafc}.infra-ip{font:11px monospace;fill:#94a3b8}.subnet-box{fill:#171722;stroke-width:2}.subnet-accent{fill:none;stroke-width:6;stroke-linecap:butt}.subnet-name{font:700 15px Inter,Arial,sans-serif;fill:#f8fafc}.subnet-address{font:12px monospace;fill:#cbd5e1}.subnet-meta{font:11px Inter,Arial,sans-serif;fill:#94a3b8}.device-icon{fill:#334155}.device-name{font:600 12px Inter,Arial,sans-serif;fill:#f8fafc}.device-kind{font:9px Inter,Arial,sans-serif;fill:#94a3b8;text-transform:uppercase}.footer-label{font:10px Inter,Arial,sans-serif;fill:#64748b}.node-category{font:700 9px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:1.2px}.host-box{fill:#252536;stroke:#64748b;stroke-width:1.5}.host-address-label{font:700 8px Inter,Arial,sans-serif;fill:#94a3b8}.host-address-summary{font:10px monospace;fill:#cbd5e1}.host-count-badge{fill:#0f3d39;stroke:#2dd4bf}.host-count-text{font:700 7px Inter,Arial,sans-serif;fill:#99f6e4}.address-link{fill:none;stroke-width:2}.address-endpoint{stroke:#121212;stroke-width:1}.test-path{fill:none;stroke-width:2.75;opacity:.78}.test-path.success{stroke:#14ae5c}.test-path.failure{stroke:#df1219;stroke-dasharray:8 6}.path-legend-bg{fill:#181820;stroke:#334155}.path-legend-bg.success{stroke:#14ae5c}.path-legend-bg.failure{stroke:#df1219}.path-legend-dot.success{fill:#14ae5c}.path-legend-dot.failure{fill:#df1219}.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}`;
const PDF_LIGHT_STYLES = `.export-bg{fill:#fff}.export-title,.infra-name,.subnet-name,.device-name,.path-legend-title{fill:#0f172a}.export-notes,.infra-ip,.subnet-meta,.device-kind,.host-address-label,.layer-label,.node-category,.path-route-label,.footer-label{fill:#475569}.connection{stroke:#64748b;stroke-width:2.25}.connection-dot{fill:#475569}.infra-box{fill:#fff;stroke:#0369a1;stroke-width:2.25}.infra-type{fill:#075985}.subnet-box{fill:#fff;stroke-width:2.25}.subnet-address,.host-address-summary,.path-route-text{fill:#0f172a}.host-box{fill:#fff;stroke:#64748b;stroke-width:1.75}.device-icon{fill:#e2e8f0;stroke:#cbd5e1}.ace-node-icon{fill:#0f766e}.address-endpoint{stroke:#fff}.path-legend-bg{fill:#fff;stroke:#64748b}.path-result-badge.success{fill:#dcfce7}.path-result-badge.failure{fill:#fee2e2}.path-result-text.success{fill:#166534}.path-result-text.failure{fill:#991b1b}.layer-label{font-size:9px;fill:#475569}.node-category{font-size:9.5px;fill:#475569}.infra-type{font-size:10.5px}.infra-name{font-size:13.5px}.infra-ip{font-size:11.5px}.subnet-name{font-size:15.5px}.subnet-address,.subnet-meta{font-size:11.5px}.device-name{font-size:13px}.device-kind{font-size:9.5px}.host-address-label{font-size:9px}.host-address-summary{font-size:11px}.host-count-text{font-size:7.5px}.path-route-label{font-size:9px}.path-route-text{font-size:10.5px}.footer-label{font-size:10.5px;fill:#334155}.ace-wordmark{fill:#0f172a}.solutions-wordmark{fill:#475569}`;
const SUBNET_ACCENT_EXPORT_STYLES = `.subnet-accent{fill:var(--subnet-accent-color);stroke:none}`;
const project = ref<DiagramProject>(createDefaultProject());
const fileInput = ref<HTMLInputElement | null>(null);
const diagramSvg = ref<SVGSVGElement | null>(null);
const nmapImportDialog = ref<HTMLDialogElement | null>(null);
const nmapOutput = ref('');
const nmapCidr = ref(24);
const nmapImportNotice = ref('');
const pdfExportDialog = ref<HTMLDialogElement | null>(null);
const isExportingPdf = ref(false);
const pdfTheme = ref<'dark' | 'light'>('light');
const subnetWidth = 240;
const subnetHeight = 104;
const subnetY = 210;
const ipHostY = 350;
const hostWidth = 280;
const hostGap = 12;
const cidrOptions = Array.from({ length: 25 }, (_, index) => index + 8);
const mstpBaudRates = [9600, 19200, 38400, 76800, 115200];
const deviceKindOptions: { value: DeviceKind; label: string }[] = [
  { value: 'controller', label: 'Controller' }, { value: 'workstation', label: 'Workstation' },
  { value: 'server', label: 'Server' }, { value: 'sensor', label: 'Sensor / field device' }, { value: 'other', label: 'Other' }
];
const infrastructureKindOptions = [
  { value: 'router', label: 'Router' }, { value: 'switch', label: 'Switch' }, { value: 'firewall', label: 'Firewall' },
  { value: 'bbmd', label: 'BBMD' }, { value: 'gateway', label: 'Gateway' },
  { value: 'sc-hub', label: 'BACnet/SC Hub' }, { value: 'sc-hub-cluster', label: 'BACnet/SC HA Hub Cluster' }
];
interface HostNode { device: DiagramDevice; ownerSubnet: DiagramSubnet }

const diagnostics = computed(() => getDiagramDiagnostics(project.value));
const deviceCount = computed(() => project.value.subnets.reduce((total, subnet) => total + subnet.devices.length, 0));
const nmapHosts = computed(() => parseNmapOutput(nmapOutput.value));
const nmapGroups = computed(() => groupNmapHostsBySubnet(nmapHosts.value, nmapCidr.value));
const existingDiagramIps = computed(() => new Set([
  ...project.value.infrastructure.map(item => item.ip).filter(Boolean),
  ...project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
    device.nics.flatMap(nic => nic.addresses.map(address => address.ip).filter(Boolean))
  ))
]));
const nmapDuplicateCount = computed(() => nmapHosts.value.filter(host => existingDiagramIps.value.has(host.ip)).length);
const nmapNewHostCount = computed(() => nmapHosts.value.length - nmapDuplicateCount.value);
const nmapNodeCount = computed(() => new Set(nmapHosts.value.map(host => {
  if (isNmapGatewayHost(host)) return `gateway:${host.ip}`;
  return host.hostname ? `host:${host.hostname.toLocaleLowerCase()}` : `host:${host.ip}`;
})).size);
const ipSubnets = computed(() => project.value.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip'));
const routedNetworks = computed(() => project.value.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip' || subnet.networkType === 'bacnet-sc'));
const fieldSegments = computed(() => project.value.subnets.filter(subnet => subnet.networkType === 'mstp' || subnet.networkType === 'arcnet'));
const hostNodes = computed(() => project.value.subnets.flatMap(ownerSubnet => ownerSubnet.devices
  .filter(device => project.value.viewMode !== 'networks' || device.requiredForRouting || device.kind === 'server' || device.bbmdEnabled || project.value.subnets.some(segment => segment.routerId === device.id))
  .map(device => ({ device, ownerSubnet }))));
const hostHeight = computed(() => Math.max(110, 80 + Math.max(1, ...hostNodes.value.map(host => addressCount(host.device))) * 30));
const fieldBusY = computed(() => ipHostY + hostHeight.value + 70);
const fieldHostY = computed(() => fieldBusY.value + subnetHeight + 60);
const ipHostNodes = computed(() => hostNodes.value.filter(host => !host.ownerSubnet.networkType || host.ownerSubnet.networkType === 'bacnet-ip' || host.ownerSubnet.networkType === 'bacnet-sc'));
const fieldHostNodes = computed(() => hostNodes.value.filter(host => host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet'));
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
  80 + Math.max(ipHostNodes.value.length, fieldHostNodes.value.length) * (hostWidth + hostGap),
  80 + project.value.infrastructure.length * 190
));
const legendColumns = computed(() => canvasWidth.value >= 1250 ? 2 : 1);
const legendCardWidth = computed(() => (canvasWidth.value - 80 - (legendColumns.value - 1) * 20) / legendColumns.value);
const legendTextLimit = computed(() => Math.max(32, Math.floor((legendCardWidth.value - 90) / 6.3)));
const legendRows = computed(() => Math.ceil(project.value.paths.length / legendColumns.value));
const legendStart = computed(() => fieldHostNodes.value.length ? fieldHostY.value + hostHeight.value + 75 + project.value.paths.length * 18 : ipHostNodes.value.length ? ipHostY + hostHeight.value + 75 + project.value.paths.length * 18 : 330);
const canvasHeight = computed(() => Math.max(hostNodes.value.length ? 625 : 430, legendStart.value + legendRows.value * 124 + 42));

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (isDiagramProject(parsed)) project.value = normalizeDiagramProject(parsed);
  } catch { /* Ignore incomplete browser storage. */ }
  window.addEventListener('ace-open-planned-diagram', loadPlannedDiagram);
});
onUnmounted(() => window.removeEventListener('ace-open-planned-diagram', loadPlannedDiagram));

function loadPlannedDiagram() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (isDiagramProject(parsed)) project.value = normalizeDiagramProject(parsed);
  } catch { /* Ignore invalid bridge data. */ }
}

watch(project, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true });

function addSubnet() { project.value.subnets.push(createSubnet(project.value.subnets.length + 1)); }
function openNmapImportDialog() {
  nmapImportNotice.value = '';
  nmapImportDialog.value?.showModal();
}
function matchingNmapSubnet(group: NmapSubnetGroup) {
  return project.value.subnets.find(subnet => {
    if (normalizedNetworkType(subnet) !== 'bacnet-ip' || subnet.cidr !== group.cidr) return false;
    return getSubnetDetails(subnet.address, subnet.cidr)?.network === group.network;
  });
}
function importNmapHosts() {
  const duplicateCount = nmapDuplicateCount.value;
  const freshHosts = nmapHosts.value.filter(host => !existingDiagramIps.value.has(host.ip));
  if (!freshHosts.length) return;

  const groups = groupNmapHostsBySubnet(freshHosts, nmapCidr.value);
  const subnetByHostIp = new Map<string, DiagramSubnet>();
  let createdSubnetCount = 0;

  groups.forEach(group => {
    let subnet = matchingNmapSubnet(group);
    if (!subnet) {
      subnet = createSubnet(project.value.subnets.length + 1);
      subnet.name = `Discovered ${group.network}/${group.cidr}`;
      subnet.address = group.network;
      subnet.cidr = group.cidr;
      subnet.vlan = '';
      subnet.udpPort = '';
      subnet.bacnetNetworkNumber = '';
      project.value.subnets.push(subnet);
      createdSubnetCount += 1;
    }
    group.hosts.forEach(host => subnetByHostIp.set(host.ip, subnet!));
  });

  const importedDevices = new Map<string, { device: DiagramDevice; hosts: NmapHost[] }>();
  let gatewayCount = 0;

  freshHosts.forEach(host => {
    const subnet = subnetByHostIp.get(host.ip);
    if (!subnet) return;

    if (isNmapGatewayHost(host)) {
      const gateway = createInfrastructure(project.value.infrastructure.length + 1);
      gateway.name = host.hostname.replace(/^_+/, '') || `Gateway ${host.ip}`;
      gateway.kind = 'gateway';
      gateway.ip = host.ip;
      gateway.subnetIds = [subnet.id];
      gateway.notes = `Imported from Nmap host discovery${host.latencySeconds === undefined ? '' : ` · observed latency ${formatNmapLatency(host.latencySeconds)}`}`;
      project.value.infrastructure.push(gateway);
      gatewayCount += 1;
      return;
    }

    const hostKey = host.hostname ? `name:${host.hostname.toLocaleLowerCase()}` : `ip:${host.ip}`;
    let imported = importedDevices.get(hostKey);
    if (!imported) {
      const device = createDevice(subnet.devices.length + 1, subnet.id);
      device.name = nmapHostName(host);
      device.kind = 'other';
      device.nics[0].name = 'Discovered interface';
      device.nics[0].bacnetIpEnabled = false;
      device.nics[0].addresses[0].ip = host.ip;
      imported = { device, hosts: [] };
      importedDevices.set(hostKey, imported);
      subnet.devices.push(device);
    } else {
      const address = createDeviceAddress(subnet.id, `Address ${imported.device.nics[0].addresses.length + 1}`);
      address.ip = host.ip;
      imported.device.nics[0].addresses.push(address);
    }
    imported.hosts.push(host);
    imported.device.notes = `Imported from Nmap host discovery · ${imported.hosts.length} responsive ${imported.hosts.length === 1 ? 'address' : 'addresses'}`;
  });

  project.value.viewMode = 'detailed';
  const nodeCount = importedDevices.size + gatewayCount;
  nmapImportNotice.value = `Imported ${freshHosts.length} responsive ${freshHosts.length === 1 ? 'address' : 'addresses'} as ${nodeCount} diagram ${nodeCount === 1 ? 'node' : 'nodes'}${createdSubnetCount ? ` and created ${createdSubnetCount} ${createdSubnetCount === 1 ? 'subnet' : 'subnets'}` : ''}.${duplicateCount ? ` Skipped ${duplicateCount} existing ${duplicateCount === 1 ? 'address' : 'addresses'}.` : ''}`;
  nmapOutput.value = '';
  nmapImportDialog.value?.close();
}
function formatNmapLatency(seconds: number) {
  const milliseconds = seconds * 1000;
  return `${milliseconds < 0.01 ? milliseconds.toFixed(3) : milliseconds < 1 ? milliseconds.toFixed(2) : milliseconds.toFixed(1)} ms`;
}
function removeSubnet(id: string) {
  const removedEndpointIds = project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
    device.nics.flatMap(nic => nic.addresses.filter(address => subnet.id === id || address.subnetId === id).map(address => address.id))
  ));
  project.value.subnets = project.value.subnets.filter(subnet => subnet.id !== id);
  project.value.infrastructure.forEach(item => {
    item.subnetIds = item.subnetIds.filter(subnetId => subnetId !== id);
    item.underlaySubnetIds = (item.underlaySubnetIds ?? []).filter(subnetId => subnetId !== id);
  });
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
  const source = resolveAddressEndpoint(path.hops[0]);
  const sourceSubnet = project.value.subnets.find(subnet => subnet.id === source?.address.subnetId);
  if (sourceSubnet && normalizedNetworkType(sourceSubnet) === 'bacnet-ip' && sourceSubnet.udpPort !== '') path.udpPort = sourceSubnet.udpPort ?? 47808;
}
function useSuggestedBroadcast(path: DiagramTestPath) {
  syncWhoIsBroadcast(path);
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
  if (subnet.networkType === 'bacnet-sc') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  if (subnet.networkType === 'mstp' || subnet.networkType === 'arcnet') return Number(subnet.bacnetNetworkNumber) >= 1 && Number(subnet.bacnetNetworkNumber) <= 65534;
  return getSubnetDetails(subnet.address, subnet.cidr) !== null;
}
function isIpValid(ip: string) { return ipToLong(ip) !== null; }
function networkTypeLabel(subnet: DiagramSubnet) { return subnet.networkType === 'mstp' ? 'MS/TP' : subnet.networkType === 'arcnet' ? 'ARCNET' : subnet.networkType === 'bacnet-sc' ? 'BACnet/SC network' : 'BACnet/IP subnet'; }
function normalizedNetworkType(subnet: DiagramSubnet) { return subnet.networkType || 'bacnet-ip'; }
function networkDiagramLabel(subnet: DiagramSubnet) {
  return normalizedNetworkType(subnet) === 'bacnet-ip' ? (subnet.udpPort === '' ? 'IP SUBNET' : 'BACNET/IP') : networkTypeLabel(subnet).toUpperCase();
}
function subnetMetaLabel(subnet: DiagramSubnet) {
  const count = subnetAddressCount(subnet.id);
  if (normalizedNetworkType(subnet) === 'bacnet-ip' && subnet.udpPort === '') return `No BACnet/IP · ${count} addr`;
  const showPort = normalizedNetworkType(subnet) === 'bacnet-ip' && (advancedBacnetPorts.value || (subnet.udpPort !== undefined && subnet.udpPort !== 47808));
  return showPort ? `UDP ${subnet.udpPort} · ${count} addr` : `${count} address${count === 1 ? '' : 'es'}`;
}
function compatibleAddressNetworks(owner: DiagramSubnet) { return project.value.subnets.filter(candidate => normalizedNetworkType(candidate) === normalizedNetworkType(owner)
  || normalizedNetworkType(candidate) === 'bacnet-sc' || normalizedNetworkType(owner) === 'bacnet-sc'); }
function upstreamNetworkOptions(segment: DiagramSubnet) {
  return project.value.subnets.filter(candidate => candidate.id !== segment.id
    && (normalizedNetworkType(candidate) === 'bacnet-ip' || normalizedNetworkType(candidate) === normalizedNetworkType(segment)));
}
function addressFieldLabel(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  return subnet?.networkType === 'mstp' ? 'MS/TP MAC (0–127)' : subnet?.networkType === 'arcnet' ? 'ARCNET node (0–255)' : subnet?.networkType === 'bacnet-sc' ? 'BACnet/SC node IP' : 'IP address';
}
function displayAddress(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  if (!address.ip) return subnet?.networkType === 'mstp' ? 'MAC not set' : subnet?.networkType === 'arcnet' ? 'Node not set' : 'IP not set';
  return subnet?.networkType === 'mstp' ? `MAC ${address.ip}` : subnet?.networkType === 'arcnet' ? `Node ${address.ip}` : address.ip;
}
function scHubsFor(networkId: string) { return project.value.infrastructure.filter(item => (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') && item.subnetIds.includes(networkId)); }
function otherScHubs(id: string) { return project.value.infrastructure.filter(item => item.id !== id && (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster')); }
function scHubsForNic(currentNic: DiagramNic) {
  const infrastructure = project.value.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster').map(item => ({ id: item.id, name: item.name, label: item.kind === 'sc-hub-cluster' ? 'HA infrastructure hub' : 'infrastructure hub' }));
  const deviceHubs = hostNodes.value.flatMap(host => host.device.nics.filter(nic => nic.id !== currentNic.id && nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub')).map(nic => ({ id: nic.id, name: `${host.device.name} · ${nic.name}`, label: nic.scHubRole === 'ha-hub' ? 'device HA hub' : 'device hub' })));
  return [...infrastructure, ...deviceHubs];
}
function deviceServiceLabel(device: DiagramDevice) {
  const hasIp = device.nics.some(nic => nic.bacnetIpEnabled);
  const hasSc = device.nics.some(nic => nic.bacnetScEnabled);
  const hasHub = device.nics.some(nic => nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub'));
  return device.bbmdEnabled ? (device.kind === 'server' ? 'BMS / BBMD' : 'BACNET/IP BBMD') : hasHub ? 'BACNET/SC HUB' : hasIp && hasSc ? 'BACNET/IP + SC' : hasSc ? 'BACNET/SC NODE' : hasIp ? 'BACNET/IP HOST' : 'IP HOST';
}
function addressEntryClass(address: DiagramDeviceAddress) {
  const subnet = project.value.subnets.find(item => item.id === address.subnetId);
  const state = addressState(address, subnet);
  return { 'input-invalid': state === 'invalid', 'input-warning': state === 'outside' };
}
function allAddresses(device: DiagramDevice) { return device.nics.flatMap(nic => nic.addresses); }
function addressCount(device: DiagramDevice) { return allAddresses(device).length; }
function hostAddressRows(device: DiagramDevice) { return device.nics.flatMap(nic => nic.addresses.map(address => {
  const network = project.value.subnets.find(item => item.id === address.subnetId);
  const services = [nic.bacnetIpEnabled ? 'B/IP' : '', nic.bacnetScEnabled ? 'SC' : ''].filter(Boolean).join('+') || 'IP';
  return { id: address.id, label: `${nic.name || 'NIC'} · ${services} · ${address.label || 'Address'} · ${network?.name || 'No network'}`, address: displayAddress(address), color: network?.color || '#64748b' };
})); }
function subnetAddressCount(subnetId: string) {
  return hostNodes.value.reduce((total, host) => total + allAddresses(host.device).filter(address => address.subnetId === subnetId).length, 0);
}
function deviceTooltip(device: DiagramDevice) {
  const addresses = device.nics.flatMap(nic => nic.addresses.map(address => `${nic.name}: ${displayAddress(address)}`));
  return `${device.name} — ${device.kind}${addresses.length ? ` — ${addresses.join(' · ')}` : ''}`;
}
function clipped(value: string, length: number) { return value.length > length ? `${value.slice(0, length - 1)}…` : value; }
function roundedTopAccentPath(width: number) {
  return `M 14 0 H ${width - 14} A 14 14 0 0 1 ${width} 14 H ${width - 6} A 8 8 0 0 0 ${width - 14} 6 H 14 A 8 8 0 0 0 6 14 H 0 A 14 14 0 0 1 14 0 Z`;
}
function deviceSymbol(kind: DeviceKind) { return kind === 'controller' ? 'C' : kind === 'workstation' ? 'W' : kind === 'server' ? 'S' : kind === 'sensor' ? '•' : '?'; }
function rowX(index: number, count: number) { return canvasWidth.value * (index + 1) / (count + 1) - subnetWidth / 2; }
function networkX(subnet: DiagramSubnet) {
  const row = subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' ? fieldSegments.value : routedNetworks.value;
  return rowX(row.findIndex(item => item.id === subnet.id), row.length);
}
function networkY(subnet: DiagramSubnet) { return subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' ? fieldBusY.value : subnetY; }
function networkCenter(id: string) { const subnet = project.value.subnets.find(item => item.id === id); return subnet ? networkX(subnet) + subnetWidth / 2 : 0; }
function subnetCenter(id: string) { return networkCenter(id); }
function hostRow(host: HostNode) { return host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet' ? fieldHostNodes.value : ipHostNodes.value; }
function hostX(host: HostNode, fallbackIndex = 0) {
  const row = hostRow(host);
  const index = row.findIndex(item => item.device.id === host.device.id);
  const resolvedIndex = index < 0 ? fallbackIndex : index;
  const rowWidth = row.length * hostWidth + Math.max(0, row.length - 1) * hostGap;
  return (canvasWidth.value - rowWidth) / 2 + resolvedIndex * (hostWidth + hostGap);
}
function hostYFor(host: HostNode) { return host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet' ? fieldHostY.value : ipHostY; }
function routingDevicesFor(segment: DiagramSubnet) {
  return hostNodes.value.flatMap(host => host.device.nics.flatMap(nic => nic.addresses
    .filter(address => address.subnetId === segment.upstreamSubnetId)
    .map(address => ({ id: host.device.id, name: host.device.name || 'Unnamed device', ip: address.ip }))));
}
function infrastructureX(index: number) { return canvasWidth.value * (index + 1) / (project.value.infrastructure.length + 1); }
function validConnections(item: DiagramInfrastructure) { return item.subnetIds.filter(id => project.value.subnets.some(subnet => subnet.id === id)); }
function connectionKindClass(item: DiagramInfrastructure) {
  if (item.kind === 'router' || item.kind === 'gateway' || item.kind === 'firewall') return 'connection--routing';
  if (item.kind === 'bbmd') return 'connection--bbmd';
  if (item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') return 'connection--sc';
  return 'connection--local';
}
function connectionTargetX(itemId: string, subnetId: string) {
  const connected = project.value.infrastructure.filter(item => validConnections(item).includes(subnetId));
  const connectionIndex = connected.findIndex(item => item.id === itemId);
  const offset = connectionIndex < 0 ? 0 : (connectionIndex - (connected.length - 1) / 2) * 18;
  return subnetCenter(subnetId) + offset;
}
function infrastructureConnectionLabel(item: DiagramInfrastructure, subnetId: string) {
  const subnet = project.value.subnets.find(candidate => candidate.id === subnetId);
  const relation = item.kind === 'bbmd' ? 'BBMD local attachment' : item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster' ? 'BACnet/SC underlay' : item.kind === 'router' || item.kind === 'gateway' || item.kind === 'firewall' ? 'routed interface' : 'local attachment';
  return `${item.name || 'Unnamed infrastructure'} → ${subnet?.name || 'missing network'} · ${relation}`;
}
function connectionPath(index: number, itemId: string, subnetId: string) {
  const item = project.value.infrastructure.find(candidate => candidate.id === itemId);
  if (!item) return '';
  const startX = infrastructureX(index);
  const endX = connectionTargetX(itemId, subnetId);
  if (item.kind === 'bbmd' || item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster') {
    const bendY = item.kind === 'bbmd' ? 184 + index * 3 : 176 + index * 3;
    return `M ${startX} 154 C ${startX} ${bendY}, ${endX} ${bendY}, ${endX} ${subnetY}`;
  }
  const laneY = 174 + index * 11;
  return `M ${startX} 154 L ${startX} ${laneY} L ${endX} ${laneY} L ${endX} ${subnetY}`;
}
function fieldBusRoutePath(segment: DiagramSubnet) {
  if (!segment.upstreamSubnetId) return '';
  const routerHost = ipHostNodes.value.find(host => host.device.id === segment.routerId);
  const startX = routerHost ? hostX(routerHost) + hostWidth / 2 : networkCenter(segment.upstreamSubnetId);
  const startY = routerHost ? ipHostY + hostHeight.value : subnetY + subnetHeight;
  const endX = networkCenter(segment.id);
  const laneY = fieldBusY.value - 28;
  return `M ${startX} ${startY} L ${startX} ${laneY} L ${endX} ${laneY} L ${endX} ${fieldBusY.value}`;
}
function routerName(id: string) { return hostNodes.value.find(host => host.device.id === id)?.device.name || 'Unassigned router'; }

interface DiagramPoint { x: number; y: number }
const addressLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => {
  const addressTotal = addressCount(host.device);
  let flatAddressIndex = 0;
  return host.device.nics.flatMap(nic => nic.addresses.flatMap(address => {
    const target = project.value.subnets.find(candidate => candidate.id === address.subnetId);
    if (!target) return [];
    const offset = (flatAddressIndex++ - (addressTotal - 1) / 2) * 12;
    const start = { x: networkX(target) + subnetWidth / 2 + offset, y: networkY(target) + subnetHeight };
    const end = { x: hostX(host, hostIndex) + hostWidth / 2 + offset, y: hostYFor(host) };
    const midY = (start.y + end.y) / 2;
    return [{
      id: address.id,
      path: `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`,
      color: target.color,
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

const scLinks = computed(() => hostNodes.value.flatMap((host, hostIndex) => host.device.nics.flatMap((nic, nicIndex) => {
  if (!nic.bacnetScEnabled || !nic.scHubId) return [];
  const sourceX = hostX(host, hostIndex) + hostWidth / 2 + (nicIndex - (host.device.nics.length - 1) / 2) * 18;
  const sourceY = hostYFor(host) + hostHeight.value;
  const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === nic.scHubId);
  let targetX = 0;
  let targetY = 0;
  let targetName = '';
  if (infrastructureIndex >= 0) {
    const target = project.value.infrastructure[infrastructureIndex];
    targetX = infrastructureX(infrastructureIndex);
    targetY = 154;
    targetName = target.name;
  } else {
    const targetHostIndex = hostNodes.value.findIndex(candidate => candidate.device.nics.some(candidateNic => candidateNic.id === nic.scHubId));
    if (targetHostIndex < 0) return [];
    const targetHost = hostNodes.value[targetHostIndex];
    targetX = hostX(targetHost, targetHostIndex) + hostWidth / 2;
    targetY = hostYFor(targetHost) + hostHeight.value;
    targetName = targetHost.device.name;
  }
  const controlY = Math.max(sourceY, targetY) + 52;
  return [{
    id: `sc-${nic.id}-${nic.scHubId}`,
    label: `BACnet/SC · ${host.device.name} ${nic.name} → ${targetName}`,
    path: `M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${targetX} ${controlY}, ${targetX} ${targetY}`,
    startX: sourceX,
    startY: sourceY,
    endX: targetX,
    endY: targetY
  }];
})));

function endpointPoint(endpointId: string): DiagramPoint | null {
  const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === endpointId);
  if (infrastructureIndex >= 0) return { x: infrastructureX(infrastructureIndex), y: 154 };
  const resolved = resolveAddressEndpoint(endpointId);
  if (resolved) {
    const addresses = allAddresses(resolved.host.device);
    const addressIndex = addresses.findIndex(address => address.id === endpointId);
    const offset = (addressIndex - (addresses.length - 1) / 2) * 12;
    return { x: hostX(resolved.host, resolved.hostIndex) + hostWidth / 2 + offset, y: hostYFor(resolved.host) + hostHeight.value };
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
  const controlY = bothHosts ? Math.max(start.y, end.y) + 38 + pathIndex * 18 : (start.y + end.y) / 2 + pathIndex * 12;
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
    ...(path.testType === 'bacnet-whois' ? [{ label: 'BROADCAST', value: `${path.broadcastAddress || 'Not specified'}:${path.udpPort || 47808}` }] : [])
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
function serializedDiagramSvg(theme: 'dark' | 'light' = 'dark', branded = false) {
  if (!diagramSvg.value) return;
  const clone = diagramSvg.value.cloneNode(true) as SVGSVGElement;
  const originalIcons = diagramSvg.value.querySelectorAll<SVGElement>('.ace-node-icon');
  clone.querySelectorAll<SVGElement>('.ace-node-icon').forEach((icon, index) => {
    icon.setAttribute('fill', getComputedStyle(originalIcons[index]).color || '#c1d301');
  });
  clone.setAttribute('width', String(canvasWidth.value));
  clone.setAttribute('height', String(canvasHeight.value));
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `${SVG_EXPORT_STYLES}${SVG_SC_LINK_STYLES}${SVG_CONNECTION_STYLES}${theme === 'light' ? PDF_LIGHT_STYLES : ''}${SUBNET_ACCENT_EXPORT_STYLES}`;
  clone.prepend(style);
  if (branded) {
    const appLogo = document.querySelector<SVGSVGElement>('.logo-icon-svg');
    if (appLogo) {
      const logo = appLogo.cloneNode(true) as SVGSVGElement;
      logo.removeAttribute('style');
      logo.setAttribute('class', 'export-ace-logo');
      logo.setAttribute('x', '36');
      logo.setAttribute('y', '15');
      logo.setAttribute('width', '170');
      logo.setAttribute('height', '47');
      clone.querySelector('.export-bg')?.after(logo);
      const title = clone.querySelector('.export-title');
      const notes = clone.querySelector('.export-notes');
      title?.setAttribute('x', '230');
      title?.setAttribute('y', '37');
      notes?.setAttribute('x', '230');
      notes?.setAttribute('y', '59');
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}
function saveSvg() {
  const svg = serializedDiagramSvg();
  if (svg) download(svg, 'image/svg+xml', 'svg');
}
function openPdfExportDialog() {
  pdfExportDialog.value?.showModal();
}
function confirmPdfExport() {
  pdfExportDialog.value?.close();
  void savePdf();
}
async function savePdf() {
  const svg = serializedDiagramSvg(pdfTheme.value, true);
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
    pdf.setFillColor(pdfTheme.value === 'light' ? '#ffffff' : '#121212');
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', padding, padding, drawingWidth, drawingHeight, undefined, 'FAST');
    pdf.link(
      padding + 38 * pointScale,
      padding + (canvasHeight.value - 36) * pointScale,
      Math.min(360 * pointScale, drawingWidth - 38 * pointScale),
      20 * pointScale,
      { url: TOOL_URL }
    );
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
.subnet-accent{fill:var(--subnet-accent-color);stroke:none}
.export-bg{fill:#121212}.export-title{font:700 24px Montserrat,Arial,sans-serif;fill:#f8fafc}.export-notes{font:13px Inter,Arial,sans-serif;fill:#94a3b8}.layer-label{font:700 8px Inter,Arial,sans-serif;fill:#475569;letter-spacing:1.5px}.connection{fill:none;stroke:#64748b;stroke-width:2.5}.connection-dot{fill:#94a3b8}.infra-box{fill:#1e293b;stroke:#94d8ff;stroke-width:2}.infra-type{font:700 10px Inter,Arial,sans-serif;fill:#94d8ff;letter-spacing:1px}.infra-name{font:600 13px Inter,Arial,sans-serif;fill:#f8fafc}.infra-ip{font:11px monospace;fill:#94a3b8}.subnet-box{fill:#171722;stroke-width:2}.subnet-name{font:700 15px Inter,Arial,sans-serif;fill:#f8fafc}.subnet-address{font:12px monospace;fill:#cbd5e1}.subnet-meta{font:11px Inter,Arial,sans-serif;fill:#94a3b8}.device-icon{fill:#334155}.device-name{font:600 12px Inter,Arial,sans-serif;fill:#f8fafc}.device-kind{font:9px Inter,Arial,sans-serif;fill:#94a3b8;text-transform:uppercase}.footer-label{font:10px Inter,Arial,sans-serif;fill:#64748b}.node-category{font:700 9px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:1.2px}.host-box{fill:#252536;stroke:#64748b;stroke-width:1.5}.host-address-label{font:700 8px Inter,Arial,sans-serif;fill:#94a3b8}.host-address-summary{font:10px monospace;fill:#cbd5e1}.host-count-badge{fill:#0f3d39;stroke:#2dd4bf}.host-count-text{font:700 7px Inter,Arial,sans-serif;fill:#99f6e4}.address-link{fill:none;stroke-width:2.5}.address-endpoint{stroke:#121212;stroke-width:1}.address-link-label{font:9px monospace;fill:#cbd5e1;paint-order:stroke;stroke:#121212;stroke-width:4px;stroke-linejoin:round}.test-path{fill:none;stroke-width:4;opacity:.9}.test-path.success{stroke:#14ae5c}.test-path.failure{stroke:#df1219;stroke-dasharray:9 6}.test-path-label-bg.success{fill:#0d3823;stroke:#14ae5c}.test-path-label-bg.failure{fill:#3d1719;stroke:#df1219}.test-path-label{font:700 9px Inter,Arial,sans-serif}.test-path-label.success{fill:#86efac}.test-path-label.failure{fill:#fca5a5}
.connection{stroke-width:2;stroke-linejoin:round}.address-link{stroke-width:2}.test-path{stroke-width:2.75;opacity:.78}.test-path.failure{stroke-dasharray:8 6}.path-legend-bg{fill:#181820;stroke:#334155}.path-legend-bg.success{stroke:#14ae5c}.path-legend-bg.failure{stroke:#df1219}.path-legend-dot.success{fill:#14ae5c}.path-legend-dot.failure{fill:#df1219}.path-legend-text{font:600 9px Inter,Arial,sans-serif;fill:#cbd5e1}
.connection--routing{stroke:#64748b;stroke-width:2.5}.connection--bbmd{stroke:#94d8ff;stroke-width:2.75;stroke-dasharray:9 6}.connection--sc{stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:2 6}.connection--local{stroke:#a78bfa;stroke-width:2}.connection--routing-dot{fill:#64748b}.connection--bbmd-dot{fill:#94d8ff}.connection--sc-dot{fill:#2dd4bf}.connection--local-dot{fill:#a78bfa}
.sc-service-link{fill:none;stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:8 6;opacity:.9}.sc-service-endpoint{fill:#2dd4bf;stroke:#121212;stroke-width:1}
.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}
</style>
