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
import XLSX from 'xlsx-js-style';

// DOM Cache
const dom = {
  // Tabs
  tabBtnCalculator: document.getElementById('tab-btn-calculator'),
  tabBtnPrimer: document.getElementById('tab-btn-primer'),
  tabBtnPlanner: document.getElementById('tab-btn-planner'),
  pageCalculator: document.getElementById('page-calculator'),
  pagePrimer: document.getElementById('page-primer'),
  pagePlanner: document.getElementById('page-planner'),

  // Planner
  btnPlannerAddSubnet: document.getElementById('btn-planner-add-subnet'),
  plannerSubnetsList: document.getElementById('planner-subnets-list'),
  plannerValidationAlerts: document.getElementById('planner-validation-alerts'),
  plannerPreviewBmsStatus: document.getElementById('planner-preview-bms-status'),
  plannerPreviewBdt: document.getElementById('planner-preview-bdt'),
  btnPlannerExportXlsx: document.getElementById('btn-planner-export-xlsx'),
  plannerPreviewSheetsStructure: document.getElementById('planner-preview-sheets-structure'),

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
  btnOsiEthUc: document.getElementById('btn-osi-eth-uc'),
  btnOsiEthBc: document.getElementById('btn-osi-eth-bc'),
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
  dom.tabBtnPlanner.addEventListener('click', () => switchTab('planner'));

  // Planner Event Listeners
  dom.btnPlannerAddSubnet.addEventListener('click', addPlannerSubnet);
  dom.btnPlannerExportXlsx.addEventListener('click', exportPlannerXlsx);

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
  dom.btnOsiEthUc.addEventListener('click', () => selectOsiTab('eth-uc'));
  dom.btnOsiEthBc.addEventListener('click', () => selectOsiTab('eth-bc'));

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
  dom.tabBtnCalculator.classList.remove('active');
  dom.tabBtnPrimer.classList.remove('active');
  dom.tabBtnPlanner.classList.remove('active');
  
  dom.pageCalculator.classList.remove('active');
  dom.pagePrimer.classList.remove('active');
  dom.pagePlanner.classList.remove('active');

  if (target === 'calculator') {
    dom.tabBtnCalculator.classList.add('active');
    dom.pageCalculator.classList.add('active');
  } else if (target === 'primer') {
    dom.tabBtnPrimer.classList.add('active');
    dom.pagePrimer.classList.add('active');
  } else if (target === 'planner') {
    dom.tabBtnPlanner.classList.add('active');
    dom.pagePlanner.classList.add('active');
    renderPlanner();
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
  dom.btnOsiEthUc.classList.remove('active');
  dom.btnOsiEthBc.classList.remove('active');

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
  } else if (stack === 'eth-uc') {
    dom.btnOsiEthUc.classList.add('active');
    dom.osiPacketViewer.innerHTML = `
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
    `;
  } else if (stack === 'eth-bc') {
    dom.btnOsiEthBc.classList.add('active');
    dom.osiPacketViewer.innerHTML = `
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

// ============================================================================
// NETWORK PLANNER MODULE
// ============================================================================

// Global Planner State
const plannerState = {
  subnets: [
    {
      id: 'sub-1',
      name: 'Core BMS Subnet',
      ip: '192.168.1.0',
      cidr: 24,
      gatewayOffset: 1,
      vlan: 10,
      port: 47808,
      bbmdEnabled: true,
      bbmdOffset: 10,
      bmsPlaced: true,
      bmsRole: 'bbmd',
      fdrTargetSubnetId: ''
    },
    {
      id: 'sub-2',
      name: 'Chiller & Boiler Plant',
      ip: '192.168.2.0',
      cidr: 24,
      gatewayOffset: 1,
      vlan: 20,
      port: 47808,
      bbmdEnabled: true,
      bbmdOffset: 10,
      bmsPlaced: false,
      bmsRole: 'none',
      fdrTargetSubnetId: ''
    },
    {
      id: 'sub-3',
      name: 'VAV Floor Controllers',
      ip: '192.168.4.0',
      cidr: 23,
      gatewayOffset: 1,
      vlan: 30,
      port: 47808,
      bbmdEnabled: false,
      bbmdOffset: 10,
      bmsPlaced: false,
      bmsRole: 'none',
      fdrTargetSubnetId: ''
    }
  ]
};

// Get IP by host offset inside network range
function getOffsetIp(networkIp, cidr, offset) {
  const details = getSubnetDetails(networkIp, cidr);
  if (!details) return '';
  const targetLong = (details.networkLong + offset) >>> 0;
  if (targetLong > details.broadcastLong) return '';
  return longToIp(targetLong);
}

// Render the entire planner page
function renderPlanner() {
  renderSubnetList();
}

// Render cards list
function renderSubnetList() {
  dom.plannerSubnetsList.innerHTML = '';
  
  plannerState.subnets.forEach((sub) => {
    const card = document.createElement('div');
    card.className = 'planner-subnet-card';
    card.dataset.id = sub.id;
    
    // FDR Target Subnet options
    const otherBbmdSubnets = plannerState.subnets.filter(s => s.id !== sub.id && s.bbmdEnabled);
    let fdrSelectHtml = `<select class="planner-fdr-target" style="width: 100%; margin-top: 0.25rem; padding: 0.3rem; background: rgba(0,0,0,0.5); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm);">`;
    if (otherBbmdSubnets.length === 0) {
      fdrSelectHtml += `<option value="">-- No BBMDs Available --</option>`;
    } else {
      otherBbmdSubnets.forEach(s => {
        const selected = s.id === sub.fdrTargetSubnetId ? 'selected' : '';
        fdrSelectHtml += `<option value="${s.id}" ${selected}>${escapeHtml(s.name)} (${s.ip})</option>`;
      });
    }
    fdrSelectHtml += `</select>`;

    // CIDR options
    let cidrOptionsHtml = '';
    for (let c = 30; c >= 16; c--) {
      const selected = c === sub.cidr ? 'selected' : '';
      cidrOptionsHtml += `<option value="${c}" ${selected}>/${c}</option>`;
    }

    const gatewayIp = getOffsetIp(sub.ip, sub.cidr, sub.gatewayOffset);
    const bbmdIp = sub.bbmdEnabled ? getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset) : 'N/A';
    const bmsIp = sub.bmsPlaced ? getOffsetIp(sub.ip, sub.cidr, 20) : 'N/A';

    card.innerHTML = `
      <div class="planner-card-header">
        <input type="text" class="planner-subnet-name" value="${escapeHtml(sub.name)}" style="font-family: var(--font-heading); font-weight: bold; font-size: 1rem; border: none; background: transparent; color: #fff; width: 80%; padding: 0.2rem; border-bottom: 1px dashed transparent;" placeholder="Subnet Name" onfocus="this.style.borderBottom='1px dashed var(--primary)'" onblur="this.style.borderBottom='1px dashed transparent'">
        <button class="planner-btn-delete" title="Delete Subnet">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
      
      <div class="planner-card-grid">
        <!-- Left Column: IP Configuration -->
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; gap: 0.6rem;">
            <div class="form-group" style="margin-bottom: 0; flex: 1.8;">
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Subnet IP & Mask</label>
              <div style="display: flex; gap: 0.3rem; align-items: center;">
                <input type="text" class="planner-subnet-ip" value="${sub.ip}" style="flex: 2; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="e.g. 192.168.1.0">
                <select class="planner-subnet-cidr" style="flex: 1.2; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;">
                  ${cidrOptionsHtml}
                </select>
              </div>
            </div>
            
            <div class="form-group" style="margin-bottom: 0; flex: 0.8;">
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">VLAN ID</label>
              <input type="number" class="planner-subnet-vlan" value="${sub.vlan || ''}" min="1" max="4094" style="width: 100%; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="e.g. 10">
            </div>

            <div class="form-group" style="margin-bottom: 0; flex: 1;">
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">BACnet Port</label>
              <input type="number" class="planner-subnet-port" value="${sub.port || 47808}" min="1024" max="65535" style="width: 100%; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.82rem;" placeholder="47808">
            </div>
          </div>
          
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem;">Gateway Host Offset (.${sub.gatewayOffset})</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="number" class="planner-subnet-gateway-offset" value="${sub.gatewayOffset}" min="1" max="254" style="width: 70px; padding: 0.35rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm);">
              <span style="font-size: 0.8rem; color: var(--text-secondary);">IP: <strong style="color: #fff;">${gatewayIp || 'Invalid'}</strong></span>
            </div>
          </div>
        </div>
        
        <!-- Right Column: BACnet Configuration -->
        <div style="display: flex; flex-direction: column; gap: 0.6rem; border-left: 1px solid rgba(255, 255, 255, 0.05); padding-left: 1rem;">
          <!-- BBMD configuration -->
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #fff; cursor: pointer; margin: 0;">
            <input type="checkbox" class="planner-bbmd-chk" ${sub.bbmdEnabled ? 'checked' : ''}>
            Enable BBMD Router
          </label>
          
          <div class="planner-bbmd-details" style="display: ${sub.bbmdEnabled ? 'block' : 'none'}; margin-left: 1.25rem;">
            <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem;">BBMD Host Offset (.${sub.bbmdOffset})</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="number" class="planner-bbmd-offset" value="${sub.bbmdOffset}" min="1" max="254" style="width: 70px; padding: 0.25rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); color: #fff; border-radius: var(--radius-sm); font-size: 0.8rem;">
              <span style="font-size: 0.75rem; color: var(--text-secondary);">IP: <strong style="color: #fff;">${bbmdIp}</strong></span>
            </div>
          </div>
          
          <!-- BMS Server Configuration -->
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #fff; cursor: pointer; margin: 0.25rem 0 0 0;">
            <input type="checkbox" class="planner-bms-chk" ${sub.bmsPlaced ? 'checked' : ''}>
            Host BMS Server here
          </label>
          
          <div class="planner-bms-details" style="display: ${sub.bmsPlaced ? 'block' : 'none'}; margin-left: 1.25rem; margin-top: 0.2rem;">
            <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem;">BMS IP: <strong style="color: #fff;">${bmsIp}</strong> (.20)</span>
            
            <label style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-bottom: 0.15rem;">BMS Network Role:</label>
            <div style="display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                <input type="radio" name="bms-role-${sub.id}" class="planner-bms-role" value="bbmd" ${sub.bmsRole === 'bbmd' ? 'checked' : ''} ${!sub.bbmdEnabled ? 'disabled' : ''}>
                Participate as local BBMD
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                <input type="radio" name="bms-role-${sub.id}" class="planner-bms-role" value="fdr" ${sub.bmsRole === 'fdr' ? 'checked' : ''}>
                Register via FDR to remote BBMD
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; margin: 0;">
                <input type="radio" name="bms-role-${sub.id}" class="planner-bms-role" value="none" ${sub.bmsRole === 'none' ? 'checked' : ''}>
                Local subnet only (No router traversal)
              </label>
            </div>
            
            <div class="planner-fdr-target-panel" style="display: ${sub.bmsRole === 'fdr' ? 'block' : 'none'}; margin-top: 0.4rem;">
              <label style="font-size: 0.7rem; color: var(--text-muted); display: block;">Select Target Subnet BBMD:</label>
              ${fdrSelectHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // Real-time event bindings
    const nameInput = card.querySelector('.planner-subnet-name');
    nameInput.addEventListener('input', () => {
      sub.name = nameInput.value;
      updatePlannerPreviews();
    });

    const ipInput = card.querySelector('.planner-subnet-ip');
    ipInput.addEventListener('input', () => {
      sub.ip = ipInput.value;
      updatePlannerPreviews();
    });

    const cidrSelect = card.querySelector('.planner-subnet-cidr');
    cidrSelect.addEventListener('change', () => {
      sub.cidr = parseInt(cidrSelect.value);
      updatePlannerPreviews();
    });

    const vlanInput = card.querySelector('.planner-subnet-vlan');
    vlanInput.addEventListener('input', () => {
      let val = parseInt(vlanInput.value);
      if (!isNaN(val)) {
        if (val < 1) val = 1;
        if (val > 4094) val = 4094;
        sub.vlan = val;
      } else {
        sub.vlan = '';
      }
      updatePlannerPreviews();
    });

    const portInput = card.querySelector('.planner-subnet-port');
    portInput.addEventListener('input', () => {
      let val = parseInt(portInput.value);
      if (!isNaN(val)) {
        if (val < 1024) val = 1024;
        if (val > 65535) val = 65535;
        sub.port = val;
      } else {
        sub.port = 47808;
      }
      updatePlannerPreviews();
    });

    const gwOffsetInput = card.querySelector('.planner-subnet-gateway-offset');
    gwOffsetInput.addEventListener('input', () => {
      sub.gatewayOffset = parseInt(gwOffsetInput.value) || 1;
      updatePlannerPreviews();
    });

    const bbmdChk = card.querySelector('.planner-bbmd-chk');
    bbmdChk.addEventListener('change', () => {
      sub.bbmdEnabled = bbmdChk.checked;
      if (!sub.bbmdEnabled && sub.bmsRole === 'bbmd') {
        sub.bmsRole = 'none';
      }
      renderSubnetList();
    });

    const bbmdOffsetInput = card.querySelector('.planner-bbmd-offset');
    if (bbmdOffsetInput) {
      bbmdOffsetInput.addEventListener('input', () => {
        sub.bbmdOffset = parseInt(bbmdOffsetInput.value) || 10;
        updatePlannerPreviews();
      });
    }

    const bmsChk = card.querySelector('.planner-bms-chk');
    bmsChk.addEventListener('change', () => {
      sub.bmsPlaced = bmsChk.checked;
      if (sub.bmsPlaced) {
        plannerState.subnets.forEach(s => {
          if (s.id !== sub.id) s.bmsPlaced = false;
        });
      }
      renderSubnetList();
    });

    const bmsRoles = card.querySelectorAll('.planner-bms-role');
    bmsRoles.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          sub.bmsRole = radio.value;
          renderSubnetList();
        }
      });
    });

    const fdrTargetSelect = card.querySelector('.planner-fdr-target');
    if (fdrTargetSelect) {
      fdrTargetSelect.addEventListener('change', () => {
        sub.fdrTargetSubnetId = fdrTargetSelect.value;
        updatePlannerPreviews();
      });
    }

    card.querySelector('.planner-btn-delete').addEventListener('click', () => {
      deletePlannerSubnet(sub.id);
    });

    dom.plannerSubnetsList.appendChild(card);
  });
  
  updatePlannerPreviews();
}

