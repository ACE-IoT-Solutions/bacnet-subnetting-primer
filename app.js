/**
 * BACnet Subnet & Network Calculator Application
 * Coordinates DOM bindings, calculator calculations, SVG animations,
 * and primer page interactive behaviors.
 */

import {
  ipToLong,
  longToIp,
  cidrToMask,
  maskToCidr,
  validateMaskString,
  getSubnetDetails,
  analyzeRelationship,
  toBinaryString
} from './calculator.js';

// DOM Cache
const dom = {
  // Tabs
  tabBtnCalculator: document.getElementById('tab-btn-calculator'),
  tabBtnPrimer: document.getElementById('tab-btn-primer'),
  pageCalculator: document.getElementById('page-calculator'),
  pagePrimer: document.getElementById('page-primer'),

  // Inputs
  presetSelect: document.getElementById('preset-select'),
  devAIp: document.getElementById('devA-ip'),
  devAMask: document.getElementById('devA-mask'),
  devACidr: document.getElementById('devA-cidr'),
  devBIp: document.getElementById('devB-ip'),
  devBMask: document.getElementById('devB-mask'),
  devBCidr: document.getElementById('devB-cidr'),

  // Device A Outputs
  resAMask: document.getElementById('resA-mask'),
  resACidrVal: document.getElementById('resA-cidr-val'),
  resAMaskBinary: document.getElementById('resA-mask-binary'),
  resANet: document.getElementById('resA-net'),
  resABcast: document.getElementById('resA-bcast'),
  resARange: document.getElementById('resA-range'),
  resAHosts: document.getElementById('resA-hosts'),

  // Device B Outputs
  resBMask: document.getElementById('resB-mask'),
  resBCidrVal: document.getElementById('resB-cidr-val'),
  resBMaskBinary: document.getElementById('resB-mask-binary'),
  resBNet: document.getElementById('resB-net'),
  resBBcast: document.getElementById('resB-bcast'),
  resBRange: document.getElementById('resB-range'),
  resBHosts: document.getElementById('resB-hosts'),

  // Verdict box
  verdictBox: document.getElementById('verdict-box'),
  verdictIcon: document.getElementById('verdict-icon'),
  verdictTitle: document.getElementById('verdict-title'),
  verdictBody: document.getElementById('verdict-body'),

  // Simulator Nodes (SVG)
  simSvg: document.getElementById('calc-sim-svg'),
  simIpA: document.getElementById('sim-ip-A'),
  simMaskA: document.getElementById('sim-mask-A'),
  simIpB: document.getElementById('sim-ip-B'),
  simMaskB: document.getElementById('sim-mask-B'),
  simSwALabel: document.getElementById('sim-swA-label'),
  simNodeSwB: document.getElementById('sim-node-swB'),
  simNodeRouter: document.getElementById('sim-node-router'),
  bbmdConfigPanel: document.getElementById('bbmd-config-panel'),
  bbmdAIp: document.getElementById('bbmd-a-ip'),
  bbmdBIp: document.getElementById('bbmd-b-ip'),
  simBbmdA: document.getElementById('sim-bbmd-a'),
  simBbmdB: document.getElementById('sim-bbmd-b'),
  simBbmdAIpLbl: document.getElementById('sim-bbmd-a-ip-lbl'),
  simBbmdBIpLbl: document.getElementById('sim-bbmd-b-ip-lbl'),
  wireSwaToBbmda: document.getElementById('wire-swa-to-bbmda'),
  wireSwbToBbmdb: document.getElementById('wire-swb-to-bbmdb'),
  
  // Wires (SVG)
  wireAToSwA: document.getElementById('wire-a-to-swA'),
  wireBToSwA: document.getElementById('wire-b-to-swA'),
  wireBToSwB: document.getElementById('wire-b-to-swB'),
  wireSwAToRouter: document.getElementById('wire-swA-to-router'),
  wireSwBToRouter: document.getElementById('wire-swB-to-router'),


  // Simulator Actions & Console
  btnSimBcastA: document.getElementById('btn-sim-bcast-a'),
  btnSimBcastB: document.getElementById('btn-sim-bcast-b'),
  btnSimUnicastAB: document.getElementById('btn-sim-unicast-a-b'),
  btnSimUnicastBA: document.getElementById('btn-sim-unicast-b-a'),
  bbmdEnableChk: document.getElementById('bbmd-enable-chk'),
  lblBbmdEnable: document.getElementById('lbl-bbmd-enable'),
  bcastIamChk: document.getElementById('bcast-iam-chk'),
  btnClearConsole: document.getElementById('btn-clear-console'),
  terminalLog: document.getElementById('terminal-log'),

  // OSI Primer Elements
  btnOsiIpLocalUc: document.getElementById('btn-osi-ip-local-uc'),
  btnOsiIpRoutedUc: document.getElementById('btn-osi-ip-routed-uc'),
  btnOsiIpBbmdTunnel: document.getElementById('btn-osi-ip-bbmd-tunnel'),
  btnOsiEth: document.getElementById('btn-osi-eth'),
  osiPacketViewer: document.getElementById('osi-packet-viewer'),

  // BBMD Primer Elements
  btnBbmdOff: document.getElementById('btn-bbmd-off'),
  btnBbmdOn: document.getElementById('btn-bbmd-on'),
  bbmdSvg: document.getElementById('bbmd-svg'),

  // Splitter Elements
  splitIp: document.getElementById('split-ip'),
  splitCidr: document.getElementById('split-cidr'),
  splitCidrLbl: document.getElementById('split-cidr-lbl'),
  splitResMask: document.getElementById('split-res-mask'),
  splitResNet: document.getElementById('split-res-net'),
  splitResBcast: document.getElementById('split-res-bcast'),
  binaryBitStream: document.getElementById('binary-bit-stream'),
  splitTextExplanation: document.getElementById('split-text-explanation'),
  traceDstIp: document.getElementById('trace-dst-ip'),
  traceGwIp: document.getElementById('trace-gw-ip'),
  routingDecisionSteps: document.getElementById('routing-decision-steps')
};

// Global variables for calculated results
let state = {
  devA: null,
  devB: null,
  relation: null,
  isAnimating: false
};

// Node Coordinates in Simulator SVG (x, y)
const coords = {
  devA: { x: 100, y: 152 },
  devB: { x: 700, y: 152 },
  swA: { x: 320, y: 220 },
  swB: { x: 480, y: 220 },
  router: { x: 400, y: 100 },
  bbmd1: { x: 100, y: 90 }, // Visual offset for BBMD
  bbmd2: { x: 700, y: 90 }
};

// Coords for BBMD Primer SVG
const bbmdCoords = {
  devA: { x: 87, y: 93 },
  bbmd1: { x: 87, y: 183 },
  sw1: { x: 205, y: 138 },
  router: { x: 350, y: 138 },
  sw2: { x: 495, y: 138 },
  bbmd2: { x: 612, y: 183 },
  devB: { x: 612, y: 93 }
};

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
  populateCidrDropdowns();
  setupEventListeners();
  loadPreset(dom.presetSelect.value);
  selectOsiTab('ip-local-uc');
  updateBitSplitter();
});

// Populate CIDR drop-downs
function populateCidrDropdowns() {
  const options = [];
  for (let i = 30; i >= 8; i--) {
    options.push(`<option value="${i}">/${i}</option>`);
  }
  dom.devACidr.innerHTML = options.join('');
  dom.devBCidr.innerHTML = options.join('');
}

// Event handlers registry
function setupEventListeners() {
  // Tab switches
  dom.tabBtnCalculator.addEventListener('click', () => switchTab('calculator'));
  dom.tabBtnPrimer.addEventListener('click', () => switchTab('primer'));

  // Input changes
  dom.devAIp.addEventListener('input', () => handleInputChange('devA'));
  dom.devBIp.addEventListener('input', () => handleInputChange('devB'));
  
  dom.devAMask.addEventListener('input', () => handleMaskStringChange('devA'));
  dom.devBMask.addEventListener('input', () => handleMaskStringChange('devB'));

  dom.devACidr.addEventListener('change', () => handleCidrSelectChange('devA'));
  dom.devBCidr.addEventListener('change', () => handleCidrSelectChange('devB'));

  // Preset Select
  dom.presetSelect.addEventListener('change', (e) => loadPreset(e.target.value));

  // Console Clear
  dom.btnClearConsole.addEventListener('click', () => {
    dom.terminalLog.innerHTML = `<div class="terminal-line system"><span class="timestamp">${getTimestamp()}</span>[System] Console cleared. Ready.</div>`;
  });

  // Simulator Triggers
  dom.btnSimBcastA.addEventListener('click', () => triggerSimulation('bcast-a'));
  dom.btnSimBcastB.addEventListener('click', () => triggerSimulation('bcast-b'));
  dom.btnSimUnicastAB.addEventListener('click', () => triggerSimulation('unicast-a-b'));
  dom.btnSimUnicastBA.addEventListener('click', () => triggerSimulation('unicast-b-a'));
  dom.bbmdEnableChk.addEventListener('change', () => calculateAndRepaint());

  // Primer OSI toggle
  dom.btnOsiIpLocalUc.addEventListener('click', () => selectOsiTab('ip-local-uc'));
  dom.btnOsiIpRoutedUc.addEventListener('click', () => selectOsiTab('ip-routed-uc'));
  dom.btnOsiIpBbmdTunnel.addEventListener('click', () => selectOsiTab('ip-bbmd-tunnel'));
  dom.btnOsiEth.addEventListener('click', () => selectOsiTab('eth'));

  // Primer BBMD simulation buttons
  dom.btnBbmdOff.addEventListener('click', () => runPrimerBbmdflow(false));
  dom.btnBbmdOn.addEventListener('click', () => runPrimerBbmdflow(true));

  // Splitter events
  dom.splitIp.addEventListener('input', updateBitSplitter);
  dom.splitCidr.addEventListener('input', updateBitSplitter);
  dom.traceDstIp.addEventListener('input', updateRoutingTrace);
  dom.traceGwIp.addEventListener('input', updateRoutingTrace);

  // BBMD Config events
  dom.bbmdAIp.addEventListener('input', () => calculateAndRepaint());
  dom.bbmdBIp.addEventListener('input', () => calculateAndRepaint());

  // Bind input listeners to BDT entry slot inputs
  document.querySelectorAll('.bdt-entry-a, .bdt-entry-b').forEach(input => {
    input.addEventListener('input', () => calculateAndRepaint());
  });
}

