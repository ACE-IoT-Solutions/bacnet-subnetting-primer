import { PlannerSubnet } from './planner';
import { getSubnetDetails, getOffsetIp, longToIp } from './subnet';

// Style Constants matching ACE IoT Brand Colors (Charcoal background, white text, lime highlights)
export const STYLES = {
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

export type CellValue = string | number | boolean | null | undefined;
export type RowCell = ReturnType<typeof makeCell> | string | number | boolean;

export function makeCell(val: CellValue, styleName: keyof typeof STYLES) {
  let sanitizedVal: string | number | boolean = "";
  if (val !== null && val !== undefined) {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
        sanitizedVal = `'` + val;
      } else {
        sanitizedVal = val;
      }
    } else {
      sanitizedVal = val;
    }
  }
  return {
    v: sanitizedVal,
    t: (typeof sanitizedVal === 'number' ? 'n' : (typeof sanitizedVal === 'boolean' ? 'b' : 's')) as 'n' | 'b' | 's',
    s: STYLES[styleName] || STYLES.dataCell
  };
}

export async function exportPlannerXlsx(subnets: PlannerSubnet[], splitHorizon: boolean) {
  if (subnets.length === 0) {
    alert("Please add at least one subnet to export.");
    return;
  }

  const XLSX = await import('xlsx-js-style');

  try {
    const wb = XLSX.utils.book_new();

    // 1. Summary Sheet Setup
    const summaryRows: RowCell[][] = [
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

    subnets.forEach((sub, offset) => {
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
          const targetSub = subnets.find(s => s.id === sub.fdrTargetSubnetId);
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
    const bdtSectionHeaderRow = 8 + subnets.length;

    summaryRows.push([makeCell("Global Broadcast Distribution Table (BDT) Schedule", "sectionHeader"), "", "", "", "", "", "", "", ""]);
    summaryRows.push([
      makeCell("BBMD IP Address", "tableHeader"),
      makeCell("Subnet Mask", "tableHeader"),
      makeCell("BACnet UDP Port", "tableHeader"),
      makeCell("Subnet Name Reference", "tableHeader"),
      "", "", "", "", ""
    ]);

    const bbmds = subnets.filter(s => s.bbmdEnabled).map(s => {
      const details = getSubnetDetails(s.ip, s.cidr);
      return {
        id: s.id,
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
    const summaryRowHeights: { hpt: number }[] = [];
    for (let r = 0; r <= brandBodyRow; r++) {
      summaryRowHeights.push({ hpt: 20 });
    }
    summaryRowHeights[0] = { hpt: 22 };
    summaryRowHeights[1] = { hpt: 30 };
    summaryRowHeights[2] = { hpt: 20 };
    summaryRowHeights[3] = { hpt: 12 };
    summaryRowHeights[4] = { hpt: 25 };
    summaryRowHeights[bdtSectionHeaderRow] = { hpt: 25 };
    summaryRowHeights[brandHeaderRow] = { hpt: 25 };
    summaryRowHeights[brandBodyRow] = { hpt: 130 };

    wsSummary['!rows'] = summaryRowHeights;

    XLSX.utils.book_append_sheet(wb, wsSummary, "Network Summary");

    // 2. Subnet Sheets
    subnets.forEach(sub => {
      const details = getSubnetDetails(sub.ip, sub.cidr);
      const subnetRows: RowCell[][] = [];
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

      const allowedTargets = sub.routeTargets || [];
      const otherBbmds = bbmds.filter(b => b.id !== sub.id && b.port === (sub.port || 47808) && (!splitHorizon || allowedTargets.includes(b.id)));

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
        const plannedIps = sub.plannedDevices || details.numHosts;
        const limit = details.numHosts <= 1024 ? details.numHosts : Math.min(details.numHosts, Math.max(plannedIps, 100));
        const startLong = details.firstUsableLong;

        if (startLong !== null) {
          for (let offset = 0; offset < limit; offset++) {
            const currentLong = (startLong + offset) >>> 0;
            const currentIp = longToIp(currentLong);

            let usage = "Available";
            let cellStyle: keyof typeof STYLES = (offset % 2 === 0) ? "dataCell" : "dataCellAlt";

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
      const subnetRowHeights: { hpt: number }[] = [];
      const dataHeaderRow = 4 + 6 + (sub.bbmdEnabled && otherBbmds.length > 5 ? otherBbmds.length - 5 : 0) + 3;
      for (let r = 0; r <= dataHeaderRow; r++) {
        subnetRowHeights.push({ hpt: 20 });
      }
      subnetRowHeights[0] = { hpt: 22 };
      subnetRowHeights[1] = { hpt: 30 };
      subnetRowHeights[2] = { hpt: 20 };
      subnetRowHeights[3] = { hpt: 12 };
      subnetRowHeights[4] = { hpt: 25 };
      subnetRowHeights[dataHeaderRow] = { hpt: 25 };

      wsSubnet['!rows'] = subnetRowHeights;

      const sanitizedName = sub.name.replace(/[\\\?\*:\/\[\]]/g, "").substring(0, 30);
      XLSX.utils.book_append_sheet(wb, wsSubnet, sanitizedName);
    });

    XLSX.writeFile(wb, `BACnet_Network_Plan_${new Date().toISOString().split('T')[0]}.xlsx`);

  } catch (err) {
    console.error(err);
    alert("An error occurred while generating the spreadsheet.");
  }
}