// Add a new planning subnet
function addPlannerSubnet() {
  const existingOctets = plannerState.subnets.map(s => {
    const parts = s.ip.split('.');
    return parts.length === 4 ? parseInt(parts[2]) : 0;
  });
  
  let nextOctet = 1;
  while (existingOctets.includes(nextOctet)) {
    nextOctet++;
  }
  
  const newId = 'sub-' + Math.random().toString(36).substr(2, 9);
  plannerState.subnets.push({
    id: newId,
    name: `New Subnet ${nextOctet}`,
    ip: `192.168.${nextOctet}.0`,
    cidr: 24,
    gatewayOffset: 1,
    vlan: nextOctet * 10,
    port: 47808,
    bbmdEnabled: false,
    bbmdOffset: 10,
    bmsPlaced: false,
    bmsRole: 'none',
    fdrTargetSubnetId: ''
  });
  
  renderSubnetList();
}

// Delete subnet from planner
function deletePlannerSubnet(id) {
  plannerState.subnets = plannerState.subnets.filter(s => s.id !== id);
  plannerState.subnets.forEach(s => {
    if (s.fdrTargetSubnetId === id) {
      s.fdrTargetSubnetId = '';
    }
  });
  renderSubnetList();
}

// Finds the next non-overlapping IP block for a subnet
function findNextAvailableSubnetBlock(targetSub, cidrVal) {
  const activeRanges = [];
  plannerState.subnets.forEach(s => {
    if (s.id !== targetSub.id) {
      const details = getSubnetDetails(s.ip, s.cidr);
      if (details) {
        activeRanges.push({ start: details.networkLong, end: details.broadcastLong });
      }
    }
  });

  const targetIpLong = ipToLong(targetSub.ip);
  if (targetIpLong === null) return null;

  const maskLong = (0xffffffff << (32 - cidrVal)) >>> 0;
  let candidateStart = (targetIpLong & maskLong) >>> 0;
  const blockSize = (1 << (32 - cidrVal)) >>> 0;

  // Search up to 256 subnet blocks forward
  for (let step = 0; step < 256; step++) {
    const candidateEnd = (candidateStart + blockSize - 1) >>> 0;
    
    // Check if [candidateStart, candidateEnd] overlaps with any active range
    let overlaps = false;
    for (let r = 0; r < activeRanges.length; r++) {
      if (candidateStart <= activeRanges[r].end && candidateEnd >= activeRanges[r].start) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      return longToIp(candidateStart);
    }
    
    candidateStart = (candidateStart + blockSize) >>> 0;
  }
  
  return null;
}