// Switch between App Tabs
function switchTab(target) {
  if (target === 'calculator') {
    dom.tabBtnCalculator.classList.add('active');
    dom.tabBtnPrimer.classList.remove('active');
    dom.pageCalculator.classList.add('active');
    dom.pagePrimer.classList.remove('active');
  } else {
    dom.tabBtnCalculator.classList.remove('active');
    dom.tabBtnPrimer.classList.add('active');
    dom.pageCalculator.classList.remove('active');
    dom.pagePrimer.classList.add('active');
  }
}

// Presets loader
function loadPreset(presetName) {
  let config = {};
  switch (presetName) {
    case 'same-subnet':
      config = {
        aIp: '192.168.1.10', aCidr: 24,
        bIp: '192.168.1.20', bCidr: 24
      };
      break;
    case 'isolated-subnets':
      config = {
        aIp: '192.168.1.10', aCidr: 24,
        bIp: '192.168.2.10', bCidr: 24
      };
      break;
    case 'overlapping-asym':
      config = {
        aIp: '192.168.1.10', aCidr: 24,
        bIp: '192.168.0.10', bCidr: 23
      };
      break;
    case 'direct-trap':
    default:
      config = {
        aIp: '192.168.0.5', aCidr: 23,
        bIp: '192.168.1.6', bCidr: 24
      };
      break;
  }

  dom.devAIp.value = config.aIp;
  dom.devACidr.value = config.aCidr;
  dom.devAMask.value = longToIp(cidrToMask(config.aCidr));

  dom.devBIp.value = config.bIp;
  dom.devBCidr.value = config.bCidr;
  dom.devBMask.value = longToIp(cidrToMask(config.bCidr));

  // Set default BBMDs and BDTs depending on preset subnets
  if (presetName === 'isolated-subnets') {
    dom.bbmdAIp.value = '192.168.1.99';
    dom.bbmdBIp.value = '192.168.2.99';
    
    const slotsA = document.querySelectorAll('.bdt-entry-a');
    if (slotsA.length >= 2) {
      slotsA[0].value = '192.168.1.99';
      slotsA[1].value = '192.168.2.99';
      if (slotsA[2]) slotsA[2].value = '';
    }
    
    const slotsB = document.querySelectorAll('.bdt-entry-b');
    if (slotsB.length >= 2) {
      slotsB[0].value = '192.168.1.99';
      slotsB[1].value = '192.168.2.99';
      if (slotsB[2]) slotsB[2].value = '';
    }
  }

  // Remove validation errors
  dom.devAIp.classList.remove('input-error');
  dom.devAMask.classList.remove('input-error');
  dom.devBIp.classList.remove('input-error');
  dom.devBMask.classList.remove('input-error');

  calculateAndRepaint();
  logToConsole(`Loaded preset: ${dom.presetSelect.options[dom.presetSelect.selectedIndex].text}`, 'system');
}

// Input Change Handlers
function handleInputChange(device) {
  const ipField = device === 'devA' ? dom.devAIp : dom.devBIp;
  const ipStr = ipField.value;

  if (ipToLong(ipStr) === null) {
    ipField.style.borderColor = 'var(--error)';
  } else {
    ipField.style.borderColor = '';
    calculateAndRepaint();
  }
}

function handleMaskStringChange(device) {
  const maskField = device === 'devA' ? dom.devAMask : dom.devBMask;
  const cidrField = device === 'devA' ? dom.devACidr : dom.devBCidr;
  const maskStr = maskField.value;

  if (!validateMaskString(maskStr)) {
    maskField.style.borderColor = 'var(--error)';
  } else {
    maskField.style.borderColor = '';
    const long = ipToLong(maskStr);
    const cidr = maskToCidr(long);
    cidrField.value = cidr;
    calculateAndRepaint();
  }
}

function handleCidrSelectChange(device) {
  const maskField = device === 'devA' ? dom.devAMask : dom.devBMask;
  const cidrField = device === 'devA' ? dom.devACidr : dom.devBCidr;
  
  const cidr = parseInt(cidrField.value, 10);
  const maskStr = longToIp(cidrToMask(cidr));
  maskField.value = maskStr;
  maskField.style.borderColor = '';
  calculateAndRepaint();
}

// Core calculation and interface updates
function calculateAndRepaint() {
  const ipA = dom.devAIp.value;
  const maskA = dom.devAMask.value;
  const ipB = dom.devBIp.value;
  const maskB = dom.devBMask.value;

  // Perform Calculations
  state.devA = getSubnetDetails(ipA, maskA);
  state.devB = getSubnetDetails(ipB, maskB);

  if (!state.devA || !state.devB) {
    return; // Stop rendering if inputs are actively invalid
  }

  state.relation = analyzeRelationship(state.devA, state.devB);

  // Update UI Elements
  updateResultsCard();
  updateVerdictCard();
  updateSimulatorTopology();
}

// Write details to output table
function updateResultsCard() {
  // Device A
  dom.resACidrVal.textContent = state.devA.cidr;
  dom.resAMask.innerHTML = `${state.devA.mask} (/${state.devA.cidr}) <span class="binary">${formatBinaryMask(state.devA.maskLong, state.devA.cidr)}</span>`;
  dom.resANet.textContent = state.devA.network;
  dom.resABcast.textContent = state.devA.broadcast;
  dom.resARange.textContent = `${state.devA.firstUsable} - ${state.devA.lastUsable}`;
  dom.resAHosts.textContent = state.devA.numHosts.toLocaleString();

  // Device B
  dom.resBCidrVal.textContent = state.devB.cidr;
  dom.resBMask.innerHTML = `${state.devB.mask} (/${state.devB.cidr}) <span class="binary">${formatBinaryMask(state.devB.maskLong, state.devB.cidr)}</span>`;
  dom.resBNet.textContent = state.devB.network;
  dom.resBBcast.textContent = state.devB.broadcast;
  dom.resBRange.textContent = `${state.devB.firstUsable} - ${state.devB.lastUsable}`;
  dom.resBHosts.textContent = state.devB.numHosts.toLocaleString();
}

// Bold network bits and fade host bits in binary mask
function formatBinaryMask(maskLong, cidr) {
  const rawBin = (maskLong >>> 0).toString(2).padStart(32, '0');
  const dottedBin = [];
  
  let currentBit = 0;
  for (let octet = 0; octet < 4; octet++) {
    let octetStr = '';
    for (let bit = 0; bit < 8; bit++) {
      const bitChar = rawBin[currentBit];
      if (currentBit < cidr) {
        octetStr += `<b style="color: var(--primary);">${bitChar}</b>`;
      } else {
        octetStr += `<span style="opacity: 0.35;">${bitChar}</span>`;
      }
      currentBit++;
    }
    dottedBin.push(octetStr);
  }
  
  return dottedBin.join('.');
}

