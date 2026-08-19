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
        <AppButton @click="openGettingStartedDialog">Getting started</AppButton>
        <AppButton variant="danger" @click="newProject">New project</AppButton>
        <AppButton @click="openBbmdStateDialog">Import BBMD state</AppButton>
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
          <AceToggle :model-value="Boolean(project.allowSplitHorizonBdt)" label="Allow split-horizon BDTs" description="Treat intentional one-way BDT entries as valid and suppress missing-mutual-peer warnings" @update:model-value="project.allowSplitHorizonBdt = $event" />
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

        <article v-for="(subnet, subnetIndex) in project.subnets" :id="`config-subnet-${subnet.id}`" :key="subnet.id" tabindex="-1" class="glass-card subnet-editor-card config-target" :class="{ 'config-target-active': activeConfigTarget === `subnet-${subnet.id}` }" :style="{ '--subnet-color': subnet.color }">
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
          <div v-for="device in subnet.devices" :id="`config-device-${device.id}`" :key="device.id" tabindex="-1" class="device-editor-block config-target" :class="{ 'config-target-active': activeConfigTarget === `device-${device.id}` }">
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
            <div class="device-secondary-actions">
              <button class="device-move-button" type="button" :disabled="!movableSubnets(subnet).length" :title="movableSubnets(subnet).length ? 'Move this device and its local addresses to another subnet' : 'Add another compatible subnet before moving this device'" @click="openMoveDeviceDialog(device, subnet)">Move to subnet</button>
            </div>
            <AceToggle :model-value="Boolean(device.requiredForRouting)" label="BACnet router / bridge between datalinks" description="Route between services or networks assigned to this device's NICs" @update:model-value="device.requiredForRouting = $event" />
            <AceToggle v-if="(!subnet.networkType || subnet.networkType === 'bacnet-ip') && device.nics.some(nic => nic.bacnetIpEnabled)" :model-value="Boolean(device.bbmdEnabled)" label="Hosts a BBMD service" description="This BACnet device also distributes BACnet/IP broadcasts" @update:model-value="setDeviceBbmd(device, $event)" />
            <details v-if="device.bbmdEnabled" class="device-relationship-editor bdt-peer-editor">
              <summary>
                <span>Broadcast Distribution Table</span>
                <em>{{ device.bdtPeerDeviceIds?.length ?? 0 }} {{ (device.bdtPeerDeviceIds?.length ?? 0) === 1 ? 'peer' : 'peers' }}</em>
              </summary>
              <div class="bdt-peer-editor-body">
                <span class="field-hint">Select a BBMD to create or remove a mutual BDT relationship.</span>
                <span v-if="!otherBbmdDevices(device, subnet.id).length" class="field-hint">Enable BBMD service on a device in another IP subnet to create BDT relationships.</span>
                <div v-else class="subnet-checkboxes">
                  <label v-for="peer in otherBbmdDevices(device, subnet.id)" :key="peer.device.id" class="checkbox-chip">
                    <input type="checkbox" :checked="isBdtPeer(device, peer.device.id)" @change="toggleBdtPeer(device, peer.device.id)">
                    <span>{{ peer.device.name }} · {{ peer.subnet.name }}</span>
                  </label>
                </div>
              </div>
            </details>
            <div v-if="(!subnet.networkType || subnet.networkType === 'bacnet-ip') && device.nics.some(nic => nic.bacnetIpEnabled)" class="device-relationship-editor">
              <label :for="`fdr-target-${device.id}`">Foreign Device Registration</label>
              <select :id="`fdr-target-${device.id}`" v-model="device.foreignDeviceBbmdId">
                <option value="">Not registered as a foreign device</option>
                <option v-for="target in foreignBbmdOptions(device, subnet.id)" :key="target.device.id" :value="target.device.id">{{ target.device.name }} · {{ target.subnet.name }}</option>
              </select>
              <span class="field-hint">Registers this device with a BBMD on another IP subnet and adds it to that BBMD's Foreign Device Table.</span>
            </div>
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
        <div v-if="!project.infrastructure.length" class="glass-card empty-editor-state infrastructure-empty">Add routers, switches, firewalls, gateways, or BACnet/SC hubs and connect them to the relevant networks. BBMD service is configured on BACnet devices above.</div>
        <article v-for="item in project.infrastructure" :id="`config-infrastructure-${item.id}`" :key="item.id" tabindex="-1" class="glass-card infrastructure-editor-card config-target" :class="{ 'config-target-active': activeConfigTarget === `infrastructure-${item.id}` }">
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
        <article v-for="path in project.paths" :id="`config-path-${path.id}`" :key="path.id" tabindex="-1" class="glass-card path-editor-card config-target" :class="[path.outcome, { 'config-target-active': activeConfigTarget === `path-${path.id}` }]">
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
        <div v-if="diagnostics.length" class="diagnostics-panel" aria-label="Diagram findings">
          <div class="diagnostics-summary">
            <span><strong>{{ diagnostics.length }}</strong> findings in {{ diagnosticGroups.length }} {{ diagnosticGroups.length === 1 ? 'class' : 'classes' }}</span>
            <small>Expand a class to inspect individual items.</small>
          </div>
          <details v-for="group in diagnosticGroups" :key="group.key" :class="['diagnostic-group', group.level]">
            <summary>
              <span class="diagnostic-group-icon">{{ group.level === 'error' ? '!' : '△' }}</span>
              <span class="diagnostic-group-copy"><strong>{{ group.title }}</strong><small>{{ group.description }}</small></span>
              <span class="diagnostic-group-counts">
                <em v-if="group.errorCount" class="error">{{ group.errorCount }} {{ group.errorCount === 1 ? 'error' : 'errors' }}</em>
                <em v-if="group.warningCount" class="warning">{{ group.warningCount }} {{ group.warningCount === 1 ? 'warning' : 'warnings' }}</em>
              </span>
            </summary>
            <div class="diagnostic-group-items">
              <div v-for="diagnostic in group.items" :key="diagnostic.message" :class="['diagnostic-item', diagnostic.level]">
                <span>{{ diagnostic.level === 'error' ? '!' : '△' }}</span>{{ diagnostic.message }}
              </div>
            </div>
          </details>
        </div>
        <div class="diagram-preview-toolbar">
          <div><strong>Live preview</strong><span>{{ project.subnets.length }} subnets · {{ deviceCount }} devices · {{ project.infrastructure.length }} infrastructure · {{ project.paths.length }} tests</span></div>
          <div class="diagram-preview-controls">
            <label for="diagram-layout-mode">Layout</label>
            <select id="diagram-layout-mode" v-model="layoutMode">
              <option value="compact">Compact grid · 4 across</option>
              <option value="balanced">Balanced grid · 8 across</option>
              <option value="wide">Wide rows · no wrapping</option>
            </select>
            <label v-if="bbmdReport.devices.length" for="diagram-relationship-mode">BDT view</label>
            <select v-if="bbmdReport.devices.length" id="diagram-relationship-mode" v-model="relationshipMode">
              <option value="highlights">Peer highlights</option>
              <option value="focused">Focused edges</option>
              <option value="all">All edges</option>
              <option value="hidden">Hidden</option>
            </select>
            <select v-if="bbmdReport.devices.length && (relationshipMode === 'highlights' || relationshipMode === 'focused')" v-model="focusedBbmdId" aria-label="Focused BBMD">
              <option v-for="bbmd in bbmdReport.devices" :key="bbmd.id" :value="bbmd.id">{{ bbmd.name }} · {{ bbmd.endpoint }}</option>
            </select>
            <button type="button" class="reset-button" @click="resetProject">Reset example</button>
          </div>
        </div>
        <div v-if="focusedBbmd && (relationshipMode === 'highlights' || relationshipMode === 'focused')" class="diagram-relationship-summary">
          <span><strong>{{ focusedBbmd.name }}</strong> · {{ focusedBbmd.entries.length }} outbound · {{ focusedBbmd.inboundPeerIds.length }} inbound</span>
          <span class="relationship-summary-legend"><em class="mutual">Mutual</em><em class="outbound">Outbound only</em><em class="inbound">Inbound only</em><em class="fdr">FDR client</em></span>
          <small>{{ relationshipMode === 'highlights' ? 'Cards are highlighted without drawing BDT edges.' : 'Only relationships involving this BBMD are drawn.' }} Click another BBMD card to focus it.</small>
        </div>
        <div class="diagram-scroll-frame">
          <svg ref="diagramSvg" class="network-diagram-svg" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`" :width="canvasWidth" :height="canvasHeight" xmlns="http://www.w3.org/2000/svg" role="img" :aria-label="project.title">
            <defs>
              <marker id="path-arrow-success" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#14ae5c" /></marker>
              <marker id="path-arrow-failure" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#df1219" /></marker>
              <marker id="bdt-arrow" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#a78bfa" /></marker>
              <marker id="fdr-arrow" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#fb923c" /></marker>
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
                <circle :class="['connection-dot', `${connectionKindClass(item)}-dot`]" :cx="connectionTargetX(item.id, subnetId)" :cy="connectionTargetY(subnetId)" r="4" />
              </g>
              <g class="diagram-node-action" role="button" tabindex="0" :aria-label="`Edit infrastructure ${item.name || 'Unnamed infrastructure'}`" :transform="`translate(${infrastructureX(index) - 75}, ${infrastructureY(index)})`" @click="focusConfig('infrastructure', item.id)" @keydown.enter.prevent="focusConfig('infrastructure', item.id)" @keydown.space.prevent="focusConfig('infrastructure', item.id)">
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
              <text v-if="segment.routerId" class="address-link-label" :x="networkCenter(segment.id)" :y="networkY(segment) - 18" text-anchor="middle">via {{ clipped(routerName(segment.routerId), 28) }}</text>
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
            <g v-for="link in displayedBdtLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="bdt-link" :d="link.path" :marker-end="link.mutual ? undefined : 'url(#bdt-arrow)'" />
              <circle class="bdt-endpoint" :cx="link.startX" :cy="link.startY" r="4" />
              <circle class="bdt-endpoint" :cx="link.endX" :cy="link.endY" r="4" />
              <text class="relationship-link-label bdt" :x="link.labelX" :y="link.labelY" text-anchor="middle">{{ link.mutual ? 'MUTUAL BDT' : 'BDT ENTRY' }}</text>
            </g>
            <g v-for="link in displayedFdrLinks" :key="link.id">
              <title>{{ link.label }}</title>
              <path class="fdr-link" :d="link.path" marker-end="url(#fdr-arrow)" />
              <circle class="fdr-endpoint" :cx="link.startX" :cy="link.startY" r="4" />
              <text class="relationship-link-label fdr" :x="link.labelX" :y="link.labelY" text-anchor="middle">FDR</text>
            </g>

            <g v-for="(subnet, subnetIndex) in project.subnets" :key="`preview-${subnet.id}`" class="diagram-node-action" role="button" tabindex="0" :aria-label="`Edit network ${subnet.name || `Subnet ${subnetIndex + 1}`}`" :transform="`translate(${networkX(subnet)}, ${networkY(subnet)})`" @click="focusConfig('subnet', subnet.id)" @keydown.enter.prevent="focusConfig('subnet', subnet.id)" @keydown.space.prevent="focusConfig('subnet', subnet.id)">
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

            <g v-for="(host, hostIndex) in hostNodes" :key="`host-${host.device.id}`" :class="['diagram-node-action', hostRelationshipClass(host.device)]" role="button" tabindex="0" :aria-label="`Edit device ${host.device.name || 'Unnamed device'}`" :transform="`translate(${hostX(host, hostIndex)}, ${hostYFor(host)})`" @click="activateHostNode(host.device)" @keydown.enter.prevent="activateHostNode(host.device)" @keydown.space.prevent="activateHostNode(host.device)">
              <title>{{ deviceTooltip(host.device) }}</title>
              <rect class="host-box" :width="hostWidth" :height="hostHeight" rx="12" />
              <text class="node-category" x="16" y="21">{{ deviceServiceLabel(host.device) }}</text>
              <circle class="device-icon" cx="25" cy="45" r="15" />
              <use :href="host.device.requiredForRouting ? '#ace-icon-router' : host.device.bbmdEnabled ? '#ace-icon-network' : '#ace-icon-device'" class="ace-node-icon host-node-icon" x="15" y="35" width="20" height="20" />
              <text class="device-name" x="47" y="42">{{ clipped(host.device.name || 'Unnamed device', 25) }}</text>
              <text class="device-kind" x="47" y="58">{{ host.device.kind }}</text>
              <g v-for="(row, addressIndex) in hostAddressRows(host.device)" :key="row.id">
                <circle :cx="18" :cy="77 + addressIndex * 30" r="3" :fill="row.color" />
                <text class="host-address-label" x="28" :y="80 + addressIndex * 30">{{ clipped(row.label, 38) }}</text>
                <text class="host-address-summary" x="28" :y="93 + addressIndex * 30">{{ row.address || 'Address not set' }}</text>
              </g>
              <rect class="host-count-badge" :x="hostWidth - 61" y="10" width="47" height="18" rx="9" />
              <text class="host-count-text" :x="hostWidth - 37.5" y="22" text-anchor="middle">{{ host.device.nics.length }} NIC / {{ addressCount(host.device) }} addr</text>
              <text v-if="hostRelationshipBadge(host.device)" class="host-relationship-badge" :x="hostWidth - 14" y="43" text-anchor="end">{{ hostRelationshipBadge(host.device) }}</text>
            </g>
            <g v-for="segment in pathSegments" :key="segment.id" class="test-path-group">
              <title>{{ segment.label }}</title>
              <path :class="['test-path', segment.outcome]" :d="segment.path" :marker-end="`url(#path-arrow-${segment.outcome})`" />
            </g>
            <g v-if="pathLegends.length">
              <text class="layer-label" x="40" :y="legendStart - 14">CONNECTIVITY TESTS</text>
              <g v-for="legend in pathLegends" :key="`legend-${legend.id}`" class="diagram-node-action" role="button" tabindex="0" :aria-label="`Edit connectivity test ${legend.name}`" :transform="`translate(${legend.x}, ${legend.y})`" @click="focusConfig('path', legend.id)" @keydown.enter.prevent="focusConfig('path', legend.id)" @keydown.space.prevent="focusConfig('path', legend.id)">
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
            <text class="footer-label export-footer" x="40" :y="canvasHeight - 22">BACnet Studio by ACE IoT · https://ace-iot-solutions.github.io/bacnet-subnetting-primer/</text>
          </svg>
        </div>
      </main>
    </div>

    <dialog ref="gettingStartedDialog" class="nmap-import-dialog diagram-guide-dialog" aria-labelledby="diagram-guide-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">BUILD AN AS-BUILT OR PLAN</p>
          <h3 id="diagram-guide-title">Get started with the Diagram Builder</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close getting-started guide" @click="gettingStartedDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">Start from known design information, discover the BBMD topology, or inventory responsive IP hosts. You can combine these approaches and correct the diagram as field conditions become clear.</p>

      <div class="diagram-guide-grid">
        <section class="diagram-guide-step">
          <span class="diagram-guide-number">1</span>
          <div>
            <h4>Start manually</h4>
            <p>Choose <strong>New project</strong>, add each BACnet datalink, then add devices and infrastructure. Use this path for a planned design or when you already know the subnet, VLAN, BACnet network number, and device details.</p>
            <ul>
              <li>Define the actual network address and prefix.</li>
              <li>Place BBMD service on the BACnet device that hosts it.</li>
              <li>Add BDT, FDR, routing, and connectivity-test relationships.</li>
            </ul>
          </div>
        </section>

        <section class="diagram-guide-step">
          <span class="diagram-guide-number">2</span>
          <div>
            <h4>Capture a BBMD topology</h4>
            <p><a href="https://github.com/ACE-IoT-Solutions/ace-bbmd-manager" target="_blank" rel="noopener noreferrer">ACE BBMD Manager</a> walks BDT entries from one or more known BBMDs and saves the discovered state. Install it from <a href="https://pypi.org/project/ace-bbmd-manager/" target="_blank" rel="noopener noreferrer">PyPI</a>:</p>
            <pre><code>python -m pip install ace-bbmd-manager</code></pre>
            <p>From a host with BACnet/IP access, identify its local interface address and a known BBMD, then write the scan to a dedicated state file:</p>
            <pre><code>bbmd-manager -l 192.0.2.50 -s site.state walk 192.0.2.10</code></pre>
            <p>Choose <strong>Import BBMD state</strong> and select <code>site.state</code>. Studio creates device-level BBMDs and directional BDT links. Because the state store does not include authoritative subnet definitions, imported networks begin as <strong>/24 assumptions</strong>; review and correct them.</p>
            <p class="diagram-guide-note">A BBMD walk follows readable BDT entries. It does not discover every BACnet or IP device, and ACLs, routing, UDP ports, or one-way BDTs can limit what it sees.</p>
            <AppButton size="sm" @click="openBbmdImportFromGuide">Open BBMD state importer</AppButton>
          </div>
        </section>

        <section class="diagram-guide-step">
          <span class="diagram-guide-number">3</span>
          <div>
            <h4>Discover responsive IP devices with Nmap</h4>
            <p>Install <a href="https://nmap.org/download.html" target="_blank" rel="noopener noreferrer">Nmap</a>, identify the subnet you are authorized to inspect, and run a host-discovery scan. The <code>-sn</code> option discovers hosts without performing a port scan:</p>
            <pre><code>nmap -sn 192.0.2.0/24</code></pre>
            <p>To retain a normal-text copy as well as terminal output:</p>
            <pre><code>nmap -sn 192.0.2.0/24 -oN subnet-scan.txt</code></pre>
            <p>Choose <strong>Import Nmap</strong> and paste the terminal output or the contents of <code>subnet-scan.txt</code>. Select the correct prefix before importing. Responsive hosts enter as IP-only inventory because host discovery alone does not prove BACnet capability.</p>
            <p class="diagram-guide-note warning">Only scan networks you own or are explicitly authorized to assess. Use the real subnet prefix and the appropriate connected interface; some probe types may require elevated privileges on your operating system.</p>
            <div class="diagram-guide-links">
              <a href="https://nmap.org/book/man-host-discovery.html" target="_blank" rel="noopener noreferrer">Nmap host-discovery reference</a>
              <AppButton size="sm" @click="openNmapImportFromGuide">Open Nmap importer</AppButton>
            </div>
          </div>
        </section>
      </div>

      <div class="pdf-export-dialog-actions">
        <AppButton variant="primary" @click="gettingStartedDialog?.close()">Start diagramming</AppButton>
      </div>
    </dialog>

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

    <dialog ref="bbmdStateDialog" class="nmap-import-dialog" aria-labelledby="bbmd-state-import-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">BACNET BROADCAST TOPOLOGY</p>
          <h3 id="bbmd-state-import-title">Import ACE BBMD Manager state</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close BBMD state import" @click="bbmdStateDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">
        Upload an ACE BBMD Manager <code>.state</code> file to create device-level BBMDs and their observed BDT relationships. The state store does not contain subnet definitions, so every distinct BBMD network is initially inferred as a <strong>/24</strong> for you to review and correct.
      </p>

      <label class="bbmd-state-file-picker">
        <span>State-store file</span>
        <input type="file" accept=".state,application/json" @change="readBbmdStateFile">
      </label>

      <p v-if="bbmdStateError" class="bbmd-state-error" role="alert">{{ bbmdStateError }}</p>
      <div v-else-if="bbmdStatePreview" class="nmap-import-preview" aria-live="polite">
        <div class="nmap-import-summary">
          <span><strong>{{ bbmdStatePreview.records.length }}</strong> BBMD devices</span>
          <span><strong>{{ bbmdStateSubnetCount }}</strong> inferred /24 networks</span>
          <span><strong>{{ bbmdStatePreview.reciprocalBdtPairs }}</strong> mutual BDT pairs</span>
        </div>
        <div class="bbmd-state-findings">
          <p v-if="bbmdStatePreview.oneWayBdtEntries"><strong>{{ bbmdStatePreview.oneWayBdtEntries }}</strong> one-way BDT {{ bbmdStatePreview.oneWayBdtEntries === 1 ? 'entry' : 'entries' }} will be preserved and flagged in diagram diagnostics.</p>
          <p v-if="bbmdStatePreview.unresolvedBdtEntries"><strong>{{ bbmdStatePreview.unresolvedBdtEntries }}</strong> BDT {{ bbmdStatePreview.unresolvedBdtEntries === 1 ? 'target is' : 'targets are' }} not present as scanned BBMD records and cannot be linked.</p>
          <p v-if="bbmdStatePreview.ignoredRecords"><strong>{{ bbmdStatePreview.ignoredRecords }}</strong> malformed {{ bbmdStatePreview.ignoredRecords === 1 ? 'record was' : 'records were' }} ignored.</p>
          <p><strong>Review required:</strong> overlapping or incorrectly grouped devices should be corrected by editing the imported network addresses and prefixes.</p>
        </div>
      </div>
      <p v-else class="nmap-import-empty">Choose a state-store file to preview its BBMD and BDT topology.</p>

      <div class="pdf-export-dialog-actions">
        <AppButton @click="bbmdStateDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!bbmdStatePreview?.records.length" @click="importBbmdState">Replace diagram with imported topology</AppButton>
      </div>
    </dialog>

    <dialog ref="moveDeviceDialog" class="pdf-export-dialog move-device-dialog" aria-labelledby="move-device-title">
      <div class="pdf-export-dialog-header">
        <div>
          <p class="eyebrow">REASSIGN DEVICE</p>
          <h3 id="move-device-title">Move {{ movingDevice?.name || 'device' }} to another subnet</h3>
        </div>
        <button class="pdf-dialog-close" type="button" aria-label="Close move-device dialog" @click="moveDeviceDialog?.close()">×</button>
      </div>
      <p class="pdf-export-description">The complete device configuration, relationships, and IDs will be preserved. Addresses assigned to the current owner subnet will follow the device; their IP values will not be changed.</p>
      <div class="form-group">
        <label for="move-device-target">Destination subnet</label>
        <select id="move-device-target" v-model="moveTargetSubnetId">
          <option v-for="target in moveTargetSubnets" :key="target.id" :value="target.id">{{ target.name || 'Unnamed subnet' }} — {{ subnetCidr(target) }}</option>
        </select>
        <span class="field-hint">If an existing address falls outside the destination prefix, the diagram will flag it for correction.</span>
      </div>
      <div class="pdf-export-dialog-actions">
        <AppButton @click="moveDeviceDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" :disabled="!moveTargetSubnetId" @click="confirmMoveDevice">Move device</AppButton>
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
      <div v-if="bbmdReport.devices.length" class="pdf-bbmd-option">
        <AceToggle v-model="includeBbmdTablesInPdf" label="Include BBMD table pages" :description="`Add a peering summary and individual BDT sections for ${bbmdReport.devices.length} BBMD ${bbmdReport.devices.length === 1 ? 'device' : 'devices'}`" />
        <span>Table pages use a compact, paginated schedule so large BBMD estates remain readable even when diagram edges are hidden.</span>
      </div>
      <div class="pdf-export-dialog-actions">
        <AppButton @click="pdfExportDialog?.close()">Cancel</AppButton>
        <AppButton variant="primary" @click="confirmPdfExport">Export PDF</AppButton>
      </div>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import AppButton from './AppButton.vue';
import AceToggle from './AceToggle.vue';
import AceCheckbox from './AceCheckbox.vue';
import GlossaryLink from './GlossaryLink.vue';
import { getSubnetDetails, ipToLong } from '../lib/subnet';
import {
  groupNmapHostsBySubnet, isNmapGatewayHost, nmapHostName, parseNmapOutput, type NmapHost, type NmapSubnetGroup
} from '../lib/nmap-import';
import { createDiagramProjectFromAceBbmdState, parseAceBbmdState, type AceBbmdStateImport } from '../lib/ace-bbmd-state';
import { groupDiagramDiagnostics } from '../lib/diagram-diagnostics';
import { bbmdRelationshipClass, createBbmdReport } from '../lib/bbmd-report';
import { appendBbmdReportPages } from '../lib/export-bbmd-pdf';
import {
  addressState, createDefaultProject, createDevice, createDeviceAddress, createEmptyProject, createInfrastructure, createNic, createSubnet,
  createTestPath, getDiagramDiagnostics, getWhoIsSuggestedBroadcast, isDiagramProject, moveDeviceToSubnet, normalizeDiagramProject, subnetCidr,
  type DeviceKind, type DiagramDevice, type DiagramDeviceAddress, type DiagramInfrastructure, type DiagramNic,
  type DiagramProject, type DiagramSubnet, type DiagramTestPath
} from '../lib/network-diagram';

const STORAGE_KEY = 'aceiot-network-diagram-v1';
const LAYOUT_STORAGE_KEY = 'aceiot-network-diagram-layout-v1';
const RELATIONSHIP_MODE_STORAGE_KEY = 'aceiot-network-diagram-relationship-view-v1';
const advancedBacnetPorts = inject<Ref<boolean>>('advancedBacnetPorts', ref(false));
const TOOL_URL = 'https://ace-iot-solutions.github.io/bacnet-subnetting-primer/';
const SVG_SC_LINK_STYLES = `.sc-service-link{fill:none;stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:8 6;opacity:.9}.sc-service-endpoint{fill:#2dd4bf;stroke:#121212;stroke-width:1}`;
const SVG_BACNET_RELATIONSHIP_STYLES = `.bdt-link{fill:none;stroke:#a78bfa;stroke-width:3;stroke-dasharray:10 5}.bdt-endpoint{fill:#a78bfa;stroke:#121212;stroke-width:1}.fdr-link{fill:none;stroke:#fb923c;stroke-width:2.75;stroke-dasharray:3 6}.fdr-endpoint{fill:#fb923c;stroke:#121212;stroke-width:1}.relationship-link-label{font:700 8px Inter,Arial,sans-serif;letter-spacing:.8px;paint-order:stroke;stroke:#121212;stroke-width:4px;stroke-linejoin:round}.relationship-link-label.bdt{fill:#c4b5fd}.relationship-link-label.fdr{fill:#fdba74}.host-relationship-focus .host-box{stroke:#f8fafc;stroke-width:3}.host-relationship-mutual .host-box{stroke:#a78bfa;stroke-width:3}.host-relationship-outbound .host-box{stroke:#38bdf8;stroke-width:3}.host-relationship-inbound .host-box{stroke:#f472b6;stroke-width:3}.host-relationship-fdr .host-box{stroke:#fb923c;stroke-width:3}.host-relationship-muted{opacity:.38}.host-relationship-badge{font:700 8px Inter,Arial,sans-serif;fill:#c4b5fd;letter-spacing:.7px}`;
const SVG_CONNECTION_STYLES = `.connection--routing{stroke:#64748b;stroke-width:2.5}.connection--bbmd{stroke:#94d8ff;stroke-width:2.75;stroke-dasharray:9 6}.connection--sc{stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:2 6}.connection--local{stroke:#a78bfa;stroke-width:2}.connection--routing-dot{fill:#64748b}.connection--bbmd-dot{fill:#94d8ff}.connection--sc-dot{fill:#2dd4bf}.connection--local-dot{fill:#a78bfa}`;
const SVG_EXPORT_STYLES = `.export-bg{fill:#121212}.export-title{font:700 24px Montserrat,Arial,sans-serif;fill:#f8fafc}.export-notes{font:13px Inter,Arial,sans-serif;fill:#94a3b8}.layer-label{font:700 8px Inter,Arial,sans-serif;fill:#475569;letter-spacing:1.5px}.connection{fill:none;stroke:#64748b;stroke-width:2;stroke-linejoin:round}.connection-dot{fill:#94a3b8}.infra-box{fill:#1e293b;stroke:#94d8ff;stroke-width:2}.infra-type{font:700 10px Inter,Arial,sans-serif;fill:#94d8ff;letter-spacing:1px}.infra-name{font:600 13px Inter,Arial,sans-serif;fill:#f8fafc}.infra-ip{font:11px monospace;fill:#94a3b8}.subnet-box{fill:#171722;stroke-width:2}.subnet-accent{fill:none;stroke-width:6;stroke-linecap:butt}.subnet-name{font:700 15px Inter,Arial,sans-serif;fill:#f8fafc}.subnet-address{font:12px monospace;fill:#cbd5e1}.subnet-meta{font:11px Inter,Arial,sans-serif;fill:#94a3b8}.device-icon{fill:#334155}.device-name{font:600 12px Inter,Arial,sans-serif;fill:#f8fafc}.device-kind{font:9px Inter,Arial,sans-serif;fill:#94a3b8;text-transform:uppercase}.footer-label{font:10px Inter,Arial,sans-serif;fill:#64748b}.node-category{font:700 9px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:1.2px}.host-box{fill:#252536;stroke:#64748b;stroke-width:1.5}.host-address-label{font:700 8px Inter,Arial,sans-serif;fill:#94a3b8}.host-address-summary{font:10px monospace;fill:#cbd5e1}.host-count-badge{fill:#0f3d39;stroke:#2dd4bf}.host-count-text{font:700 7px Inter,Arial,sans-serif;fill:#99f6e4}.address-link{fill:none;stroke-width:2}.address-endpoint{stroke:#121212;stroke-width:1}.test-path{fill:none;stroke-width:2.75;opacity:.78}.test-path.success{stroke:#14ae5c}.test-path.failure{stroke:#df1219;stroke-dasharray:8 6}.path-legend-bg{fill:#181820;stroke:#334155}.path-legend-bg.success{stroke:#14ae5c}.path-legend-bg.failure{stroke:#df1219}.path-legend-dot.success{fill:#14ae5c}.path-legend-dot.failure{fill:#df1219}.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}`;
const PDF_LIGHT_STYLES = `.export-bg{fill:#fff}.export-title,.infra-name,.subnet-name,.device-name,.path-legend-title{fill:#0f172a}.export-notes,.infra-ip,.subnet-meta,.device-kind,.host-address-label,.layer-label,.node-category,.path-route-label,.footer-label{fill:#475569}.connection{stroke:#64748b;stroke-width:2.25}.connection-dot{fill:#475569}.infra-box{fill:#fff;stroke:#0369a1;stroke-width:2.25}.infra-type{fill:#075985}.subnet-box{fill:#fff;stroke-width:2.25}.subnet-address,.host-address-summary,.path-route-text{fill:#0f172a}.host-box{fill:#fff;stroke:#64748b;stroke-width:1.75}.device-icon{fill:#e2e8f0;stroke:#cbd5e1}.ace-node-icon{fill:#0f766e}.address-endpoint,.bdt-endpoint,.fdr-endpoint{stroke:#fff}.relationship-link-label{stroke:#fff}.path-legend-bg{fill:#fff;stroke:#64748b}.path-result-badge.success{fill:#dcfce7}.path-result-badge.failure{fill:#fee2e2}.path-result-text.success{fill:#166534}.path-result-text.failure{fill:#991b1b}.layer-label{font-size:9px;fill:#475569}.node-category{font-size:9.5px}.infra-type{font-size:10.5px}.infra-name{font-size:13.5px}.infra-ip{font-size:11.5px}.subnet-name{font-size:15.5px}.subnet-address,.subnet-meta{font-size:11.5px}.device-name{font-size:13px}.device-kind{font-size:9.5px}.host-address-label{font-size:9px}.host-address-summary{font-size:11px}.host-count-text{font-size:7.5px}.path-route-label{font-size:9px}.path-route-text{font-size:10.5px}.footer-label{font-size:10.5px;fill:#334155}.ace-wordmark{fill:#0f172a}.solutions-wordmark{fill:#475569}`;
const SUBNET_ACCENT_EXPORT_STYLES = `.subnet-accent{fill:var(--subnet-accent-color);stroke:none}`;
const project = ref<DiagramProject>(createDefaultProject());
const fileInput = ref<HTMLInputElement | null>(null);
const diagramSvg = ref<SVGSVGElement | null>(null);
const gettingStartedDialog = ref<HTMLDialogElement | null>(null);
const nmapImportDialog = ref<HTMLDialogElement | null>(null);
const nmapOutput = ref('');
const nmapCidr = ref(24);
const nmapImportNotice = ref('');
const bbmdStateDialog = ref<HTMLDialogElement | null>(null);
const bbmdStatePreview = ref<AceBbmdStateImport | null>(null);
const bbmdStateError = ref('');
const moveDeviceDialog = ref<HTMLDialogElement | null>(null);
const movingDeviceId = ref('');
const moveSourceSubnetId = ref('');
const moveTargetSubnetId = ref('');
const pdfExportDialog = ref<HTMLDialogElement | null>(null);
const isExportingPdf = ref(false);
const pdfTheme = ref<'dark' | 'light'>('light');
const includeBbmdTablesInPdf = ref(false);
type DiagramLayoutMode = 'compact' | 'balanced' | 'wide';
type DiagramRelationshipMode = 'highlights' | 'focused' | 'all' | 'hidden';
type ConfigTargetKind = 'subnet' | 'device' | 'infrastructure' | 'path';
const layoutMode = ref<DiagramLayoutMode>('compact');
const relationshipMode = ref<DiagramRelationshipMode>('highlights');
const focusedBbmdId = ref('');
const activeConfigTarget = ref('');
let configTargetTimer: ReturnType<typeof window.setTimeout> | undefined;
const subnetWidth = 240;
const subnetHeight = 104;
const hostWidth = 280;
const hostGap = 12;
const layoutGap = 28;
const cidrOptions = Array.from({ length: 25 }, (_, index) => index + 8);
const mstpBaudRates = [9600, 19200, 38400, 76800, 115200];
const deviceKindOptions: { value: DeviceKind; label: string }[] = [
  { value: 'controller', label: 'Controller' }, { value: 'workstation', label: 'Workstation' },
  { value: 'server', label: 'Server' }, { value: 'sensor', label: 'Sensor / field device' }, { value: 'other', label: 'Other' }
];
const infrastructureKindOptions = [
  { value: 'router', label: 'Router' }, { value: 'switch', label: 'Switch' }, { value: 'firewall', label: 'Firewall' },
  { value: 'gateway', label: 'Gateway' },
  { value: 'sc-hub', label: 'BACnet/SC Hub' }, { value: 'sc-hub-cluster', label: 'BACnet/SC HA Hub Cluster' }
];
interface HostNode { device: DiagramDevice; ownerSubnet: DiagramSubnet }

const diagnostics = computed(() => getDiagramDiagnostics(project.value));
const diagnosticGroups = computed(() => groupDiagramDiagnostics(diagnostics.value));
const bbmdReport = computed(() => createBbmdReport(project.value));
const focusedBbmd = computed(() => bbmdReport.value.devices.find(device => device.id === focusedBbmdId.value));
const movingDevice = computed(() => project.value.subnets.flatMap(subnet => subnet.devices).find(device => device.id === movingDeviceId.value));
const moveTargetSubnets = computed(() => {
  const source = project.value.subnets.find(subnet => subnet.id === moveSourceSubnetId.value);
  return source ? movableSubnets(source) : [];
});
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
const bbmdStateSubnetCount = computed(() => new Set((bbmdStatePreview.value?.records ?? []).map(record => record.ip.split('.').slice(0, 3).join('.'))).size);
const ipSubnets = computed(() => project.value.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip'));
const routedNetworks = computed(() => project.value.subnets.filter(subnet => !subnet.networkType || subnet.networkType === 'bacnet-ip' || subnet.networkType === 'bacnet-sc'));
const fieldSegments = computed(() => project.value.subnets.filter(subnet => subnet.networkType === 'mstp' || subnet.networkType === 'arcnet'));
const hostNodes = computed(() => project.value.subnets.flatMap(ownerSubnet => ownerSubnet.devices
  .filter(device => project.value.viewMode !== 'networks' || device.requiredForRouting || device.kind === 'server' || device.bbmdEnabled || device.foreignDeviceBbmdId || project.value.subnets.some(segment => segment.routerId === device.id))
  .map(device => ({ device, ownerSubnet }))));
const hostHeight = computed(() => Math.max(110, 80 + Math.max(1, ...hostNodes.value.map(host => addressCount(host.device))) * 30));
const ipHostNodes = computed(() => hostNodes.value.filter(host => !host.ownerSubnet.networkType || host.ownerSubnet.networkType === 'bacnet-ip' || host.ownerSubnet.networkType === 'bacnet-sc'));
const fieldHostNodes = computed(() => hostNodes.value.filter(host => host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet'));
const hasBacnetRelationships = computed(() => hostNodes.value.some(host => (host.device.bdtPeerDeviceIds ?? []).length > 0 || Boolean(host.device.foreignDeviceBbmdId)));
const hasVisibleBacnetRelationships = computed(() => hasBacnetRelationships.value && (relationshipMode.value === 'focused' || relationshipMode.value === 'all'));
const layoutColumnLimit = computed(() => layoutMode.value === 'compact' ? 4 : layoutMode.value === 'balanced' ? 8 : Number.POSITIVE_INFINITY);
function columnCount(count: number) { return Math.max(1, Math.min(count || 1, layoutColumnLimit.value)); }
function rowCount(count: number) { return count ? Math.ceil(count / columnCount(count)) : 0; }
const infrastructureRows = computed(() => rowCount(project.value.infrastructure.length));
const routedNetworkRows = computed(() => rowCount(routedNetworks.value.length));
const ipHostRows = computed(() => rowCount(ipHostNodes.value.length));
const fieldNetworkRows = computed(() => rowCount(fieldSegments.value.length));
const fieldHostRows = computed(() => rowCount(fieldHostNodes.value.length));
const subnetY = computed(() => Math.max(210, 82 + infrastructureRows.value * 96 + 32));
const ipHostY = computed(() => subnetY.value + Math.max(1, routedNetworkRows.value) * (subnetHeight + layoutGap) + 42);
const fieldBusY = computed(() => ipHostY.value + Math.max(1, ipHostRows.value) * (hostHeight.value + layoutGap) + (hasVisibleBacnetRelationships.value ? 170 : 70));
const fieldHostY = computed(() => fieldBusY.value + Math.max(1, fieldNetworkRows.value) * (subnetHeight + layoutGap) + 42);
const ipHostLayerBottom = computed(() => ipHostY.value + ipHostRows.value * (hostHeight.value + layoutGap) - layoutGap);
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
function rowPixelWidth(count: number, itemWidth: number, gap: number) {
  const columns = columnCount(count);
  return columns * itemWidth + Math.max(0, columns - 1) * gap;
}
const canvasWidth = computed(() => Math.max(
  960,
  80 + rowPixelWidth(Math.max(routedNetworks.value.length, fieldSegments.value.length), subnetWidth, layoutGap),
  80 + rowPixelWidth(Math.max(ipHostNodes.value.length, fieldHostNodes.value.length), hostWidth, hostGap),
  80 + rowPixelWidth(project.value.infrastructure.length, 150, 40)
));
const legendColumns = computed(() => canvasWidth.value >= 1250 ? 2 : 1);
const legendCardWidth = computed(() => (canvasWidth.value - 80 - (legendColumns.value - 1) * 20) / legendColumns.value);
const legendTextLimit = computed(() => Math.max(32, Math.floor((legendCardWidth.value - 90) / 6.3)));
const legendRows = computed(() => Math.ceil(project.value.paths.length / legendColumns.value));
const legendStart = computed(() => fieldHostNodes.value.length
  ? fieldHostY.value + fieldHostRows.value * (hostHeight.value + layoutGap) + 47 + project.value.paths.length * 18
  : ipHostNodes.value.length
    ? ipHostY.value + ipHostRows.value * (hostHeight.value + layoutGap) + (hasVisibleBacnetRelationships.value ? 147 : 47) + project.value.paths.length * 18
    : subnetY.value + Math.max(1, routedNetworkRows.value) * (subnetHeight + layoutGap) + 40);
const canvasHeight = computed(() => Math.max(hostNodes.value.length ? 625 : 430, legendStart.value + legendRows.value * 124 + 42));

onMounted(() => {
  const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (savedLayout === 'compact' || savedLayout === 'balanced' || savedLayout === 'wide') layoutMode.value = savedLayout;
  const savedRelationshipMode = localStorage.getItem(RELATIONSHIP_MODE_STORAGE_KEY);
  if (savedRelationshipMode === 'highlights' || savedRelationshipMode === 'focused' || savedRelationshipMode === 'all' || savedRelationshipMode === 'hidden') relationshipMode.value = savedRelationshipMode;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (isDiagramProject(parsed)) project.value = normalizeDiagramProject(parsed);
    } catch { /* Ignore incomplete browser storage. */ }
  }
  window.addEventListener('ace-open-planned-diagram', loadPlannedDiagram);
});
onUnmounted(() => {
  window.removeEventListener('ace-open-planned-diagram', loadPlannedDiagram);
  if (configTargetTimer !== undefined) window.clearTimeout(configTargetTimer);
});

function loadPlannedDiagram() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (isDiagramProject(parsed)) project.value = normalizeDiagramProject(parsed);
  } catch { /* Ignore invalid bridge data. */ }
}