// Live previews calculations and alerts
function updatePlannerPreviews() {
  dom.plannerValidationAlerts.innerHTML = '';
  let hasErrors = false;
  let hasWarnings = false;

  const ipValidationErrors = [];
  const overlapsErrors = [];
  const overlapsWarnings = [];
  const overlapsNotes = [];
  
  plannerState.subnets.forEach(sub => {
    if (!sub.ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) || ipToLong(sub.ip) === null) {
      ipValidationErrors.push(`Subnet "${sub.name}" has an invalid network IP address.`);
    }
  });

  if (ipValidationErrors.length === 0) {
    for (let i = 0; i < plannerState.subnets.length; i++) {
      for (let j = i + 1; j < plannerState.subnets.length; j++) {
        const s1 = plannerState.subnets[i];
        const s2 = plannerState.subnets[j];
        const d1 = getSubnetDetails(s1.ip, s1.cidr);
        const d2 = getSubnetDetails(s2.ip, s2.cidr);
        if (d1 && d2) {
          const start1 = d1.networkLong;
          const end1 = d1.broadcastLong;
          const start2 = d2.networkLong;
          const end2 = d2.broadcastLong;
          if (start1 <= end2 && start2 <= end1) {
            // Check if they share the same VLAN
            if (s1.vlan === s2.vlan) {
              if ((s1.port || 47808) === (s2.port || 47808)) {
                overlapsErrors.push({
                  text: `Conflict: Subnet "${s1.name}" and "${s2.name}" overlap in IP range on the same VLAN (VLAN ${s1.vlan || 'default'}) and use the same BACnet port (${s1.port || 47808}). This will cause host IP clashes.`,
                  targetSub: s2
                });
              } else {
                overlapsNotes.push(`Note: Subnets "${s1.name}" and "${s2.name}" share VLAN ${s1.vlan || 'default'} and IP range, but operate on different UDP ports (${s1.port || 47808} vs ${s2.port || 47808}) as separate BACnet networks.`);
              }
            } else {
              overlapsWarnings.push({
                text: `Warning: Subnets "${s1.name}" and "${s2.name}" overlap in IP range but reside on separate VLANs (VLAN ${s1.vlan || 'default'} vs VLAN ${s2.vlan || 'default'}).`,
                targetSub: s2
              });
            }
          }
        }
      }
    }
  }

  // VLAN mapping check
  const vlanMap = {};
  plannerState.subnets.forEach(sub => {
    if (sub.vlan) {
      if (!vlanMap[sub.vlan]) {
        vlanMap[sub.vlan] = [];
      }
      vlanMap[sub.vlan].push(sub.name);
    }
  });

  const duplicateVlansInfo = [];
  Object.keys(vlanMap).forEach(vlan => {
    if (vlanMap[vlan].length > 1) {
      duplicateVlansInfo.push(`Info: Subnets [${vlanMap[vlan].join(', ')}] are co-located on VLAN ${vlan}. While they share a Layer 2 broadcast domain, they remain logically isolated at Layer 3 unless routed.`);
    }
  });

  ipValidationErrors.forEach(err => {
    addPlannerAlert(err, 'error');
    hasErrors = true;
  });
  overlapsErrors.forEach(errObj => {
    const nextFreeIp = findNextAvailableSubnetBlock(errObj.targetSub, errObj.targetSub.cidr);
    if (nextFreeIp) {
      addPlannerAlert(errObj.text, 'error', `Auto-Move ${errObj.targetSub.name} to ${nextFreeIp}`, () => {
        errObj.targetSub.ip = nextFreeIp;
        renderSubnetList();
      });
    } else {
      addPlannerAlert(errObj.text, 'error');
    }
    hasErrors = true;
  });
  overlapsWarnings.forEach(errObj => {
    const nextFreeIp = findNextAvailableSubnetBlock(errObj.targetSub, errObj.targetSub.cidr);
    if (nextFreeIp) {
      addPlannerAlert(errObj.text, 'warning', `Auto-Move ${errObj.targetSub.name} to ${nextFreeIp}`, () => {
        errObj.targetSub.ip = nextFreeIp;
        renderSubnetList();
      });
    } else {
      addPlannerAlert(errObj.text, 'warning');
    }
    hasWarnings = true;
  });
  overlapsNotes.forEach(err => {
    addPlannerAlert(err, 'success');
  });
  duplicateVlansInfo.forEach(err => {
    addPlannerAlert(err, 'warning');
  });

  const enabledBbmds = plannerState.subnets.filter(s => s.bbmdEnabled);
  
  if (plannerState.subnets.length > 1 && enabledBbmds.length === 0) {
    addPlannerAlert('Warning: No BBMDs are enabled. Discovery broadcasts cannot cross subnets.', 'warning');
    hasWarnings = true;
  } else if (plannerState.subnets.length > 1 && enabledBbmds.length === 1) {
    const isolatedSubnets = plannerState.subnets.filter(s => !s.bbmdEnabled && (!s.bmsPlaced || s.bmsRole !== 'fdr'));
    if (isolatedSubnets.length > 0) {
      addPlannerAlert('Warning: Isolated subnets exist. They cannot communicate unless BBMD or FDR is configured.', 'warning');
      hasWarnings = true;
    }
  }

  const bmsSubnet = plannerState.subnets.find(s => s.bmsPlaced);
  if (bmsSubnet) {
    if (bmsSubnet.bmsRole === 'fdr') {
      if (!bmsSubnet.fdrTargetSubnetId) {
        addPlannerAlert('Error: BMS Server configured for FDR but no target BBMD subnet selected.', 'error');
        hasErrors = true;
      } else {
        const targetSubnet = plannerState.subnets.find(s => s.id === bmsSubnet.fdrTargetSubnetId);
        if (!targetSubnet || !targetSubnet.bbmdEnabled) {
          addPlannerAlert(`Error: BMS FDR target subnet "${targetSubnet ? targetSubnet.name : 'Unknown'}" does not have BBMD enabled.`, 'error');
          hasErrors = true;
        }
      }
    }
  } else if (plannerState.subnets.length > 0) {
    addPlannerAlert('Info: No BMS Server is currently defined in the network plan.', 'warning');
    hasWarnings = true;
  }

  if (!hasErrors && !hasWarnings && plannerState.subnets.length > 0) {
    addPlannerAlert('Symmetrical BBMD routing & network configurations valid.', 'success');
  }

  // BMS Server Info Box
  if (!bmsSubnet) {
    dom.plannerPreviewBmsStatus.innerHTML = '<span style="color: var(--text-muted);">Not configured</span>';
  } else {
    const bmsIp = getOffsetIp(bmsSubnet.ip, bmsSubnet.cidr, 20);
    let roleText = '';
    if (bmsSubnet.bmsRole === 'bbmd') {
      roleText = 'participating as local BBMD router node';
    } else if (bmsSubnet.bmsRole === 'fdr') {
      const targetSub = plannerState.subnets.find(s => s.id === bmsSubnet.fdrTargetSubnetId);
      const targetIp = targetSub ? getOffsetIp(targetSub.ip, targetSub.cidr, targetSub.bbmdOffset) : 'N/A';
      roleText = `registered via FDR to remote BBMD at <strong style="color: var(--primary);">${targetIp}</strong>`;
    } else {
      roleText = 'confined to local subnet only (no routing)';
    }
    dom.plannerPreviewBmsStatus.innerHTML = `
      Hosted on Subnet <strong style="color: #fff;">${escapeHtml(bmsSubnet.name)}</strong><br>
      IP Allocation: <strong style="color: #fff;">${bmsIp}</strong> (.20)<br>
      Role: <span style="color: var(--secondary);">${roleText}</span>
    `;
  }

  // BDT Schedule Box
  if (enabledBbmds.length === 0) {
    dom.plannerPreviewBdt.innerHTML = '<span style="color: var(--text-muted);">No BBMDs active. BDT is empty.</span>';
  } else {
    let html = '';
    enabledBbmds.forEach(sub => {
      const selfIp = getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset);
      const otherIps = enabledBbmds
        .filter(s => s.id !== sub.id && (s.port || 47808) === (sub.port || 47808))
        .map(s => getOffsetIp(s.ip, s.cidr, s.bbmdOffset));
        
      html += `<div style="margin-bottom: 0.5rem; padding-bottom: 0.4rem; border-bottom: 1px dashed rgba(255,255,255,0.05);">`;
      html += `<strong style="color: var(--primary);">${escapeHtml(sub.name)} BBMD (${selfIp}:${sub.port || 47808})</strong><br>`;
      if (otherIps.length === 0) {
        html += `<span style="color: var(--text-muted); font-size: 0.75rem;">BDT Table: Empty (No other BBMDs on port ${sub.port || 47808})</span>`;
      } else {
        html += `<span style="font-size: 0.75rem; color: var(--text-secondary);">BDT Entries: [ ${otherIps.join(', ')} ]</span>`;
      }
      html += `</div>`;
    });
    dom.plannerPreviewBdt.innerHTML = html;
  }

  // Live Structure Box
  let structureHtml = '';
  structureHtml += `
    <div class="sheet-item summary">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
      <strong>Sheet 1: Summary</strong> (All Subnets, Gateways, and BDT Schedule)
    </div>
  `;
  
  plannerState.subnets.forEach((sub, i) => {
    const details = getSubnetDetails(sub.ip, sub.cidr);
    const limit = details ? (sub.cidr >= 24 ? details.numHosts : Math.min(details.numHosts, 100)) : 0;
    const vlanStr = sub.vlan ? `VLAN ${sub.vlan}` : 'No VLAN';
    structureHtml += `
      <div class="sheet-item subnet" style="margin-top: 0.25rem;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        <span>Sheet ${i + 2}: <strong>${escapeHtml(sub.name.substring(0, 18))}</strong> (${vlanStr}, ${limit} IPs planned)</span>
      </div>
    `;
  });
  dom.plannerPreviewSheetsStructure.innerHTML = structureHtml;
}