// Generate the analysis verdict and warnings
function updateVerdictCard() {
  const r = state.relation;
  const box = dom.verdictBox;
  const title = dom.verdictTitle;
  const body = dom.verdictBody;

  box.className = 'verdict-box';

  if (r.sameSubnet) {
    box.classList.add('verdict-success');
    title.textContent = 'Subnets Match: Direct BACnet/IP Enabled';
    body.textContent = `Both Device A and Device B belong to the exact same subnet (${state.devA.network}/${state.devA.cidr}). Unicast and broadcast BACnet services will work natively without BBMD routing infrastructure.`;
    
    // Set SVG icon to Checkmark
    dom.verdictIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><polyline points="12 8 8 12 12 16"></polyline><line x1="16" y1="12" x2="8" y2="12"></line>`; // Direct back arrow or simple check
    dom.verdictIcon.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
    
    // Hide BBMD check since same subnet doesn't need it
    dom.lblBbmdEnable.style.display = 'none';
    dom.bbmdEnableChk.checked = false;
  } 
  else if (r.broadcastIntersectionTrap) {
    box.classList.add('verdict-error');
    title.textContent = 'Broadcast Intersection Trap Detected!';
    body.innerHTML = `<strong>Asymmetrical communication failure!</strong> Devices A and B share the identical broadcast address (<code>${state.devA.broadcast}</code>) but belong to separate logical subnets: Device A is <code>/${state.devA.cidr}</code>, Device B is <code>/${state.devB.cidr}</code>. 
    <br><br>
    Because they share a physical segment, local BACnet broadcasts (Who-Is) will reach both nodes. Device A sees Device B's IP as local and replies directly. However, Device B sees Device A as remote and attempts to reply through its router gateway. Direct unicast communication will fail unless asymmetric routes are specially configured.`;
    
    dom.verdictIcon.innerHTML = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
    
    dom.lblBbmdEnable.style.display = 'none';
    dom.bbmdEnableChk.checked = false;
  }
  else if (r.asymmetricalSubnet) {
    box.classList.add('verdict-warning');
    title.textContent = 'Asymmetrical Overlapping Subnets';
    // One believes it's local, other doesn't
    const localThinker = r.aThinksBInSubnet ? 'Device A' : 'Device B';
    const remoteThinker = r.aThinksBInSubnet ? 'Device B' : 'Device A';
    body.innerHTML = `One-way local communication trap! <strong>${localThinker}</strong> thinks the other is local, but <strong>${remoteThinker}</strong> thinks the other is remote. 
    This is caused by unequal subnet mask definitions. ${localThinker} will send direct ARP and Layer 2 frames, while ${remoteThinker} will send replies to its gateway, creating broken connections.`;
    
    dom.verdictIcon.innerHTML = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
    
    dom.lblBbmdEnable.style.display = 'none';
    dom.bbmdEnableChk.checked = false;
  }
  else if (r.overlappingSubnet) {
    box.classList.add('verdict-warning');
    title.textContent = 'Symmetrical Subnet Overlap: Broadcast Mismatch';
    body.innerHTML = `<strong>Symmetrical subnet overlap detected!</strong> Both Device A and Device B believe the other is local because their IP addresses fall within each other's usable ranges. 
    <br><br>
    Direct unicast communication (such as ReadProperty) will work because both sides will send replies locally over Layer 2. However, because they have different subnet masks (<code>/${state.devA.cidr}</code> vs <code>/${state.devB.cidr}</code>), they calculate different broadcast IPs (<code>${state.devA.broadcast}</code> vs <code>${state.devB.broadcast}</code>). Consequently, their IP stacks will drop each other's local BACnet discoveries (Who-Is), preventing automatic device binding.`;

    dom.verdictIcon.innerHTML = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;

    dom.lblBbmdEnable.style.display = 'none';
    dom.bbmdEnableChk.checked = false;
  }
  else {
    // Isolated subnets
    box.classList.add('verdict-warning');
    title.textContent = 'Isolated Subnets: BBMD Infrastructure Required';
    body.textContent = `Device A (${state.devA.network}/${state.devA.cidr}) and Device B (${state.devB.network}/${state.devB.cidr}) are in completely separate subnets. Routers will block their local BACnet discoveries. To resolve, configure BBMDs on both subnets or register Device B as a Foreign Device (FDR).`;
    
    dom.verdictIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
    
    // Enable BBMD toggle checkbox
    dom.lblBbmdEnable.style.display = 'flex';
  }
}

// Redraw / update nodes and links in the visualizer SVG based on configuration
function updateSimulatorTopology() {
  const r = state.relation;
  const isRouted = !(r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet);

  // Set IP Labels
  dom.simIpA.textContent = state.devA.ip;
  dom.simMaskA.textContent = `/${state.devA.cidr}`;
  dom.simIpB.textContent = state.devB.ip;
  dom.simMaskB.textContent = `/${state.devB.cidr}`;

  // Reset elements
  dom.simNodeSwB.style.display = 'none';
  dom.simNodeRouter.style.display = 'none';
  
  dom.wireAToSwA.setAttribute('d', 'M 100 152.5 L 320 220');
  dom.wireAToSwA.className.baseVal = 'wire-path active';

  // Show/hide BBMD config panel
  dom.bbmdConfigPanel.style.display = isRouted ? 'block' : 'none';

  // Hide BBMD nodes & wires by default
  dom.simBbmdA.style.display = 'none';
  dom.simBbmdB.style.display = 'none';
  dom.wireSwaToBbmda.style.display = 'none';
  dom.wireSwbToBbmdb.style.display = 'none';

  // Toggle layout states
  if (!isRouted) {
    // Single Switch network topology
    dom.simSwALabel.textContent = 'Switch';
    
    // Point Device B wire to Switch A
    dom.wireBToSwA.setAttribute('d', 'M 700 152.5 L 320 220');
    dom.wireBToSwA.style.display = 'block';
    dom.wireBToSwA.className.baseVal = 'wire-path active';
    dom.wireBToSwB.style.display = 'none';
    dom.wireSwAToRouter.style.display = 'none';
    dom.wireSwBToRouter.style.display = 'none';

    if (r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
      // Show Router in the diagram representing the default gateway
      dom.simNodeRouter.style.display = 'block';
      dom.wireSwAToRouter.style.display = 'block';
      dom.wireSwAToRouter.setAttribute('d', 'M 320 220 L 400 100');
      dom.wireSwAToRouter.className.baseVal = 'wire-path';
    }
  } else {
    // Separate Routed Subnets topology
    dom.simSwALabel.textContent = 'Switch A';
    dom.simNodeSwB.style.display = 'block';
    dom.simNodeRouter.style.display = 'block';

    dom.wireBToSwA.style.display = 'none';
    dom.wireBToSwB.style.display = 'block';
    dom.wireBToSwB.setAttribute('d', 'M 700 152.5 L 480 220');
    dom.wireBToSwB.className.baseVal = 'wire-path secondary-active';

    dom.wireSwAToRouter.style.display = 'block';
    dom.wireSwAToRouter.setAttribute('d', 'M 320 220 L 400 100');
    dom.wireSwAToRouter.className.baseVal = 'wire-path';

    dom.wireSwBToRouter.style.display = 'block';
    dom.wireSwBToRouter.setAttribute('d', 'M 480 220 L 400 100');
    dom.wireSwBToRouter.className.baseVal = 'wire-path';

    const bbmd = getBbmdConfig();
    
    // Highlight inputs if self-address is missing
    dom.bbmdAIp.style.borderColor = bbmd.aMissingSelf ? 'var(--warning)' : '';
    dom.bbmdBIp.style.borderColor = bbmd.bMissingSelf ? 'var(--warning)' : '';
    
    if (bbmd.ipALong !== null) {
      dom.simBbmdA.style.display = 'block';
      dom.simBbmdAIpLbl.textContent = bbmd.ipA;
      const rect = dom.simBbmdA.querySelector('rect');
      if (bbmd.aValid) {
        rect.setAttribute('fill', 'var(--primary)');
        rect.setAttribute('stroke', 'var(--primary)');
        dom.wireSwaToBbmda.style.display = 'block';
        dom.wireSwaToBbmda.style.stroke = 'var(--primary)';
      } else {
        rect.setAttribute('fill', 'rgba(239, 68, 68, 0.15)');
        rect.setAttribute('stroke', 'var(--error)');
      }
    }
    
    if (bbmd.ipBLong !== null) {
      dom.simBbmdB.style.display = 'block';
      dom.simBbmdBIpLbl.textContent = bbmd.ipB;
      const rect = dom.simBbmdB.querySelector('rect');
      if (bbmd.bValid) {
        rect.setAttribute('fill', 'var(--secondary)');
        rect.setAttribute('stroke', 'var(--secondary)');
        dom.wireSwbToBbmdb.style.display = 'block';
        dom.wireSwbToBbmdb.style.stroke = 'var(--secondary)';
      } else {
        rect.setAttribute('fill', 'rgba(239, 68, 68, 0.15)');
        rect.setAttribute('stroke', 'var(--error)');
      }
    }
  }
}