watch(project, value => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)), { deep: true });
watch(layoutMode, value => localStorage.setItem(LAYOUT_STORAGE_KEY, value));
watch(relationshipMode, value => localStorage.setItem(RELATIONSHIP_MODE_STORAGE_KEY, value));
watch(() => bbmdReport.value.devices.map(device => device.id).join('|'), () => {
  if (!bbmdReport.value.devices.some(device => device.id === focusedBbmdId.value)) focusedBbmdId.value = bbmdReport.value.devices[0]?.id ?? '';
}, { immediate: true });

async function focusConfig(kind: ConfigTargetKind, id: string) {
  const targetKey = `${kind}-${id}`;
  activeConfigTarget.value = targetKey;
  await nextTick();
  const target = document.getElementById(`config-${targetKey}`);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  target.focus({ preventScroll: true });
  if (configTargetTimer !== undefined) window.clearTimeout(configTargetTimer);
  configTargetTimer = window.setTimeout(() => {
    if (activeConfigTarget.value === targetKey) activeConfigTarget.value = '';
  }, 2200);
}
function activateHostNode(device: DiagramDevice) {
  if (device.bbmdEnabled) focusedBbmdId.value = device.id;
  void focusConfig('device', device.id);
}
function hostRelationshipClass(device: DiagramDevice) {
  if ((relationshipMode.value !== 'highlights' && relationshipMode.value !== 'focused') || !focusedBbmdId.value) return '';
  if (device.foreignDeviceBbmdId === focusedBbmdId.value) return 'host-relationship-fdr';
  if (!device.bbmdEnabled) return '';
  const bdtClass = bbmdRelationshipClass(bbmdReport.value, focusedBbmdId.value, device.id);
  if (bdtClass !== 'none') return `host-relationship-${bdtClass}`;
  return 'host-relationship-muted';
}
function hostRelationshipBadge(device: DiagramDevice) {
  const relationshipClass = hostRelationshipClass(device);
  return relationshipClass === 'host-relationship-focus' ? 'FOCUS'
    : relationshipClass === 'host-relationship-mutual' ? 'MUTUAL'
      : relationshipClass === 'host-relationship-outbound' ? 'OUTBOUND'
        : relationshipClass === 'host-relationship-inbound' ? 'INBOUND'
          : relationshipClass === 'host-relationship-fdr' ? 'FDR' : '';
}