// Append planning warnings/errors
function addPlannerAlert(text, type, actionText = '', actionCallback = null) {
  const alert = document.createElement('div');
  alert.className = `planner-alert ${type}`;
  alert.style.display = 'flex';
  alert.style.alignItems = 'center';
  alert.style.justifyContent = 'space-between';
  alert.style.gap = '0.5rem';
  alert.style.width = '100%';
  
  let icon = '';
  if (type === 'error') {
    icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else if (type === 'warning') {
    icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; flex-shrink: 0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  }
  
  const contentSpan = document.createElement('span');
  contentSpan.style.display = 'flex';
  contentSpan.style.alignItems = 'center';
  contentSpan.style.gap = '0.4rem';
  contentSpan.style.flex = '1';
  contentSpan.innerHTML = `${icon}<span>${escapeHtml(text)}</span>`;
  alert.appendChild(contentSpan);

  if (actionText && actionCallback) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.style.padding = '0.2rem 0.5rem';
    btn.style.fontSize = '0.72rem';
    btn.style.flexShrink = '0';
    btn.style.background = 'var(--primary)';
    btn.style.color = '#000';
    btn.style.border = 'none';
    btn.style.borderRadius = 'var(--radius-sm)';
    btn.style.cursor = 'pointer';
    btn.style.fontWeight = 'bold';
    btn.style.minWidth = 'auto';
    btn.style.flex = 'none';
    btn.innerText = actionText;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      actionCallback();
    });
    alert.appendChild(btn);
  }

  dom.plannerValidationAlerts.appendChild(alert);
}


