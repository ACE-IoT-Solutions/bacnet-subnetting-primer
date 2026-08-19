import type { jsPDF } from 'jspdf';
import type { BbmdReport, BbmdReportDevice } from './bbmd-report';

interface BbmdPdfOptions {
  projectTitle: string;
  theme: 'dark' | 'light';
}

type Rgb = [number, number, number];

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LIME: Rgb = [193, 210, 0];
const PURPLE: Rgb = [167, 139, 250];
const ORANGE: Rgb = [251, 146, 60];

function palette(theme: BbmdPdfOptions['theme']) {
  return theme === 'dark' ? {
    background: [18, 18, 18] as Rgb,
    panel: [30, 34, 48] as Rgb,
    alternate: [37, 41, 56] as Rgb,
    text: [248, 250, 252] as Rgb,
    muted: [148, 163, 184] as Rgb,
    border: [71, 85, 105] as Rgb
  } : {
    background: [255, 255, 255] as Rgb,
    panel: [241, 245, 249] as Rgb,
    alternate: [248, 250, 252] as Rgb,
    text: [15, 23, 42] as Rgb,
    muted: [71, 85, 105] as Rgb,
    border: [203, 213, 225] as Rgb
  };
}

function setFill(pdf: jsPDF, color: Rgb) { pdf.setFillColor(...color); }
function setDraw(pdf: jsPDF, color: Rgb) { pdf.setDrawColor(...color); }
function setText(pdf: jsPDF, color: Rgb) { pdf.setTextColor(...color); }

function addReportPage(pdf: jsPDF, title: string, subtitle: string, options: BbmdPdfOptions) {
  const colors = palette(options.theme);
  pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'landscape');
  setFill(pdf, colors.background);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  setFill(pdf, LIME);
  pdf.rect(0, 0, 9, PAGE_HEIGHT, 'F');
  setText(pdf, colors.text);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.text(title, MARGIN, 38);
  setText(pdf, colors.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(subtitle, MARGIN, 54);
  pdf.text('BACnet Studio by ACE IoT', MARGIN, PAGE_HEIGHT - 18);
  pdf.text(options.projectTitle, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 18, { align: 'right' });
  return 78;
}

function drawMetric(pdf: jsPDF, x: number, y: number, width: number, label: string, value: number, options: BbmdPdfOptions) {
  const colors = palette(options.theme);
  setFill(pdf, colors.panel);
  setDraw(pdf, colors.border);
  pdf.roundedRect(x, y, width, 48, 6, 6, 'FD');
  setText(pdf, LIME);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(String(value), x + 12, y + 21);
  setText(pdf, colors.muted);
  pdf.setFontSize(8);
  pdf.text(label.toUpperCase(), x + 12, y + 37);
}

function drawTableHeader(pdf: jsPDF, y: number, labels: string[], widths: number[], options: BbmdPdfOptions) {
  const colors = palette(options.theme);
  setFill(pdf, options.theme === 'dark' ? [51, 65, 85] : [30, 41, 59]);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 22, 'F');
  setText(pdf, [248, 250, 252]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  let x = MARGIN;
  labels.forEach((label, index) => {
    pdf.text(label.toUpperCase(), x + 7, y + 14);
    x += widths[index];
  });
  return y + 22;
}

function drawTableRow(pdf: jsPDF, y: number, values: string[], widths: number[], index: number, options: BbmdPdfOptions, statusIndex = -1) {
  const colors = palette(options.theme);
  setFill(pdf, index % 2 ? colors.alternate : colors.panel);
  setDraw(pdf, colors.border);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 23, 'FD');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.4);
  let x = MARGIN;
  values.forEach((value, columnIndex) => {
    setText(pdf, columnIndex === statusIndex
      ? value === 'Mutual' ? PURPLE : value.includes('Missing') ? ORANGE : [56, 189, 248]
      : colors.text);
    const clipped = pdf.splitTextToSize(value || '—', widths[columnIndex] - 12)[0] || '—';
    pdf.text(clipped, x + 7, y + 15);
    x += widths[columnIndex];
  });
  return y + 23;
}