// Interactive Packet Simulator execution engine
async function triggerSimulation(type) {
  if (state.isAnimating) return;
  state.isAnimating = true;
  disableSimButtons(true);

  const r = state.relation;
  const hasBbmd = dom.bbmdEnableChk.checked && dom.lblBbmdEnable.style.display !== 'none';

  logToConsole(`--- Starting packet transmission [Type: ${type.toUpperCase()}] ---`, 'system');

  try {
    if (type === 'bcast-a') {
      // WHO-IS BROADCAST FROM DEVICE A
      logToConsole(`[Device A] Sending Who-Is (Broadcast) on port 47808`, 'info');
      logToConsole(`[Device A] Target Broadcast address: ${state.devA.broadcast}`, 'info');

      // Stage 1: Send to Switch
      await animatePacket(coords.devA, coords.swA, 'Who-Is (BC)');
      logToConsole(`[Switch A] Broadcast received. flooding packet out all ports.`, 'success');

      if (r.sameSubnet) {
        // Direct broadcast hit
        await animatePacket(coords.swA, coords.devB, 'Who-Is (BC)');
        
        const bcastIam = dom.bcastIamChk.checked;
        if (bcastIam) {
          logToConsole(`[Device B] Received Who-Is. Generating I-Am broadcast response to target ${state.devB.broadcast}`, 'success');
          await Promise.all([
            animatePacket(coords.devB, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ]);
          logToConsole(`[Switch A] Broadcast flooded. Device A receives it.`, 'success');
          await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device A] Received I-Am broadcast reply. Device Binding complete. Direct link online!`, 'success');
        } else {
          logToConsole(`[Device B] Received Who-Is. Generating I-Am unicast reply to ${state.devA.ip}`, 'success');
          // Auto-trigger unicast reply
          await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swA, coords.devA, 'I-Am (UC)', 'secondary');
          logToConsole(`[Device A] Received I-Am reply. Device Binding complete. Direct link online!`, 'success');
        }
      } 
      else if (r.broadcastIntersectionTrap) {
        // Broadcast trap - physical segment is identical, so B hears broadcast!
        logToConsole(`[Switch A] Broadcasting to local segment: Device B & Gateway Router both receive it`, 'warning');
        
        // Parallel animation: packet to B and Router
        await Promise.all([
          animatePacket(coords.swA, coords.devB, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);

        logToConsole(`[Router] Received broadcast. Dropped (IP Routers block UDP broadcasts).`, 'error');
        logToConsole(`[Device B] Received Who-Is. Believes sender A (${state.devA.ip}) is remote.`, 'warning');
        logToConsole(`[Device B] Generating I-Am reply. Target is remote: routing to Gateway...`, 'warning');

        // B sends reply to Gateway (Router)
        await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
        await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
        logToConsole(`[Router] Received routed reply from B for remote IP ${state.devA.ip}.`, 'error');
        logToConsole(`[Router] DROP: Device A (${state.devA.ip}) is on the same physical link. Router will not loop packet back, or lacks route. Packet lost!`, 'error');
        logToConsole(`[Device A] TIMEOUT. Device A never receives I-Am from Device B. Discovery failed.`, 'error');
      } 
      else if (r.asymmetricalSubnet) {
        // Asymmetrical case
        logToConsole(`[Switch A] Local broadcast forwarded to B and Router.`, 'warning');
        await Promise.all([
          animatePacket(coords.swA, coords.devB, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped broadcast.`, 'error');
        
        const bcastIam = dom.bcastIamChk.checked;
        if (bcastIam) {
          logToConsole(`[Device B] Generating I-Am broadcast response.`, 'success');
          await Promise.all([
            animatePacket(coords.devB, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ]);
          await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device A] Received I-Am broadcast reply. Discovery successful!`, 'success');
        } else {
          if (r.bThinksAInSubnet) {
            // B thinks A is local, B replies directly
            logToConsole(`[Device B] Thinks A is local. Sending I-Am direct reply.`, 'success');
            await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.devA, 'I-Am (UC)', 'secondary');
            logToConsole(`[Device A] Received I-Am reply. Communication established.`, 'success');
          } else {
            // B thinks A is remote (A thinks B is local)
            logToConsole(`[Device B] Thinks A is remote. Routing I-Am reply to Gateway...`, 'warning');
            await animatePacket(coords.devB, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
            logToConsole(`[Router] Routed packet dropped due to asymmetrical hairpin interface rules.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
          }
        }
      } 
      else if (r.overlappingSubnet) {
        // Symmetrical Overlapping Subnets (different broadcast addresses)
        logToConsole(`[Switch A] Broadcasting to local segment: Device B & Gateway Router both receive it`, 'warning');
        
        // Parallel animation: packet to B and Router
        await Promise.all([
          animatePacket(coords.swA, coords.devB, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);

        logToConsole(`[Router] Received broadcast. Dropped (IP Routers block UDP broadcasts).`, 'error');
        logToConsole(`[Device B] Received broadcast frame on port 47808.`, 'warning');
        logToConsole(`[Device B] DROP: Packet Broadcast IP (${state.devA.broadcast}) does not match B's broadcast IP (${state.devB.broadcast}).`, 'error');
        logToConsole(`[Device B] No response generated (broadcast mismatch).`, 'error');
        logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
      }
      else {
        // Routed subnets
        const bbmd = getBbmdConfig();
        
        // Send local broadcast first
        logToConsole(`[Switch A] Broadcasting Who-Is to local segment...`, 'info');
        const tasks = [animatePacket(coords.swA, coords.router, 'Who-Is (BC)')];
        if (bbmd.ipALong !== null) {
          tasks.push(animatePacket(coords.swA, coords.bbmd1, 'Who-Is (BC)'));
        }
        await Promise.all(tasks);
        
        logToConsole(`[Router] Received broadcast from Subnet A. Dropped (UDP broadcasts do not cross routers).`, 'error');

        if (bbmd.ipALong === null) {
          logToConsole(`[Subnet A] No BBMD configured. Broadcast does not cross subnets.`, 'error');
          logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        if (bbmd.aMissingSelf) {
          logToConsole(`[BBMD A] Warning: BBMD IP ${bbmd.ipA} is missing from its own BDT table (${bbmd.bdtA.join(', ')}). BBMD disabled (will not process broadcasts).`, 'error');
          logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        if (!bbmd.aBDTContainsB) {
          logToConsole(`[BBMD A] Intercepted local broadcast. Checking BDT routing table...`, 'info');
          logToConsole(`[BBMD A] BDT table has no entry for remote Subnet B BBMD (${bbmd.ipB || 'None'}). Tunnel forwarding failed!`, 'error');
          logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        logToConsole(`[BBMD A] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD B (${bbmd.ipB})...`, 'success');
        // Tunnel unicast: BBMD1 -> SwA -> Router -> SwB -> BBMD2
        await animatePacket(coords.bbmd1, coords.swA, 'BVLL (UC)', 'secondary');
        await animatePacket(coords.swA, coords.router, 'BVLL (UC)', 'secondary');
        await animatePacket(coords.router, coords.swB, 'BVLL (UC)', 'secondary');
        await animatePacket(coords.swB, coords.bbmd2, 'BVLL (UC)', 'secondary');

        if (bbmd.ipBLong === null) {
          logToConsole(`[Subnet B] Received tunnel packet on port 47808, but no BBMD is listening. Dropped.`, 'error');
          logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        if (bbmd.bMissingSelf) {
          logToConsole(`[BBMD B] Received tunnel packet from BBMD A, but BBMD B is disabled (own IP ${bbmd.ipB} missing from its BDT). Dropped.`, 'error');
          logToConsole(`[Device B] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        logToConsole(`[BBMD B] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
        logToConsole(`[BBMD B] Broadcasting Who-Is locally on Subnet B...`, 'success');

        // Local broadcast on Subnet B
        await animatePacket(coords.bbmd2, coords.swB, 'Who-Is (BC)');
        await animatePacket(coords.swB, coords.devB, 'Who-Is (BC)');

        const bcastIam = dom.bcastIamChk.checked;
        if (bcastIam) {
          logToConsole(`[Device B] Received Who-Is. Generating I-Am broadcast response to target ${state.devB.broadcast}`, 'success');
          
          // Send local broadcast first on Subnet B
          logToConsole(`[Device B] Broadcasting I-Am locally on Subnet B...`, 'info');
          const iamTasks = [
            animatePacket(coords.devB, coords.swB, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swB, coords.router, 'I-Am (BC)', 'secondary')
          ];
          if (bbmd.ipBLong !== null) {
            iamTasks.push(animatePacket(coords.swB, coords.bbmd2, 'I-Am (BC)', 'secondary'));
          }
          await Promise.all(iamTasks);
          logToConsole(`[Router] Received broadcast from Subnet B. Dropped.`, 'error');

          // Tunnel back check
          if (bbmd.ipBLong === null) {
            logToConsole(`[Subnet B] No BBMD configured. Broadcast I-Am cannot cross subnets.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
            return;
          }
          if (bbmd.bMissingSelf) {
            logToConsole(`[BBMD B] Warning: BBMD IP ${bbmd.ipB} missing from its own BDT. Disabled.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
            return;
          }
          if (!bbmd.bBDTContainsA) {
            logToConsole(`[BBMD B] Intercepted local broadcast. Checking BDT routing table...`, 'info');
            logToConsole(`[BBMD B] BDT table has no entry for remote Subnet A BBMD (${bbmd.ipA || 'None'}). Tunnel forwarding failed!`, 'error');
            logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
            return;
          }

          // Tunnel succeeds
          logToConsole(`[BBMD B] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD A (${bbmd.ipA})...`, 'success');
          await animatePacket(coords.bbmd2, coords.swB, 'BVLL (UC)', 'secondary');
          await animatePacket(coords.swB, coords.router, 'BVLL (UC)', 'secondary');
          await animatePacket(coords.router, coords.swA, 'BVLL (UC)', 'secondary');
          await animatePacket(coords.swA, coords.bbmd1, 'BVLL (UC)', 'secondary');

          if (bbmd.ipALong === null || bbmd.aMissingSelf) {
            logToConsole(`[Subnet A] Received tunnel packet but destination BBMD A is inactive. Dropped.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Discovery failed.`, 'error');
            return;
          }

          logToConsole(`[BBMD A] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
          logToConsole(`[BBMD A] Broadcasting I-Am locally on Subnet A...`, 'success');
          await animatePacket(coords.bbmd1, coords.swA, 'I-Am (BC)', 'secondary');
          await animatePacket(coords.swA, coords.devA, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device A] Received I-Am broadcast reply. Discovery successful via two-way BBMD Tunnel!`, 'success');
        } else {
          logToConsole(`[Device B] Received Who-Is. Generating I-Am unicast reply to remote sender ${state.devA.ip}`, 'success');
          // Unicast reply from B back to A (directly via IP router since it is unicast)
          await animatePacket(coords.devB, coords.swB, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swB, coords.router, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.router, coords.swA, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swA, coords.devA, 'I-Am (UC)', 'secondary');
          logToConsole(`[Device A] Received I-Am unicast reply. Discovery successful!`, 'success');
        }
      }
    } 
    else if (type === 'bcast-b') {
      // WHO-IS BROADCAST FROM DEVICE B
      logToConsole(`[Device B] Sending Who-Is (Broadcast) on port 47808`, 'info');
      logToConsole(`[Device B] Target Broadcast address: ${state.devB.broadcast}`, 'info');

      if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
        // Single switch physical segment
        await animatePacket(coords.devB, coords.swA, 'Who-Is (BC)');
        logToConsole(`[Switch A] Broadcast received. Forwarding to all ports.`, 'success');

        await Promise.all([
          animatePacket(coords.swA, coords.devA, 'Who-Is (BC)'),
          animatePacket(coords.swA, coords.router, 'Who-Is (BC)')
        ]);
        logToConsole(`[Router] Dropped broadcast.`, 'error');

        // Overlapping subnet drop
        if (r.overlappingSubnet) {
          logToConsole(`[Device A] Received broadcast frame on port 47808.`, 'warning');
          logToConsole(`[Device A] DROP: Packet Broadcast IP (${state.devB.broadcast}) does not match A's broadcast IP (${state.devA.broadcast}).`, 'error');
          logToConsole(`[Device A] No response generated (broadcast mismatch).`, 'error');
          logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
          return;
        }

        // Reply logic from A
        logToConsole(`[Device A] Received Who-Is. Checking if B is local...`, 'success');
        
        const bcastIam = dom.bcastIamChk.checked;
        if (bcastIam) {
          logToConsole(`[Device A] Generating I-Am broadcast response to target ${state.devA.broadcast}`, 'success');
          await Promise.all([
            animatePacket(coords.devA, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ]);
          await animatePacket(coords.swA, coords.devB, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device B] Received I-Am broadcast reply. Discovery complete!`, 'success');
        } else {
          if (r.aThinksBInSubnet) {
            logToConsole(`[Device A] Thinks B is local. Generating I-Am direct reply.`, 'success');
            await animatePacket(coords.devA, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.devB, 'I-Am (UC)', 'secondary');
            logToConsole(`[Device B] Received I-Am reply. Discovery complete!`, 'success');
          } else {
            // A thinks B is remote
            logToConsole(`[Device A] Thinks B is remote. Routing I-Am reply to Gateway...`, 'warning');
            await animatePacket(coords.devA, coords.swA, 'I-Am (UC)', 'secondary');
            await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
            logToConsole(`[Router] Routed packet dropped (lack of route/hairpin rule).`, 'error');
            logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
          }
        }
      } else {
        // Routed subnets
        const bbmd = getBbmdConfig();
        
        // Send local broadcast first
        logToConsole(`[Switch B] Broadcasting Who-Is to local segment...`, 'info');
        const tasks = [animatePacket(coords.swB, coords.router, 'Who-Is (BC)')];
        if (bbmd.ipBLong !== null) {
          tasks.push(animatePacket(coords.swB, coords.bbmd2, 'Who-Is (BC)'));
        }
        await Promise.all(tasks);
        
        logToConsole(`[Router] Received broadcast from Subnet B. Dropped (UDP broadcasts do not cross routers).`, 'error');

        if (bbmd.ipBLong === null) {
          logToConsole(`[Subnet B] No BBMD configured. Broadcast does not cross subnets.`, 'error');
          logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        if (bbmd.bMissingSelf) {
          logToConsole(`[BBMD B] Warning: BBMD IP ${bbmd.ipB} is missing from its own BDT table (${bbmd.bdtB.join(', ')}). BBMD disabled (will not process broadcasts).`, 'error');
          logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        if (!bbmd.bBDTContainsA) {
          logToConsole(`[BBMD B] Intercepted local broadcast. Checking BDT routing table...`, 'info');
          logToConsole(`[BBMD B] BDT table has no entry for remote Subnet A BBMD (${bbmd.ipA || 'None'}). Tunnel forwarding failed!`, 'error');
          logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        logToConsole(`[BBMD B] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD A (${bbmd.ipA})...`, 'success');
        // Tunnel unicast: BBMD2 -> SwB -> Router -> SwA -> BBMD1
        await animatePacket(coords.bbmd2, coords.swB, 'BVLL (UC)', 'secondary');
        await animatePacket(coords.swB, coords.router, 'BVLL (UC)', 'secondary');
        await animatePacket(coords.router, coords.swA, 'BVLL (UC)', 'secondary');
        await animatePacket(coords.swA, coords.bbmd1, 'BVLL (UC)', 'secondary');

        if (bbmd.ipALong === null) {
          logToConsole(`[Subnet A] Received tunnel packet on port 47808, but no BBMD is listening. Dropped.`, 'error');
          logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        if (bbmd.aMissingSelf) {
          logToConsole(`[BBMD A] Received tunnel packet from BBMD B, but BBMD A is disabled (own IP ${bbmd.ipA} missing from its BDT). Dropped.`, 'error');
          logToConsole(`[Device A] Never received Who-Is. Discovery failed.`, 'error');
          return;
        }

        logToConsole(`[BBMD A] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
        logToConsole(`[BBMD A] Broadcasting Who-Is locally on Subnet A...`, 'success');

        // Local broadcast on Subnet A
        await animatePacket(coords.bbmd1, coords.swA, 'Who-Is (BC)');
        await animatePacket(coords.swA, coords.devA, 'Who-Is (BC)');

        const bcastIam = dom.bcastIamChk.checked;
        if (bcastIam) {
          logToConsole(`[Device A] Received Who-Is. Generating I-Am broadcast response to target ${state.devA.broadcast}`, 'success');
          logToConsole(`[Device A] Broadcasting I-Am locally on Subnet A...`, 'info');
          
          const iamTasks = [
            animatePacket(coords.devA, coords.swA, 'I-Am (BC)', 'secondary'),
            animatePacket(coords.swA, coords.router, 'I-Am (BC)', 'secondary')
          ];
          if (bbmd.ipALong !== null) {
            iamTasks.push(animatePacket(coords.swA, coords.bbmd1, 'I-Am (BC)', 'secondary'));
          }
          await Promise.all(iamTasks);
          logToConsole(`[Router] Received broadcast from Subnet A. Dropped.`, 'error');

          // Tunnel back check
          if (bbmd.ipALong === null) {
            logToConsole(`[Subnet A] No BBMD configured. Broadcast I-Am cannot cross subnets.`, 'error');
            logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
            return;
          }
          if (bbmd.aMissingSelf) {
            logToConsole(`[BBMD A] Warning: BBMD IP ${bbmd.ipA} missing from its own BDT. Disabled.`, 'error');
            logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
            return;
          }
          if (!bbmd.aBDTContainsB) {
            logToConsole(`[BBMD A] Intercepted local broadcast. Checking BDT routing table...`, 'info');
            logToConsole(`[BBMD A] BDT table has no entry for remote Subnet B BBMD (${bbmd.ipB || 'None'}). Tunnel forwarding failed!`, 'error');
            logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
            return;
          }

          // Tunnel succeeds
          logToConsole(`[BBMD A] Intercepted local broadcast. Wrapping into BVLL unicast tunnel to BBMD B (${bbmd.ipB})...`, 'success');
          await animatePacket(coords.bbmd1, coords.swA, 'BVLL (UC)', 'secondary');
          await animatePacket(coords.swA, coords.router, 'BVLL (UC)', 'secondary');
          await animatePacket(coords.router, coords.swB, 'BVLL (UC)', 'secondary');
          await animatePacket(coords.swB, coords.bbmd2, 'BVLL (UC)', 'secondary');

          if (bbmd.ipBLong === null || bbmd.bMissingSelf) {
            logToConsole(`[Subnet B] Received tunnel packet but destination BBMD B is inactive. Dropped.`, 'error');
            logToConsole(`[Device B] TIMEOUT. Discovery failed.`, 'error');
            return;
          }

          logToConsole(`[BBMD B] Unicast tunnel packet received. Extracting original Who-Is broadcast.`, 'success');
          logToConsole(`[BBMD B] Broadcasting I-Am locally on Subnet B...`, 'success');
          await animatePacket(coords.bbmd2, coords.swB, 'I-Am (BC)', 'secondary');
          await animatePacket(coords.swB, coords.devB, 'I-Am (BC)', 'secondary');
          logToConsole(`[Device B] Received I-Am broadcast reply. Discovery successful via two-way BBMD Tunnel!`, 'success');
        } else {
          logToConsole(`[Device A] Received Who-Is. Replying unicast.`, 'success');
          await animatePacket(coords.devA, coords.swA, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swA, coords.router, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.router, coords.swB, 'I-Am (UC)', 'secondary');
          await animatePacket(coords.swB, coords.devB, 'I-Am (UC)', 'secondary');
          logToConsole(`[Device B] Received I-Am. Discovery successful!`, 'success');
        }
      }
    } 
    else if (type === 'unicast-a-b') {
      // UNICAST A -> B
      logToConsole(`[Device A] Injecting BACnet Unicast ReadProperty frame`, 'info');
      logToConsole(`[Device A] Destination IP: ${state.devB.ip}`, 'info');

      if (r.aThinksBInSubnet) {
        logToConsole(`[Device A] Thinks B is local. Resolving B's MAC address via ARP.`, 'success');
        logToConsole(`[Device A] Sending directly via Layer 2 switch segment.`, 'success');
        
        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          await animatePacket(coords.devA, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.devB, 'ReadProp');
          logToConsole(`[Device B] Received unicast request. Generating ACK reply.`, 'success');
          
          // Reply logic
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
          // This case should rarely happen (A thinks B is local, but they are on separate switches without router)
          await animatePacket(coords.devA, coords.swA, 'ReadProp');
          logToConsole(`[Switch A] ARP failed. Host unreachable.`, 'error');
        }
      } else {
        // A thinks B is remote
        logToConsole(`[Device A] Thinks B is remote. Routing packet to Default Gateway...`, 'warning');
        
        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          await animatePacket(coords.devA, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.router, 'ReadProp');
          logToConsole(`[Router] Received routed unicast from A. Routing back out same interface to B...`, 'success');
          await animatePacket(coords.router, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.devB, 'ReadProp');
        } else {
          // Routed subnets
          await animatePacket(coords.devA, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.router, 'ReadProp');
          logToConsole(`[Router] Forwarding IP packet across subnets...`, 'success');
          await animatePacket(coords.router, coords.swB, 'ReadProp');
          await animatePacket(coords.swB, coords.devB, 'ReadProp');
        }

        // B replies
        logToConsole(`[Device B] Received request. Replying to A.`, 'success');
        if (r.bThinksAInSubnet) {
          logToConsole(`[Device B] Thinks A is local. Replying directly.`, 'success');
          await animatePacket(coords.devB, coords.swA, 'ACK', 'secondary');
          await animatePacket(coords.swA, coords.devA, 'ACK', 'secondary');
          logToConsole(`[Device A] Received ACK. Communication succeeded!`, 'success');
        } else {
          logToConsole(`[Device B] Thinks A is remote. Routing to Gateway...`, 'warning');
          if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
            await animatePacket(coords.devB, coords.swA, 'ACK', 'secondary');
            await animatePacket(coords.swA, coords.router, 'ACK', 'secondary');
            logToConsole(`[Router] Hairpin drop: router rejects forwarding packet back to same physical interface.`, 'error');
            logToConsole(`[Device A] TIMEOUT. Reply lost.`, 'error');
          } else {
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
      // UNICAST B -> A
      logToConsole(`[Device B] Injecting BACnet Unicast ReadProperty frame`, 'info');
      logToConsole(`[Device B] Destination IP: ${state.devA.ip}`, 'info');

      if (r.bThinksAInSubnet) {
        logToConsole(`[Device B] Thinks A is local. Resolving A's MAC address via ARP.`, 'success');
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
          logToConsole(`[Router] Routed reply lost.`, 'error');
          logToConsole(`[Device B] TIMEOUT.`, 'error');
        }
      } else {
        logToConsole(`[Device B] Thinks A is remote. Routing to Gateway...`, 'warning');
        
        if (r.sameSubnet || r.broadcastIntersectionTrap || r.asymmetricalSubnet || r.overlappingSubnet) {
          await animatePacket(coords.devB, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.router, 'ReadProp');
          logToConsole(`[Router] Routed packet dropped. Router gateway has no return path on same subnet.`, 'error');
          logToConsole(`[Device A] Never received request.`, 'error');
        } else {
          // Routed subnets
          await animatePacket(coords.devB, coords.swB, 'ReadProp');
          await animatePacket(coords.swB, coords.router, 'ReadProp');
          await animatePacket(coords.router, coords.swA, 'ReadProp');
          await animatePacket(coords.swA, coords.devA, 'ReadProp');

          logToConsole(`[Device A] Received request. Replying.`, 'success');
          if (r.aThinksBInSubnet) {
            logToConsole(`[Device A] Thinks B is local. Replying directly.`, 'warning');
            await animatePacket(coords.devA, coords.swA, 'ACK', 'secondary');
            logToConsole(`[Switch A] ARP failed to locate B's MAC (different switch segment!). Packet lost.`, 'error');
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
    state.isAnimating = false;
    disableSimButtons(false);
  }
}

function animatePacket(start, end, labelText, type = 'primary') {
  return new Promise((resolve) => {
    // Create elements dynamically to support parallel animations
    const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    packet.setAttribute('r', '7');
    packet.setAttribute('cx', start.x);
    packet.setAttribute('cy', start.y);
    packet.className.baseVal = type === 'secondary' ? 'packet-pulse secondary' : 'packet-pulse';
    packet.style.opacity = 1;

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.className.baseVal = 'packet-label';
    label.setAttribute('x', start.x);
    label.setAttribute('y', start.y - 12);
    label.textContent = labelText;
    label.style.opacity = 1;

    dom.simSvg.appendChild(packet);
    dom.simSvg.appendChild(label);

    const duration = 750; // ms
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Linear interpolation
      const x = start.x + (end.x - start.x) * progress;
      const y = start.y + (end.y - start.y) * progress;

      packet.setAttribute('cx', x);
      packet.setAttribute('cy', y);

      label.setAttribute('x', x);
      label.setAttribute('y', y - 12);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Clean up DOM nodes on finish
        packet.remove();
        label.remove();
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

// Enable/Disable buttons during animation
function disableSimButtons(disable) {
  dom.btnSimBcastA.disabled = disable;
  dom.btnSimBcastB.disabled = disable;
  dom.btnSimUnicastAB.disabled = disable;
  dom.btnSimUnicastBA.disabled = disable;
  dom.bbmdEnableChk.disabled = disable;
  dom.presetSelect.disabled = disable;
}

// Write line to terminal log
function logToConsole(text, level = 'info') {
  const line = document.createElement('div');
  line.className = `terminal-line ${level}`;
  line.innerHTML = `<span class="timestamp">${getTimestamp()}</span>${escapeHtml(text)}`;
  dom.terminalLog.appendChild(line);
  
  // Auto scroll
  dom.terminalLog.scrollTop = dom.terminalLog.scrollHeight;
}

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// OSI Stack Toggle in Primer
function selectOsiTab(stack) {
  // Reset all buttons active states
  dom.btnOsiIpLocalUc.classList.remove('active');
  dom.btnOsiIpRoutedUc.classList.remove('active');
  dom.btnOsiIpBbmdTunnel.classList.remove('active');
  dom.btnOsiEth.classList.remove('active');

  if (stack === 'ip-local-uc') {
    dom.btnOsiIpLocalUc.classList.add('active');
    dom.osiPacketViewer.innerHTML = `
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
    `;
  } else if (stack === 'ip-routed-uc') {
    dom.btnOsiIpRoutedUc.classList.add('active');
    dom.osiPacketViewer.innerHTML = `
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
    `;
  } else if (stack === 'ip-bbmd-tunnel') {
    dom.btnOsiIpBbmdTunnel.classList.add('active');
    dom.osiPacketViewer.innerHTML = `
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
    `;
  } else {
    dom.btnOsiEth.classList.add('active');
    dom.osiPacketViewer.innerHTML = `
      <div class="packet-layer eth">
        <span class="layer-meta">L2</span> Ethernet Header (Length-encoded Frame)
      </div>
      <div class="packet-layer eth" style="background: rgba(148, 216, 255, 0.25);">
        <span class="layer-meta">L2</span> LLC Header (IEEE 802.2 DSAP: 0x82 | SSAP: 0x82)
        <div style="font-size: 0.75rem; margin-top: 0.2rem; opacity: 0.8;">Bypasses IP/UDP. Direct Layer 2 MAC address mapping.</div>
      </div>
      <div class="packet-layer bacnet">
        <span class="layer-meta">L7</span> BACnet APDU (Who-Is / I-Am)
      </div>
      <div style="text-align: center; font-size: 0.75rem; color: var(--error); border: 1px dashed var(--error); padding: 0.5rem; margin-top: 0.5rem; border-radius: var(--radius-sm);">
        Notice: No Layer 3 (IP) or Layer 4 (UDP) encapsulation. This frame cannot cross routers.
      </div>
    `;
  }
}

// Primer BBMD flow animation
let primerAnimating = false;
async function runPrimerBbmdflow(bbmdEnabled) {
  if (primerAnimating) return;
  primerAnimating = true;
  dom.btnBbmdOff.disabled = true;
  dom.btnBbmdOn.disabled = true;

  function animatePrimerSegment(start, end, text, type = 'primary') {
    return new Promise((resolve) => {
      // Create elements dynamically to support parallel animations
      const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      packet.setAttribute('r', '7');
      packet.setAttribute('cx', start.x);
      packet.setAttribute('cy', start.y);
      packet.className.baseVal = type === 'secondary' ? 'packet-pulse secondary' : 'packet-pulse';
      packet.style.opacity = 1;

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.className.baseVal = 'packet-label';
      label.setAttribute('x', start.x);
      label.setAttribute('y', start.y - 10);
      label.textContent = text;
      label.style.opacity = 1;

      dom.bbmdSvg.appendChild(packet);
      dom.bbmdSvg.appendChild(label);

      const duration = 600;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;

        packet.setAttribute('cx', x);
        packet.setAttribute('cy', y);

        label.setAttribute('x', x);
        label.setAttribute('y', y - 10);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Clean up DOM nodes on finish
          packet.remove();
          label.remove();
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }

  try {
    // 1. Device A broadcasts to Switch 1
    await animatePrimerSegment(bbmdCoords.devA, bbmdCoords.sw1, 'Who-Is (BC)');
    
    // 2. Switch 1 forwards to BBMD 1 and Router
    if (bbmdEnabled) {
      await Promise.all([
        animatePrimerSegment(bbmdCoords.sw1, bbmdCoords.router, 'Who-Is (BC)'),
        animatePrimerSegment(bbmdCoords.sw1, bbmdCoords.bbmd1, 'Who-Is (BC)')
      ]);

      // Router drops broadcast packet
      // BBMD 1 encapsulates and tunnels it
      await animatePrimerSegment(bbmdCoords.bbmd1, bbmdCoords.sw1, 'BVLL Tunnel');
      await animatePrimerSegment(bbmdCoords.sw1, bbmdCoords.router, 'BVLL Tunnel', 'secondary');
      await animatePrimerSegment(bbmdCoords.router, bbmdCoords.sw2, 'BVLL Tunnel', 'secondary');
      await animatePrimerSegment(bbmdCoords.sw2, bbmdCoords.bbmd2, 'BVLL Tunnel');

      // BBMD 2 decapsulates and broadcasts
      await animatePrimerSegment(bbmdCoords.bbmd2, bbmdCoords.sw2, 'Who-Is (BC)');
      await animatePrimerSegment(bbmdCoords.sw2, bbmdCoords.devB, 'Who-Is (BC)');
      
      // Target receives! Success reply (unicast)
      await animatePrimerSegment(bbmdCoords.devB, bbmdCoords.sw2, 'I-Am (UC)');
      await animatePrimerSegment(bbmdCoords.sw2, bbmdCoords.router, 'I-Am (UC)');
      await animatePrimerSegment(bbmdCoords.router, bbmdCoords.sw1, 'I-Am (UC)');
      await animatePrimerSegment(bbmdCoords.sw1, bbmdCoords.devA, 'I-Am (UC)');
    } else {
      // Disabled mode: packet goes to router and dies
      await animatePrimerSegment(bbmdCoords.sw1, bbmdCoords.router, 'Who-Is (BC)');
      // Glow router in red briefly (error visual)
      const routerCircle = dom.bbmdSvg.querySelector('#node-router circle');
      const originalStroke = routerCircle.getAttribute('stroke');
      routerCircle.setAttribute('stroke', 'var(--error)');
      
      await new Promise(r => setTimeout(r, 600));
      routerCircle.setAttribute('stroke', originalStroke);
    }
  } catch (e) {
    console.error(e);
  } finally {
    primerAnimating = false;
    dom.btnBbmdOff.disabled = false;
    dom.btnBbmdOn.disabled = false;
  }
}

// Interactive Subnet Mask & Bit Splitter Logic
function updateBitSplitter() {
  const ipStr = dom.splitIp.value;
  const cidr = parseInt(dom.splitCidr.value, 10);
  
  dom.splitCidrLbl.textContent = `/${cidr}`;
  
  const ipLong = ipToLong(ipStr);
  if (ipLong === null) {
    dom.splitIp.style.borderColor = 'var(--error)';
    return;
  }
  dom.splitIp.style.borderColor = '';
  
  const maskLong = cidrToMask(cidr);
  const netLong = (ipLong & maskLong) >>> 0;
  const broadcastLong = (netLong | (~maskLong)) >>> 0;
  
  dom.splitResMask.textContent = longToIp(maskLong);
  dom.splitResNet.textContent = longToIp(netLong);
  dom.splitResBcast.textContent = longToIp(broadcastLong);
  
  // Render bits
  const binaryIp = (ipLong >>> 0).toString(2).padStart(32, '0');
  
  let html = '';
  for (let i = 0; i < 32; i++) {
    const bitVal = binaryIp[i];
    const isNetwork = i < cidr;
    
    // Add dot separator between octets (after 8, 16, 24 bits)
    if (i > 0 && i % 8 === 0) {
      html += `<div style="display: flex; align-items: center; justify-content: center; width: 10px; color: var(--text-muted); font-weight: bold; font-size: 1.2rem;">.</div>`;
    }
    
    // Draw boundary line
    if (i === cidr) {
      html += `<div style="width: 2px; background: var(--error); margin: 0 4px; position: relative;" title="Subnet boundary (/${cidr})">
                 <div style="position: absolute; top: -14px; left: -15px; font-size: 8px; color: var(--error); font-weight: bold; width: 30px; text-align: center;">/${cidr}</div>
               </div>`;
    }
    
    html += `
      <div style="
        width: 16px; 
        height: 24px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: ${isNetwork ? 'rgba(193, 210, 0, 0.12)' : 'rgba(148, 216, 255, 0.1)'}; 
        border: 1px solid ${isNetwork ? 'var(--primary)' : 'var(--secondary)'}; 
        border-radius: 4px;
        color: #fff;
        font-weight: 600;
        font-size: 0.75rem;
      " title="Bit ${i+1}: ${isNetwork ? 'Network' : 'Host'}">
        ${bitVal}
      </div>
    `;
  }
  
  dom.binaryBitStream.innerHTML = html;
  
  // Generate binary representation of Network Address
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
  
  // Update text description
  dom.splitTextExplanation.innerHTML = `
    <strong>How Devices Evaluate This Mask (CIDR /${cidr}):</strong>
    <ul class="custom-list" style="margin-top: 0.5rem; margin-bottom: 0;">
      <li><strong>The Bit Filter:</strong> The device compares the first <strong>${cidr} bits</strong> (green) of its own IP and the target IP. In binary, the filter network ID is: <code style="font-family: var(--font-mono); font-size: 0.8rem;">${formattedNetBin}</code>.</li>
      <li><strong>Decision Logic:</strong>
        <ul>
          <li>If the first <strong>${cidr} bits</strong> match exactly, the destination is recognized as <strong>LOCAL</strong>. The client ignores routers and broadcasts directly on Layer 2 or translates via ARP unicast.</li>
          <li>If any of the first <strong>${cidr} bits</strong> differ, the destination is recognized as <strong>REMOTE</strong>. The client wraps the packet in a Layer 3 IP header and routes it directly to the default gateway (Router).</li>
        </ul>
      </li>
      <li><strong>Host Capacity:</strong> The remaining <strong>${32 - cidr} bits</strong> (blue) are ignored during local/remote routing evaluation, leaving space for <code>${(Math.pow(2, 32 - cidr) - 2).toLocaleString()}</code> local client hosts.</li>
    </ul>
  `;
  
  updateRoutingTrace();
}

// Client-Side Routing Decision Trace Logic
function updateRoutingTrace() {
  const clientIpStr = dom.splitIp.value;
  const cidr = parseInt(dom.splitCidr.value, 10);
  const dstIpStr = dom.traceDstIp.value;
  const gwIpStr = dom.traceGwIp.value;
  
  const clientLong = ipToLong(clientIpStr);
  const dstLong = ipToLong(dstIpStr);
  const gwLong = ipToLong(gwIpStr);
  
  if (clientLong === null) return;
  
  const dstValid = dstLong !== null;
  const gwValid = gwLong !== null;
  
  dom.traceDstIp.style.borderColor = dstValid ? '' : 'var(--error)';
  dom.traceGwIp.style.borderColor = gwValid ? '' : 'var(--error)';
  
  if (!dstValid || !gwValid) {
    dom.routingDecisionSteps.innerHTML = `<div style="color: var(--error); text-align: center; padding: 0.5rem 0;">Please enter valid Destination and Gateway IP addresses.</div>`;
    return;
  }
  
  const maskLong = cidrToMask(cidr);
  
  // Step 1 Calculations
  const clientNetLong = (clientLong & maskLong) >>> 0;
  const clientNetStr = longToIp(clientNetLong);
  const clientBin = toBinaryString(clientLong);
  const maskBin = toBinaryString(maskLong);
  const clientNetBin = toBinaryString(clientNetLong);
  
  // Step 2 Calculations
  const dstNetLong = (dstLong & maskLong) >>> 0;
  const dstNetStr = longToIp(dstNetLong);
  const dstBin = toBinaryString(dstLong);
  const dstNetBin = toBinaryString(dstNetLong);
  
  // Step 3 Calculations
  const subnetsMatch = clientNetLong === dstNetLong;
  
  let html = `
    <!-- Step 1: Calculate Local Subnet -->
    <div style="border-left: 3px solid var(--primary); padding-left: 0.75rem;">
      <div style="font-weight: 600; color: var(--primary); margin-bottom: 0.25rem;">Step 1: Calculate Local Subnet ID</div>
      <div>Client performs bitwise AND: <code>${clientIpStr} &amp; ${longToIp(maskLong)}</code></div>
      <table style="width: 100%; font-family: var(--font-mono); font-size: 0.75rem; margin-top: 0.35rem; border-spacing: 2px;">
        <tr><td style="width: 80px; opacity: 0.6;">Client IP:</td><td>${highlightBinarySubnet(clientBin, cidr)}</td></tr>
        <tr><td style="opacity: 0.6;">Subnet Mask:</td><td>${highlightBinarySubnet(maskBin, cidr)}</td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td style="opacity: 0.6; font-weight: bold; color: var(--primary);">Network ID:</td><td style="font-weight: bold; color: var(--primary);">${highlightBinarySubnet(clientNetBin, cidr)} (${clientNetStr})</td></tr>
      </table>
    </div>

    <!-- Step 2: Calculate Destination Subnet -->
    <div style="border-left: 3px solid var(--secondary); padding-left: 0.75rem; margin-top: 0.75rem;">
      <div style="font-weight: 600; color: var(--secondary); margin-bottom: 0.25rem;">Step 2: Calculate Destination Subnet ID</div>
      <div>Client applies mask to destination: <code>${dstIpStr} &amp; ${longToIp(maskLong)}</code></div>
      <table style="width: 100%; font-family: var(--font-mono); font-size: 0.75rem; margin-top: 0.35rem; border-spacing: 2px;">
        <tr><td style="width: 80px; opacity: 0.6;">Target IP:</td><td>${highlightBinarySubnet(dstBin, cidr)}</td></tr>
        <tr><td style="opacity: 0.6;">Subnet Mask:</td><td>${highlightBinarySubnet(maskBin, cidr)}</td></tr>
        <tr style="border-top: 1px solid var(--border-color);"><td style="opacity: 0.6; font-weight: bold; color: var(--secondary);">Network ID:</td><td style="font-weight: bold; color: var(--secondary);">${highlightBinarySubnet(dstNetBin, cidr)} (${dstNetStr})</td></tr>
      </table>
    </div>

    <!-- Step 3: Compare Subnet IDs -->
    <div style="border-left: 3px solid ${subnetsMatch ? 'var(--success)' : 'var(--warning)'}; padding-left: 0.75rem; margin-top: 0.75rem;">
      <div style="font-weight: 600; color: ${subnetsMatch ? 'var(--success)' : 'var(--warning)'}; margin-bottom: 0.25rem;">
        Step 3: Compare Subnet Matches (Local vs Remote)
      </div>
      <div>
        Client Subnet ID (<code>${clientNetStr}</code>) 
        ${subnetsMatch ? '==' : '!='} 
        Target Subnet ID (<code>${dstNetStr}</code>)? 
        <strong>${subnetsMatch ? 'MATCH! (LOCAL)' : 'MISMATCH! (REMOTE)'}</strong>
      </div>
    </div>

    <!-- Step 4: Layer 2 Framing Decision -->
    <div style="border-left: 3px solid ${subnetsMatch ? 'var(--success)' : 'var(--warning)'}; padding-left: 0.75rem; margin-top: 0.75rem; background: rgba(255,255,255,0.02); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
      <div style="font-weight: 600; color: #fff; margin-bottom: 0.35rem;">Step 4: Layer 2 Framing Action</div>
      ${subnetsMatch ? `
        <div style="color: var(--success); font-weight: 600; margin-bottom: 0.25rem;">Action: Direct Layer 2 Unicast Delivery</div>
        <ul style="margin-left: 1.25rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.25rem;">
          <li>Client checks its local <strong>ARP Cache</strong> for <code>${dstIpStr}</code> to retrieve its MAC address.</li>
          <li>If missing, it broadcasts an <strong>ARP Request</strong> on the local switch port.</li>
          <li>Client encapsulates the IP packet inside an Ethernet frame with:
            <br><code style="font-family: var(--font-mono); font-size: 0.75rem; opacity: 0.85; color: var(--success);">Destination MAC = Device B's Physical MAC</code>
          </li>
          <li>The frame is transmitted directly onto the local LAN. <strong>Routers are bypassed.</strong></li>
        </ul>
      ` : `
        <div style="color: var(--warning); font-weight: 600; margin-bottom: 0.25rem;">Action: Route to Default Gateway (Router)</div>
        <ul style="margin-left: 1.25rem; margin-top: 0.25rem; display: flex; flex-direction: column; gap: 0.25rem;">
          <li>Client ignores B's IP for MAC resolution and targets the Default Gateway (<code>${gwIpStr}</code>) instead.</li>
          <li>Client checks its <strong>ARP Cache</strong> for the Gateway's MAC address.</li>
          <li>Client encapsulates the IP packet (Src: <code>${clientIpStr}</code>, Dst: <code>${dstIpStr}</code>) inside an Ethernet frame, but sets:
            <br><code style="font-family: var(--font-mono); font-size: 0.75rem; opacity: 0.85; color: var(--warning);">Destination MAC = Gateway Router's MAC</code>
          </li>
          <li>The frame is sent to the Router. The Router decapsulates it and forwards the inner IP packet to the next hop or remote subnet segment.</li>
        </ul>
      `}
    </div>
  `;
  
  dom.routingDecisionSteps.innerHTML = html;
}

// Utility to wrap binary string network prefix in bold tag
function highlightBinarySubnet(binStr, cidr) {
  const cleanBin = binStr.replace(/\./g, '');
  let html = '';
  
  for (let i = 0; i < 32; i++) {
    if (i > 0 && i % 8 === 0) {
      html += '.';
    }
    const bit = cleanBin[i];
    if (i < cidr) {
      html += `<b style="color: var(--primary); font-weight: bold;">${bit}</b>`;
    } else {
      html += `<span style="opacity: 0.35;">${bit}</span>`;
    }
  }
  return html;
}

// Retrieve and parse current BBMD input configurations
function getBbmdConfig() {
  const ipAStr = dom.bbmdAIp.value.trim();
  const ipBStr = dom.bbmdBIp.value.trim();
  
  const ipALong = ipToLong(ipAStr);
  const ipBLong = ipToLong(ipBStr);
  
  // Read individual input slots
  const slotsA = Array.from(document.querySelectorAll('.bdt-entry-a')).map(el => el.value.trim()).filter(Boolean);
  const slotsB = Array.from(document.querySelectorAll('.bdt-entry-b')).map(el => el.value.trim()).filter(Boolean);
  
  const bdtALongs = slotsA.map(ipToLong).filter(val => val !== null);
  const bdtBLongs = slotsB.map(ipToLong).filter(val => val !== null);
  
  const aValid = ipALong !== null && bdtALongs.includes(ipALong);
  const bValid = ipBLong !== null && bdtBLongs.includes(ipBLong);
  
  const aMissingSelf = ipALong !== null && !bdtALongs.includes(ipALong);
  const bMissingSelf = ipBLong !== null && !bdtBLongs.includes(ipBLong);
  
  const aBDTContainsB = ipBLong !== null && bdtALongs.includes(ipBLong);
  const bBDTContainsA = ipALong !== null && bdtBLongs.includes(ipALong);
  
  return {
    ipA: ipAStr,
    ipALong,
    bdtA: slotsA,
    bdtALongs,
    aValid,
    aMissingSelf,
    
    ipB: ipBStr,
    ipBLong,
    bdtB: slotsB,
    bdtBLongs,
    bValid,
    bMissingSelf,
    
    aBDTContainsB,
    bBDTContainsA
  };
}