// Export the design using SheetJS with styling
function exportPlannerXlsx() {
  if (plannerState.subnets.length === 0) {
    alert("Please add at least one subnet to export.");
    return;
  }

  // Style Constants matching ACE IoT Brand Colors (Charcoal background, white text, lime highlights)
  const STYLES = {
    brandHeader: {
      font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'C1D200' } }, // Brand Lime Green
      fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Slate 900
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
    },
    title: {
      font: { name: 'Segoe UI', sz: 15, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Slate 900
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
    },
    subtitle: {
      font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '94A3B8' } },
      fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Slate 900
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 }
    },
    sectionHeader: {
      font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } }, // Slate 800
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'medium', color: { rgb: 'C1D200' } } // Lime Accent Line
      }
    },
    tableHeader: {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '334155' } }, // Slate 700
      alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { rgb: 'C1D200' } }, // Lime Accent Line
        top: { style: 'thin', color: { rgb: '475569' } },
        left: { style: 'thin', color: { rgb: '475569' } },
        right: { style: 'thin', color: { rgb: '475569' } }
      }
    },
    propLabel: {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E293B' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } }, // Slate 100
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      }
    },
    propValue: {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      }
    },
    dataCell: {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '334155' } },
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } }
      }
    },
    dataCellAlt: {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '334155' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }, // Slate 50 Zebra
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } }
      }
    },
    systemReservation: {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '859300' } }, // Accent dark lime
      fill: { patternType: 'solid', fgColor: { rgb: 'F9FED8' } }, // Soft lime highlights
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } }
      }
    },
    bmsReservation: {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1D4ED8' } }, // Blue accent
      fill: { patternType: 'solid', fgColor: { rgb: 'EFF6FF' } }, // Soft Blue
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } }
      }
    },
    brandCardHeader: {
      font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } }, // Dark Charcoal
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
      border: {
        top: { style: 'medium', color: { rgb: 'C1D200' } }, // Highlighted border
        left: { style: 'medium', color: { rgb: 'C1D200' } },
        right: { style: 'medium', color: { rgb: 'C1D200' } }
      }
    },
    brandCardBody: {
      font: { name: 'Segoe UI', sz: 9.5, color: { rgb: '334155' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } }, // Zebra highlight
      alignment: { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 },
      border: {
        left: { style: 'medium', color: { rgb: 'C1D200' } },
        right: { style: 'medium', color: { rgb: 'C1D200' } },
        bottom: { style: 'medium', color: { rgb: 'C1D200' } }
      }
    }
  };

  const makeCell = (val, styleName) => ({
    v: val === null || val === undefined ? "" : val,
    t: typeof val === 'number' ? 'n' : 's',
    s: STYLES[styleName] || STYLES.dataCell
  });

  try {
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet Setup
    const summaryRows = [
      [makeCell("  ACE IoT SOLUTIONS", "brandHeader"), "", "", "", "", "", "", "", ""],
      [makeCell("  BACnet Subnet & BBMD Distribution Summary", "title"), "", "", "", "", "", "", "", ""],
      [makeCell(`  Generated: ${new Date().toLocaleDateString()} | Design Tool by ACE IoT Solutions (aceiotsolutions.com)`, "subtitle"), "", "", "", "", "", "", "", ""],
      [], // spacer
      [makeCell("Subnet Configuration List", "sectionHeader"), "", "", "", "", "", "", "", ""],
      [
        makeCell("Subnet Name", "tableHeader"),
        makeCell("VLAN ID", "tableHeader"),
        makeCell("BACnet UDP Port", "tableHeader"),
        makeCell("Network ID / CIDR", "tableHeader"),
        makeCell("Subnet Mask", "tableHeader"),
        makeCell("Default Gateway IP", "tableHeader"),
        makeCell("Usable IP Range", "tableHeader"),
        makeCell("BBMD IP Address", "tableHeader"),
        makeCell("BMS Server Placement & Role", "tableHeader")
      ]
    ];

    plannerState.subnets.forEach((sub, offset) => {
      const details = getSubnetDetails(sub.ip, sub.cidr);
      const rangeStr = details ? `${details.firstUsable} - ${details.lastUsable}` : 'N/A';
      const maskStr = details ? details.mask : 'N/A';
      const netCidr = `${sub.ip}/${sub.cidr}`;
      const gatewayIp = getOffsetIp(sub.ip, sub.cidr, sub.gatewayOffset);
      const bbmdIp = sub.bbmdEnabled ? getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset) : "None";
      
      let bmsRole = "None";
      if (sub.bmsPlaced) {
        if (sub.bmsRole === 'bbmd') bmsRole = "Local BBMD";
        else if (sub.bmsRole === 'fdr') {
          const targetSub = plannerState.subnets.find(s => s.id === sub.fdrTargetSubnetId);
          bmsRole = `FDR (Registered to BBMD on ${targetSub ? targetSub.name : 'Unknown'})`;
        } else bmsRole = "Local Subnet Only";
      }

      const rowStyle = (offset % 2 === 0) ? "dataCell" : "dataCellAlt";

      summaryRows.push([
        makeCell(sub.name, rowStyle),
        makeCell(sub.vlan || 'None', rowStyle),
        makeCell(sub.port || 47808, rowStyle),
        makeCell(netCidr, rowStyle),
        makeCell(maskStr, rowStyle),
        makeCell(gatewayIp, rowStyle),
        makeCell(rangeStr, rowStyle),
        makeCell(bbmdIp, rowStyle),
        makeCell(bmsRole, rowStyle)
      ]);
    });

    summaryRows.push([]);
    summaryRows.push([]);
    
    // BDT schedule segment
    const bdtSectionHeaderRow = 8 + plannerState.subnets.length;

    summaryRows.push([makeCell("Global Broadcast Distribution Table (BDT) Schedule", "sectionHeader"), "", "", "", "", "", "", "", ""]);
    summaryRows.push([
      makeCell("BBMD IP Address", "tableHeader"),
      makeCell("Subnet Mask", "tableHeader"),
      makeCell("BACnet UDP Port", "tableHeader"),
      makeCell("Subnet Name Reference", "tableHeader"),
      "", "", "", "", ""
    ]);

    const bbmds = plannerState.subnets.filter(s => s.bbmdEnabled).map(s => {
      const details = getSubnetDetails(s.ip, s.cidr);
      return {
        name: s.name,
        ip: getOffsetIp(s.ip, s.cidr, s.bbmdOffset),
        mask: details ? details.mask : 'N/A',
        port: s.port || 47808
      };
    });

    if (bbmds.length === 0) {
      summaryRows.push([
        makeCell("No BBMD routers configured in this network plan. Broadcasts will not cross subnets.", "dataCell"),
        "", "", "", "", "", "", "", ""
      ]);
    } else {
      bbmds.forEach((bbmd, idx) => {
        const rowStyle = (idx % 2 === 0) ? "dataCell" : "dataCellAlt";
        summaryRows.push([
          makeCell(bbmd.ip, rowStyle),
          makeCell(bbmd.mask, rowStyle),
          makeCell(bbmd.port, rowStyle),
          makeCell(bbmd.name, rowStyle),
          "", "", "", "", ""
        ]);
      });
    }

    summaryRows.push([]);
    summaryRows.push([]);
    
    // Brand CTA block calculation
    const bdtCount = Math.max(bbmds.length, 1);
    const brandHeaderRow = bdtSectionHeaderRow + 2 + bdtCount + 2;
    const brandBodyRow = brandHeaderRow + 1;

    summaryRows.push([
      makeCell("ACE IoT Solutions — OT Network Management & Security Services", "brandCardHeader"),
      "", "", "", "", "", "", "", ""
    ]);
    
    summaryRows.push([
      makeCell(
        "Need advanced assistance designing, commissioning, or securing your building network?\n" +
        "ACE IoT Solutions offers hardware-agnostic software and services to keep your building systems resilient:\n\n" +
        "• Sentinel: Our secure BACnet connectivity software. Enables vendor-neutral cloud integrations, secure remote engineering connections, and strict port security.\n" +
        "• Ground Control: Your outsourced OT network management squad. We provide system design validation, remote commissioning checkouts, cybersecurity threat detection, and continuous diagnostics.\n\n" +
        "Get in touch with our team: visit https://aceiotsolutions.com or email us at info@aceiotsolutions.com",
        "brandCardBody"
      ),
      "", "", "", "", "", "", "", ""
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    
    // Widths
    wsSummary['!cols'] = [
      { wch: 25 }, // Subnet Name
      { wch: 10 }, // VLAN ID
      { wch: 15 }, // BACnet UDP Port
      { wch: 20 }, // Network ID / CIDR
      { wch: 18 }, // Subnet Mask
      { wch: 18 }, // Default Gateway IP
      { wch: 28 }, // Usable IP Range
      { wch: 18 }, // BBMD IP Address
      { wch: 38 }  // BMS Placement & Role
    ];

    // Merges
    const summaryMerges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // Brand Header
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }, // Subtitle
      { s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }, // Section 1 Header
      { s: { r: bdtSectionHeaderRow, c: 0 }, e: { r: bdtSectionHeaderRow, c: 8 } }, // Section 2 Header
      { s: { r: brandHeaderRow, c: 0 }, e: { r: brandHeaderRow, c: 8 } }, // Brand Header
      { s: { r: brandBodyRow, c: 0 }, e: { r: brandBodyRow, c: 8 } }  // Brand Body
    ];
    
    if (bbmds.length === 0) {
      summaryMerges.push({ s: { r: bdtSectionHeaderRow + 2, c: 0 }, e: { r: bdtSectionHeaderRow + 2, c: 8 } });
    }

    wsSummary['!merges'] = summaryMerges;
    
    // Row Heights
    const summaryRowHeights = [];
    for (let r = 0; r <= brandBodyRow; r++) {
      summaryRowHeights.push({ hpt: 20 });
    }
    summaryRowHeights[0] = { hpt: 22 }; // Brand Header height
    summaryRowHeights[1] = { hpt: 30 }; // Title height
    summaryRowHeights[2] = { hpt: 20 }; // Subtitle height
    summaryRowHeights[3] = { hpt: 12 }; // spacer row height
    summaryRowHeights[4] = { hpt: 25 };
    summaryRowHeights[bdtSectionHeaderRow] = { hpt: 25 };
    summaryRowHeights[brandHeaderRow] = { hpt: 25 };
    summaryRowHeights[brandBodyRow] = { hpt: 130 }; // Big description height
    
    wsSummary['!rows'] = summaryRowHeights;

    XLSX.utils.book_append_sheet(wb, wsSummary, "Network Summary");

    // 2. Subnet Sheets
    plannerState.subnets.forEach(sub => {
      const details = getSubnetDetails(sub.ip, sub.cidr);
      const subnetRows = [];
      const gatewayIp = getOffsetIp(sub.ip, sub.cidr, sub.gatewayOffset);
      const bbmdIp = sub.bbmdEnabled ? getOffsetIp(sub.ip, sub.cidr, sub.bbmdOffset) : "None";
      const bmsIp = sub.bmsPlaced ? getOffsetIp(sub.ip, sub.cidr, 20) : "None";

      subnetRows.push([makeCell("  ACE IoT SOLUTIONS", "brandHeader"), "", "", "", "", "", "", ""]);
      subnetRows.push([makeCell(`  Subnet Device Planning Log: ${sub.name}`, "title"), "", "", "", "", "", "", ""]);
      subnetRows.push([makeCell(`  Usable IP allocations and host device bindings for segment ${sub.ip}/${sub.cidr}`, "subtitle"), "", "", "", "", "", "", ""]);
      subnetRows.push([]); // spacer
      subnetRows.push([
        makeCell("Subnet Configuration Details", "sectionHeader"), "", "", 
        makeCell(sub.bbmdEnabled ? "BBMD Broadcast Distribution Table (BDT)" : "BBMD Routing Disabled", "sectionHeader"), "", "", "", ""
      ]);
      
      const properties = [
        ["Network IP / CIDR", `${sub.ip}/${sub.cidr}`],
        ["Subnet Mask", details ? details.mask : 'N/A'],
        ["VLAN ID", sub.vlan || 'None'],
        ["BACnet UDP Port", sub.port || 47808],
        ["Default Gateway IP", gatewayIp],
        ["BBMD IP Address", bbmdIp]
      ];

      const otherBbmds = bbmds.filter(b => b.ip !== bbmdIp && b.port === (sub.port || 47808));

      for (let i = 0; i < properties.length; i++) {
        const row = [
          makeCell(properties[i][0], "propLabel"),
          makeCell(properties[i][1], "propValue"),
          makeCell("", "dataCell") // Spacer
        ];

        if (sub.bbmdEnabled) {
          if (i === 0) {
            row.push(makeCell("BBMD IP Address", "tableHeader"));
            row.push(makeCell("Subnet Mask", "tableHeader"));
            row.push(makeCell("Subnet Name Reference", "tableHeader"));
          } else {
            const bdtEntry = otherBbmds[i - 1];
            row.push(makeCell(bdtEntry ? bdtEntry.ip : "", "dataCell"));
            row.push(makeCell(bdtEntry ? bdtEntry.mask : "", "dataCell"));
            row.push(makeCell(bdtEntry ? bdtEntry.name : "", "dataCell"));
          }
        } else {
          if (i === 0) {
            row.push(makeCell("This subnet operates locally. Broadcasts do not traverse routers.", "dataCell"));
            row.push(makeCell("", "dataCell"));
            row.push(makeCell("", "dataCell"));
          } else {
            row.push(makeCell("", "dataCell"));
            row.push(makeCell("", "dataCell"));
            row.push(makeCell("", "dataCell"));
          }
        }
        subnetRows.push(row);
      }

      // Add extra BDT rows if necessary
      if (sub.bbmdEnabled && otherBbmds.length > 5) {
        for (let i = 5; i < otherBbmds.length; i++) {
          subnetRows.push([
            makeCell("", "dataCell"),
            makeCell("", "dataCell"),
            makeCell("", "dataCell"),
            makeCell(otherBbmds[i].ip, "dataCell"),
            makeCell(otherBbmds[i].mask, "dataCell"),
            makeCell(otherBbmds[i].name, "dataCell")
          ]);
        }
      }

      subnetRows.push([]);
      subnetRows.push([]);

      // Device List Table Header
      subnetRows.push([
        makeCell("Planned IP Address", "tableHeader"),
        makeCell("IP Assignment / Reservation", "tableHeader"),
        makeCell("BACnet Device ID", "tableHeader"),
        makeCell("Device Name", "tableHeader"),
        makeCell("Vendor", "tableHeader"),
        makeCell("Device Type", "tableHeader"),
        makeCell("Object Count", "tableHeader"),
        makeCell("Location / Description", "tableHeader")
      ]);

      if (details) {
        const limit = sub.cidr >= 24 ? details.numHosts : Math.min(details.numHosts, 100);
        const startLong = details.firstUsableLong;

        for (let offset = 0; offset < limit; offset++) {
          const currentLong = (startLong + offset) >>> 0;
          const currentIp = longToIp(currentLong);

          let usage = "Available";
          let cellStyle = (offset % 2 === 0) ? "dataCell" : "dataCellAlt";

          if (currentIp === gatewayIp) {
            usage = "Default Gateway";
            cellStyle = "systemReservation";
          } else if (currentIp === bbmdIp) {
            usage = "BBMD Router Node";
            cellStyle = "systemReservation";
          } else if (sub.bmsPlaced && currentIp === bmsIp) {
            usage = `BMS Server (${sub.bmsRole.toUpperCase()})`;
            cellStyle = "bmsReservation";
          }

          subnetRows.push([
            makeCell(currentIp, cellStyle),
            makeCell(usage, cellStyle),
            makeCell("", cellStyle),
            makeCell("", cellStyle),
            makeCell("", cellStyle),
            makeCell("", cellStyle),
            makeCell("", cellStyle),
            makeCell("", cellStyle)
          ]);
        }
      }

      const wsSubnet = XLSX.utils.aoa_to_sheet(subnetRows);
      
      // Column widths
      wsSubnet['!cols'] = [
        { wch: 18 }, // IP
        { wch: 24 }, // Reservation
        { wch: 16 }, // Device ID
        { wch: 22 }, // Name
        { wch: 18 }, // Vendor
        { wch: 18 }, // Type
        { wch: 14 }, // Object Count
        { wch: 28 }  // Location
      ];

      // Merges
      const subnetMerges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Brand Header
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Title
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Subtitle
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Info Section Header
        { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } }  // BDT Section Header
      ];

      if (!sub.bbmdEnabled) {
        subnetMerges.push({ s: { r: 5, c: 3 }, e: { r: 5, c: 5 } });
        subnetMerges.push({ s: { r: 6, c: 3 }, e: { r: 6, c: 5 } });
        subnetMerges.push({ s: { r: 7, c: 3 }, e: { r: 7, c: 5 } });
        subnetMerges.push({ s: { r: 8, c: 3 }, e: { r: 8, c: 5 } });
        subnetMerges.push({ s: { r: 9, c: 3 }, e: { r: 9, c: 5 } });
        subnetMerges.push({ s: { r: 10, c: 3 }, e: { r: 10, c: 5 } });
      }

      wsSubnet['!merges'] = subnetMerges;
      
      // Row Heights
      const subnetRowHeights = [];
      const dataHeaderRow = 4 + 6 + (sub.bbmdEnabled && otherBbmds.length > 5 ? otherBbmds.length - 5 : 0) + 3;
      for (let r = 0; r <= dataHeaderRow; r++) {
        subnetRowHeights.push({ hpt: 20 });
      }
      subnetRowHeights[0] = { hpt: 22 };
      subnetRowHeights[1] = { hpt: 30 };
      subnetRowHeights[2] = { hpt: 20 };
      subnetRowHeights[3] = { hpt: 12 }; // spacer row height
      subnetRowHeights[4] = { hpt: 25 }; // Info & BDT Header
      subnetRowHeights[dataHeaderRow] = { hpt: 25 }; // Table Header
      
      wsSubnet['!rows'] = subnetRowHeights;

      const sanitizedName = sub.name.replace(/[\\\?\*:\/\[\]]/g, "").substring(0, 30);
      XLSX.utils.book_append_sheet(wb, wsSubnet, sanitizedName);
    });

    // 3. Save Book
    XLSX.writeFile(wb, "BACnet_Network_Plan.xlsx");
    
  } catch (err) {
    console.error(err);
    alert("An error occurred while generating the spreadsheet.");
  }
}