function appendPeeringSummary(pdf: jsPDF, report: BbmdReport, options: BbmdPdfOptions) {
  const widths = [165, 120, 35, 165, 120, 165];
  let y = addReportPage(pdf, 'BBMD Peering Summary', 'A concise schedule of modeled mutual and one-way BDT relationships.', options);
  drawMetric(pdf, MARGIN, y, 150, 'BBMD devices', report.devices.length, options);
  drawMetric(pdf, MARGIN + 162, y, 150, 'Mutual peerings', report.mutualCount, options);
  drawMetric(pdf, MARGIN + 324, y, 150, 'One-way entries', report.oneWayCount, options);
  y += 64;
  y = drawTableHeader(pdf, y, ['Source BBMD', 'Source endpoint', 'Link', 'Peer BBMD', 'Peer endpoint', 'Status'], widths, options);
  if (!report.peerings.length) {
    drawTableRow(pdf, y, ['No BDT peerings are modeled.', '', '', '', '', ''], widths, 0, options);
    return;
  }
  report.peerings.forEach((peering, index) => {
    if (y + 23 > PAGE_HEIGHT - 38) {
      y = addReportPage(pdf, 'BBMD Peering Summary', 'Continued', options);
      y = drawTableHeader(pdf, y, ['Source BBMD', 'Source endpoint', 'Link', 'Peer BBMD', 'Peer endpoint', 'Status'], widths, options);
    }
    y = drawTableRow(pdf, y, [
      peering.sourceName,
      peering.sourceEndpoint,
      peering.status === 'Mutual' ? '<->' : '->',
      peering.targetName,
      peering.targetEndpoint,
      peering.status
    ], widths, index, options, 5);
  });
}

function drawDeviceHeading(pdf: jsPDF, y: number, device: BbmdReportDevice, options: BbmdPdfOptions, continued = false) {
  const colors = palette(options.theme);
  setFill(pdf, colors.panel);
  setDraw(pdf, PURPLE);
  pdf.roundedRect(MARGIN, y, CONTENT_WIDTH, 43, 5, 5, 'FD');
  setText(pdf, colors.text);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`${device.name}${continued ? ' (continued)' : ''}`, MARGIN + 11, y + 17);
  setText(pdf, colors.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(`${device.endpoint}  |  ${device.subnetName}  |  ${device.subnetCidr}  |  ${device.entries.length} BDT entries  |  ${device.inboundPeerIds.length} inbound references`, MARGIN + 11, y + 32);
  return y + 49;
}

function appendDeviceTables(pdf: jsPDF, report: BbmdReport, options: BbmdPdfOptions) {
  const widths = [190, 135, 285, 160];
  let y = addReportPage(pdf, 'BBMD Tables', 'Each section represents the modeled BDT on one BBMD device.', options);
  report.devices.forEach((device, deviceIndex) => {
    const minimumSectionHeight = 49 + 22 + 23;
    if (deviceIndex > 0 && y + minimumSectionHeight > PAGE_HEIGHT - 38) y = addReportPage(pdf, 'BBMD Tables', 'Continued', options);
    y = drawDeviceHeading(pdf, y, device, options);
    y = drawTableHeader(pdf, y, ['BDT peer', 'Peer endpoint', 'Peer subnet', 'Relationship'], widths, options);
    if (!device.entries.length) {
      y = drawTableRow(pdf, y, ['No BDT entries configured.', '', '', ''], widths, 0, options);
    } else {
      device.entries.forEach((entry, entryIndex) => {
        if (y + 23 > PAGE_HEIGHT - 38) {
          y = addReportPage(pdf, 'BBMD Tables', 'Continued', options);
          y = drawDeviceHeading(pdf, y, device, options, true);
          y = drawTableHeader(pdf, y, ['BDT peer', 'Peer endpoint', 'Peer subnet', 'Relationship'], widths, options);
        }
        y = drawTableRow(pdf, y, [entry.peerName, entry.peerEndpoint, entry.peerSubnet, entry.status], widths, entryIndex, options, 3);
      });
    }
    y += 14;
  });
}

export function appendBbmdReportPages(pdf: jsPDF, report: BbmdReport, options: BbmdPdfOptions) {
  if (!report.devices.length) return;
  appendPeeringSummary(pdf, report, options);
  appendDeviceTables(pdf, report, options);
}