function addSubnet() { project.value.subnets.push(createSubnet(project.value.subnets.length + 1)); }
function movableSubnets(source: DiagramSubnet) {
  const sourceType = normalizedNetworkType(source);
  return project.value.subnets.filter(candidate => candidate.id !== source.id && normalizedNetworkType(candidate) === sourceType);
}
function openMoveDeviceDialog(device: DiagramDevice, source: DiagramSubnet) {
  const targets = movableSubnets(source);
  if (!targets.length) return;
  movingDeviceId.value = device.id;
  moveSourceSubnetId.value = source.id;
  moveTargetSubnetId.value = targets[0].id;
  moveDeviceDialog.value?.showModal();
}
async function confirmMoveDevice() {
  const deviceId = movingDeviceId.value;
  if (!deviceId || !moveTargetSubnetId.value || !moveDeviceToSubnet(project.value, deviceId, moveTargetSubnetId.value)) return;
  moveDeviceDialog.value?.close();
  await focusConfig('device', deviceId);
}
function openBbmdStateDialog() {
  bbmdStatePreview.value = null;
  bbmdStateError.value = '';
  bbmdStateDialog.value?.showModal();
}
function openGettingStartedDialog() {
  gettingStartedDialog.value?.showModal();
}
function openBbmdImportFromGuide() {
  gettingStartedDialog.value?.close();
  openBbmdStateDialog();
}
function openNmapImportFromGuide() {
  gettingStartedDialog.value?.close();
  openNmapImportDialog();
}
async function readBbmdStateFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  bbmdStatePreview.value = null;
  bbmdStateError.value = '';
  if (!file) return;
  try {
    const parsedJson: unknown = JSON.parse(await file.text());
    const parsedState = parseAceBbmdState(parsedJson);
    if (!parsedState.records.length) throw new Error('No valid BBMD records were found.');
    bbmdStatePreview.value = parsedState;
  } catch (error) {
    bbmdStateError.value = error instanceof Error ? error.message : 'The selected file is not a valid ACE BBMD Manager state store.';
  } finally {
    input.value = '';
  }
}
function importBbmdState() {
  if (!bbmdStatePreview.value?.records.length) return;
  project.value = createDiagramProjectFromAceBbmdState(bbmdStatePreview.value);
  const importedCount = bbmdStatePreview.value.records.length;
  const subnetCount = project.value.subnets.length;
  nmapImportNotice.value = `Imported ${importedCount} device-level BBMD${importedCount === 1 ? '' : 's'} across ${subnetCount} inferred /24 ${subnetCount === 1 ? 'network' : 'networks'}. Review and correct subnet definitions where needed.`;
  bbmdStateDialog.value?.close();
}
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
  const removedDeviceIds = new Set(project.value.subnets.find(subnet => subnet.id === id)?.devices.map(device => device.id) ?? []);
  const removedEndpointIds = project.value.subnets.flatMap(subnet => subnet.devices.flatMap(device =>
    device.nics.flatMap(nic => nic.addresses.filter(address => subnet.id === id || address.subnetId === id).map(address => address.id))
  ));
  project.value.subnets = project.value.subnets.filter(subnet => subnet.id !== id);
  project.value.infrastructure.forEach(item => {
    item.subnetIds = item.subnetIds.filter(subnetId => subnetId !== id);
    item.underlaySubnetIds = (item.underlaySubnetIds ?? []).filter(subnetId => subnetId !== id);
  });
  project.value.subnets.forEach(subnet => subnet.devices.forEach(device => {
    device.bdtPeerDeviceIds = (device.bdtPeerDeviceIds ?? []).filter(peerId => !removedDeviceIds.has(peerId));
    if (removedDeviceIds.has(device.foreignDeviceBbmdId ?? '')) device.foreignDeviceBbmdId = '';
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
  project.value.subnets.forEach(owner => owner.devices.forEach(candidate => {
    candidate.bdtPeerDeviceIds = (candidate.bdtPeerDeviceIds ?? []).filter(peerId => peerId !== id);
    if (candidate.foreignDeviceBbmdId === id) candidate.foreignDeviceBbmdId = '';
  }));
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
function newProject() {
  if (!window.confirm('Clear the current diagram and start a new project? This replaces the browser autosave. Save the project first if you want to keep a copy.')) return;
  const emptyProject = createEmptyProject();
  project.value = emptyProject;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyProject));
  activeConfigTarget.value = '';
  nmapImportNotice.value = '';
}
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
function bbmdDeviceEntries() {
  return project.value.subnets.flatMap(subnet => subnet.devices.filter(device => device.bbmdEnabled).map(device => ({ device, subnet })));
}
function otherBbmdDevices(device: DiagramDevice, subnetId: string) {
  return bbmdDeviceEntries().filter(entry => entry.device.id !== device.id && entry.subnet.id !== subnetId);
}
function foreignBbmdOptions(device: DiagramDevice, subnetId: string) {
  return bbmdDeviceEntries().filter(entry => entry.device.id !== device.id && entry.subnet.id !== subnetId);
}
function isBdtPeer(device: DiagramDevice, peerId: string) { return (device.bdtPeerDeviceIds ?? []).includes(peerId); }
function toggleBdtPeer(device: DiagramDevice, peerId: string) {
  const peer = project.value.subnets.flatMap(subnet => subnet.devices).find(candidate => candidate.id === peerId && candidate.bbmdEnabled);
  if (!peer) return;
  device.bdtPeerDeviceIds ??= [];
  peer.bdtPeerDeviceIds ??= [];
  const enabled = !device.bdtPeerDeviceIds.includes(peerId);
  device.bdtPeerDeviceIds = enabled ? [...device.bdtPeerDeviceIds, peerId] : device.bdtPeerDeviceIds.filter(id => id !== peerId);
  peer.bdtPeerDeviceIds = enabled ? [...new Set([...peer.bdtPeerDeviceIds, device.id])] : peer.bdtPeerDeviceIds.filter(id => id !== device.id);
}
function setDeviceBbmd(device: DiagramDevice, enabled: boolean) {
  device.bbmdEnabled = enabled;
  device.bdtPeerDeviceIds ??= [];
  if (enabled) return;
  device.bdtPeerDeviceIds = [];
  project.value.subnets.forEach(subnet => subnet.devices.forEach(candidate => {
    candidate.bdtPeerDeviceIds = (candidate.bdtPeerDeviceIds ?? []).filter(id => id !== device.id);
    if (candidate.foreignDeviceBbmdId === device.id) candidate.foreignDeviceBbmdId = '';
  }));
}
function scHubsForNic(currentNic: DiagramNic) {
  const infrastructure = project.value.infrastructure.filter(item => item.kind === 'sc-hub' || item.kind === 'sc-hub-cluster').map(item => ({ id: item.id, name: item.name, label: item.kind === 'sc-hub-cluster' ? 'HA infrastructure hub' : 'infrastructure hub' }));
  const deviceHubs = hostNodes.value.flatMap(host => host.device.nics.filter(nic => nic.id !== currentNic.id && nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub')).map(nic => ({ id: nic.id, name: `${host.device.name} · ${nic.name}`, label: nic.scHubRole === 'ha-hub' ? 'device HA hub' : 'device hub' })));
  return [...infrastructure, ...deviceHubs];
}
function deviceServiceLabel(device: DiagramDevice) {
  const hasIp = device.nics.some(nic => nic.bacnetIpEnabled);
  const hasSc = device.nics.some(nic => nic.bacnetScEnabled);
  const hasHub = device.nics.some(nic => nic.bacnetScEnabled && (nic.scHubRole === 'hub' || nic.scHubRole === 'ha-hub'));
  return device.bbmdEnabled
    ? device.requiredForRouting ? 'BACNET ROUTER / BBMD' : device.kind === 'server' ? 'BMS / BBMD' : 'BACNET/IP BBMD'
    : device.foreignDeviceBbmdId ? 'BACNET/IP FOREIGN DEVICE'
      : hasHub ? 'BACNET/SC HUB' : hasIp && hasSc ? 'BACNET/IP + SC' : hasSc ? 'BACNET/SC NODE' : hasIp ? 'BACNET/IP HOST' : 'IP HOST';
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
function gridPoint(index: number, count: number, itemWidth: number, gap: number, startY: number, rowHeight: number) {
  const columns = columnCount(count);
  const row = Math.floor(Math.max(0, index) / columns);
  const column = Math.max(0, index) % columns;
  const itemsInRow = Math.min(columns, Math.max(0, count - row * columns));
  const rowWidth = itemsInRow * itemWidth + Math.max(0, itemsInRow - 1) * gap;
  return {
    x: (canvasWidth.value - rowWidth) / 2 + column * (itemWidth + gap),
    y: startY + row * rowHeight
  };
}
function networkX(subnet: DiagramSubnet) {
  const row = subnet.networkType === 'mstp' || subnet.networkType === 'arcnet' ? fieldSegments.value : routedNetworks.value;
  return gridPoint(row.findIndex(item => item.id === subnet.id), row.length, subnetWidth, layoutGap, 0, 0).x;
}
function networkY(subnet: DiagramSubnet) {
  const isFieldNetwork = subnet.networkType === 'mstp' || subnet.networkType === 'arcnet';
  const row = isFieldNetwork ? fieldSegments.value : routedNetworks.value;
  return gridPoint(
    row.findIndex(item => item.id === subnet.id),
    row.length,
    subnetWidth,
    layoutGap,
    isFieldNetwork ? fieldBusY.value : subnetY.value,
    subnetHeight + layoutGap
  ).y;
}
function networkCenter(id: string) { const subnet = project.value.subnets.find(item => item.id === id); return subnet ? networkX(subnet) + subnetWidth / 2 : 0; }
function subnetCenter(id: string) { return networkCenter(id); }
function hostRow(host: HostNode) { return host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet' ? fieldHostNodes.value : ipHostNodes.value; }
function hostX(host: HostNode, fallbackIndex = 0) {
  const row = hostRow(host);
  const index = row.findIndex(item => item.device.id === host.device.id);
  const resolvedIndex = index < 0 ? fallbackIndex : index;
  return gridPoint(resolvedIndex, row.length, hostWidth, hostGap, 0, 0).x;
}
function hostYFor(host: HostNode) {
  const row = hostRow(host);
  const index = row.findIndex(item => item.device.id === host.device.id);
  const isFieldHost = host.ownerSubnet.networkType === 'mstp' || host.ownerSubnet.networkType === 'arcnet';
  return gridPoint(index, row.length, hostWidth, hostGap, isFieldHost ? fieldHostY.value : ipHostY.value, hostHeight.value + layoutGap).y;
}
function routingDevicesFor(segment: DiagramSubnet) {
  return hostNodes.value.flatMap(host => host.device.nics.flatMap(nic => nic.addresses
    .filter(address => address.subnetId === segment.upstreamSubnetId)
    .map(address => ({ id: host.device.id, name: host.device.name || 'Unnamed device', ip: address.ip }))));
}
function infrastructureX(index: number) { return gridPoint(index, project.value.infrastructure.length, 150, 40, 82, 96).x + 75; }
function infrastructureY(index: number) { return gridPoint(index, project.value.infrastructure.length, 150, 40, 82, 96).y; }
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
function connectionTargetY(subnetId: string) {
  const subnet = project.value.subnets.find(candidate => candidate.id === subnetId);
  return subnet ? networkY(subnet) : subnetY.value;
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
  const startY = infrastructureY(index) + 72;
  const endX = connectionTargetX(itemId, subnetId);
  const target = project.value.subnets.find(candidate => candidate.id === subnetId);
  const endY = target ? networkY(target) : subnetY.value;
  const bend = Math.max(24, (endY - startY) / 2);
  return `M ${startX} ${startY} C ${startX} ${startY + bend}, ${endX} ${endY - bend}, ${endX} ${endY}`;
}
function fieldBusRoutePath(segment: DiagramSubnet) {
  if (!segment.upstreamSubnetId) return '';
  const routerHost = ipHostNodes.value.find(host => host.device.id === segment.routerId);
  const startX = routerHost ? hostX(routerHost) + hostWidth / 2 : networkCenter(segment.upstreamSubnetId);
  const upstream = project.value.subnets.find(candidate => candidate.id === segment.upstreamSubnetId);
  const startY = routerHost ? hostYFor(routerHost) + hostHeight.value : upstream ? networkY(upstream) + subnetHeight : subnetY.value + subnetHeight;
  const endX = networkCenter(segment.id);
  const endY = networkY(segment);
  const laneY = fieldBusY.value - 28;
  return `M ${startX} ${startY} L ${startX} ${laneY} L ${endX} ${laneY} L ${endX} ${endY}`;
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
    targetY = infrastructureY(infrastructureIndex) + 72;
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

function deviceRelationshipPoint(deviceId: string, offset = 0): DiagramPoint | null {
  const hostIndex = hostNodes.value.findIndex(host => host.device.id === deviceId);
  if (hostIndex < 0) return null;
  const host = hostNodes.value[hostIndex];
  return { x: hostX(host, hostIndex) + hostWidth / 2 + offset, y: hostYFor(host) + hostHeight.value };
}

const bdtLinks = computed(() => {
  const seen = new Set<string>();
  return hostNodes.value.flatMap((host, relationshipIndex) => (host.device.bdtPeerDeviceIds ?? []).flatMap(peerId => {
    const pair = [host.device.id, peerId].sort();
    const peer = hostNodes.value.find(candidate => candidate.device.id === peerId && candidate.device.bbmdEnabled);
    const mutual = peer?.device.bdtPeerDeviceIds?.includes(host.device.id) ?? false;
    const id = mutual ? `bdt-${pair.join('-')}` : `bdt-${host.device.id}-${peerId}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const start = deviceRelationshipPoint(host.device.id, -12);
    const end = deviceRelationshipPoint(peerId, -12);
    if (!peer || !start || !end) return [];
    const depth = Math.max(start.y, end.y, ipHostLayerBottom.value) + 48 + (relationshipIndex % 4) * 14;
    return [{
      id,
      sourceId: host.device.id,
      targetId: peerId,
      mutual,
      label: mutual ? `Mutual BDT · ${host.device.name} ↔ ${peer.device.name}` : `BDT entry · ${host.device.name} → ${peer.device.name}`,
      path: `M ${start.x} ${start.y} C ${start.x} ${depth}, ${end.x} ${depth}, ${end.x} ${end.y}`,
      startX: start.x, startY: start.y, endX: end.x, endY: end.y,
      labelX: (start.x + end.x) / 2, labelY: depth - 5
    }];
  }));
});

const fdrLinks = computed(() => hostNodes.value.flatMap((host, relationshipIndex) => {
  const targetId = host.device.foreignDeviceBbmdId;
  if (!targetId) return [];
  const target = hostNodes.value.find(candidate => candidate.device.id === targetId && candidate.device.bbmdEnabled);
  const start = deviceRelationshipPoint(host.device.id, 12);
  const end = deviceRelationshipPoint(targetId, 12);
  if (!target || !start || !end) return [];
  const depth = Math.max(start.y, end.y, ipHostLayerBottom.value) + 104 + (relationshipIndex % 3) * 14;
  return [{
    id: `fdr-${host.device.id}-${targetId}`,
    sourceId: host.device.id,
    targetId,
    label: `Foreign Device Registration · ${host.device.name} → ${target.device.name}`,
    path: `M ${start.x} ${start.y} C ${start.x} ${depth}, ${end.x} ${depth}, ${end.x} ${end.y}`,
    startX: start.x, startY: start.y, endX: end.x, endY: end.y,
    labelX: (start.x + end.x) / 2, labelY: depth - 5
  }];
}));

const displayedBdtLinks = computed(() => {
  if (relationshipMode.value === 'all') return bdtLinks.value;
  if (relationshipMode.value !== 'focused' || !focusedBbmdId.value) return [];
  return bdtLinks.value.filter(link => link.sourceId === focusedBbmdId.value || link.targetId === focusedBbmdId.value);
});
const displayedFdrLinks = computed(() => {
  if (relationshipMode.value === 'all') return fdrLinks.value;
  if (relationshipMode.value !== 'focused' || !focusedBbmdId.value) return [];
  return fdrLinks.value.filter(link => link.sourceId === focusedBbmdId.value || link.targetId === focusedBbmdId.value);
});

function endpointPoint(endpointId: string): DiagramPoint | null {
  const infrastructureIndex = project.value.infrastructure.findIndex(item => item.id === endpointId);
  if (infrastructureIndex >= 0) return { x: infrastructureX(infrastructureIndex), y: infrastructureY(infrastructureIndex) + 72 };
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
  style.textContent = `${SVG_EXPORT_STYLES}${SVG_SC_LINK_STYLES}${SVG_BACNET_RELATIONSHIP_STYLES}${SVG_CONNECTION_STYLES}${theme === 'light' ? PDF_LIGHT_STYLES : ''}${SUBNET_ACCENT_EXPORT_STYLES}`;
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
    if (includeBbmdTablesInPdf.value) {
      appendBbmdReportPages(pdf, bbmdReport.value, {
        projectTitle: project.value.title || 'Untitled BACnet Network',
        theme: pdfTheme.value
      });
    }
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
    window.alert('That file is not a valid BACnet Studio diagram project.');
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
.bdt-link{fill:none;stroke:#a78bfa;stroke-width:3;stroke-dasharray:10 5}.bdt-endpoint{fill:#a78bfa;stroke:#121212;stroke-width:1}.fdr-link{fill:none;stroke:#fb923c;stroke-width:2.75;stroke-dasharray:3 6}.fdr-endpoint{fill:#fb923c;stroke:#121212;stroke-width:1}.relationship-link-label{font:700 8px Inter,Arial,sans-serif;letter-spacing:.8px;paint-order:stroke;stroke:#121212;stroke-width:4px;stroke-linejoin:round}.relationship-link-label.bdt{fill:#c4b5fd}.relationship-link-label.fdr{fill:#fdba74}
.sc-service-link{fill:none;stroke:#2dd4bf;stroke-width:2.5;stroke-dasharray:8 6;opacity:.9}.sc-service-endpoint{fill:#2dd4bf;stroke:#121212;stroke-width:1}
.path-legend-title{font:700 10px Inter,Arial,sans-serif;fill:#f8fafc}.path-result-badge.success{fill:#0d3823;stroke:#14ae5c}.path-result-badge.failure{fill:#3d1719;stroke:#df1219}.path-result-text{font:700 8px Inter,Arial,sans-serif}.path-result-text.success{fill:#86efac}.path-result-text.failure{fill:#fca5a5}.path-route-label{font:700 8px Inter,Arial,sans-serif;fill:#64748b;letter-spacing:.6px}.path-route-text{font:10px monospace;fill:#cbd5e1}
</style>
