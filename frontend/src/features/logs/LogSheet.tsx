import React, { useRef } from "react";
import type { DailyLog, DutyStatus } from "../../types/trip";
import { Printer, Download, FileText, Image as ImageIcon } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface LogSheetProps {
  log: DailyLog;
  dayIndex: number;
  totalDays: number;
  onDownloadAll?: () => void;
  allLogs?: DailyLog[];
}

export const LogSheet: React.FC<LogSheetProps> = ({
  log,
  dayIndex,
  totalDays,
  onDownloadAll,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Status to Y-coordinate mapping for the 4 rows
  // Grid bounds: X from 120 to 880 (width = 760). Y from 160 to 300 (height = 140, 35px per row)
  const GRID_X_START = 120;
  const GRID_WIDTH = 760;
  const ROW_HEIGHT = 35;
  const GRID_Y_START = 160;

  const STATUS_Y_MAP: Record<DutyStatus, number> = {
    OFF: GRID_Y_START + ROW_HEIGHT * 0.5,      // 177.5
    SB: GRID_Y_START + ROW_HEIGHT * 1.5,       // 212.5
    DRIVING: GRID_Y_START + ROW_HEIGHT * 2.5,  // 247.5
    ON_DUTY: GRID_Y_START + ROW_HEIGHT * 3.5,  // 282.5
  };

  const getMinuteX = (dateStr: string): number => {
    const d = new Date(dateStr);
    const minutes = d.getHours() * 60 + d.getMinutes();
    return GRID_X_START + (minutes / 1440.0) * GRID_WIDTH;
  };

  // Build SVG path for the continuous blue ink line
  const buildDutyLinePath = (): string => {
    if (!log.segments || log.segments.length === 0) return "";

    let path = "";
    let prevY: number | null = null;

    log.segments.forEach((seg, idx) => {
      const x1 = getMinuteX(seg.start);
      const x2 = getMinuteX(seg.end);
      const y = STATUS_Y_MAP[seg.status] || STATUS_Y_MAP.OFF;

      if (idx === 0) {
        path += `M ${x1.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        // Vertical step transition from previous row if duty status changed
        if (prevY !== null && prevY !== y) {
          path += ` L ${x1.toFixed(1)} ${prevY.toFixed(1)} L ${x1.toFixed(1)} ${y.toFixed(1)}`;
        }
        // Horizontal active duty segment
        path += ` L ${x2.toFixed(1)} ${y.toFixed(1)}`;
      }
      prevY = y;
    });

    return path;
  };

  const dutyLinePath = buildDutyLinePath();

  // Print current sheet
  const handlePrint = () => {
    window.print();
  };

  // Export current sheet to PNG
  const handleDownloadPNG = async () => {
    if (!sheetRef.current) return;
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2, // High resolution
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Driver_Daily_Log_${log.date}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error("Failed to generate PNG:", err);
    }
  };

  // Export current sheet to PDF
  const handleDownloadPDF = async () => {
    if (!sheetRef.current) return;
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
      });
      pdf.addImage(imgData, "JPEG", 0.4, 0.4, 10.2, 7.7);
      pdf.save(`Driver_Daily_Log_${log.date}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">
            Log Sheet {dayIndex + 1} of {totalDays}:
          </span>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {log.date}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            &bull; Total Driving Today:{" "}
            <strong className="text-slate-200 font-mono">{log.total_miles} mi</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
            title="Print sheet (Letter Landscape)"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
            title="Save PNG image"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
            title="Download PDF document"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>PDF</span>
          </button>

          {onDownloadAll && (
            <button
              type="button"
              onClick={onDownloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md transition"
              title="Download all daily logs in a single multi-page PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Download All ({totalDays})</span>
            </button>
          )}
        </div>
      </div>

      {/* Authentic Paper Log Sheet Container */}
      <div className="overflow-x-auto pb-4">
        <div
          ref={sheetRef}
          className="log-sheet-container min-w-[960px] max-w-[1050px] mx-auto bg-[#fcfcf9] text-black border border-slate-300 rounded-xl shadow-paper p-6 font-sans relative select-none"
        >
          <svg
            viewBox="0 0 1000 700"
            className="w-full h-auto"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            {/* ========================================================
                1. HEADER SECTION
            ======================================================== */}
            {/* Title */}
            <text x="20" y="32" fontSize="22" fontWeight="bold" fill="#000000">
              Drivers Daily Log
            </text>
            <text x="200" y="32" fontSize="12" fill="#333333">
              (24 hours)
            </text>

            {/* Date block */}
            <g transform="translate(360, 15)">
              <line x1="0" y1="18" x2="60" y2="18" stroke="#333" strokeWidth="1" />
              <line x1="75" y1="18" x2="135" y2="18" stroke="#333" strokeWidth="1" />
              <line x1="150" y1="18" x2="220" y2="18" stroke="#333" strokeWidth="1" />
              <text x="30" y="27" fontSize="9" textAnchor="middle" fill="#555">
                (month)
              </text>
              <text x="105" y="27" fontSize="9" textAnchor="middle" fill="#555">
                (day)
              </text>
              <text x="185" y="27" fontSize="9" textAnchor="middle" fill="#555">
                (year)
              </text>

              {/* Filled Date values in Caveat font */}
              <text
                x="30"
                y="14"
                fontFamily="Caveat, cursive"
                fontSize="18"
                fontWeight="bold"
                fill="#1d4ed8"
                textAnchor="middle"
              >
                {log.date.slice(5, 7)}
              </text>
              <text
                x="105"
                y="14"
                fontFamily="Caveat, cursive"
                fontSize="18"
                fontWeight="bold"
                fill="#1d4ed8"
                textAnchor="middle"
              >
                {log.date.slice(8, 10)}
              </text>
              <text
                x="185"
                y="14"
                fontFamily="Caveat, cursive"
                fontSize="18"
                fontWeight="bold"
                fill="#1d4ed8"
                textAnchor="middle"
              >
                {log.date.slice(0, 4)}
              </text>
            </g>

            {/* Legal Notice */}
            <text x="630" y="22" fontSize="9" fill="#444">
              Original - File at home terminal.
            </text>
            <text x="630" y="34" fontSize="9" fill="#444">
              Duplicate - Driver retains in his/her possession for 8 days.
            </text>

            {/* From / To line */}
            <text x="20" y="65" fontSize="13" fontWeight="bold" fill="#000">
              From:
            </text>
            <line x1="65" y1="68" x2="440" y2="68" stroke="#000" strokeWidth="1.2" />
            <text
              x="80"
              y="63"
              fontFamily="Caveat, cursive"
              fontSize="17"
              fontWeight="bold"
              fill="#1d4ed8"
            >
              {log.header.from_location}
            </text>

            <text x="470" y="65" fontSize="13" fontWeight="bold" fill="#000">
              To:
            </text>
            <line x1="500" y1="68" x2="960" y2="68" stroke="#000" strokeWidth="1.2" />
            <text
              x="520"
              y="63"
              fontFamily="Caveat, cursive"
              fontSize="17"
              fontWeight="bold"
              fill="#1d4ed8"
            >
              {log.header.to_location}
            </text>

            {/* Miles boxes and Carrier lines */}
            {/* Box 1: Total Miles Driving Today */}
            <rect x="20" y="80" width="130" height="30" fill="none" stroke="#000" strokeWidth="1" />
            <text
              x="85"
              y="102"
              fontFamily="Caveat, cursive"
              fontSize="20"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.total_miles}
            </text>
            <text x="85" y="122" fontSize="8.5" textAnchor="middle" fill="#333">
              Total Miles Driving Today
            </text>

            {/* Box 2: Total Mileage Today */}
            <rect x="160" y="80" width="130" height="30" fill="none" stroke="#000" strokeWidth="1" />
            <text
              x="225"
              y="102"
              fontFamily="Caveat, cursive"
              fontSize="20"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.total_mileage}
            </text>
            <text x="225" y="122" fontSize="8.5" textAnchor="middle" fill="#333">
              Total Mileage Today
            </text>

            {/* Box 3: Truck/Tractor Numbers */}
            <rect x="20" y="128" width="270" height="24" fill="none" stroke="#000" strokeWidth="1" />
            <text
              x="155"
              y="145"
              fontFamily="Caveat, cursive"
              fontSize="16"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.header.vehicle_numbers}
            </text>
            <text x="155" y="160" fontSize="7.5" textAnchor="middle" fill="#444">
              Truck/Tractor and Trailer Numbers or License Plate(s)/State (show each unit)
            </text>

            {/* Carrier Information Lines */}
            <g transform="translate(340, 75)">
              {/* Carrier Name */}
              <line x1="0" y1="20" x2="620" y2="20" stroke="#000" strokeWidth="1" />
              <text x="310" y="29" fontSize="8.5" textAnchor="middle" fill="#444">
                Name of Carrier or Carriers
              </text>
              <text
                x="20"
                y="16"
                fontFamily="Caveat, cursive"
                fontSize="17"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                {log.header.carrier_name}
              </text>

              {/* Main Office Address */}
              <line x1="0" y1="46" x2="620" y2="46" stroke="#000" strokeWidth="1" />
              <text x="310" y="55" fontSize="8.5" textAnchor="middle" fill="#444">
                Main Office Address
              </text>
              <text
                x="20"
                y="42"
                fontFamily="Caveat, cursive"
                fontSize="16"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                {log.header.main_office_address}
              </text>

              {/* Home Terminal Address */}
              <line x1="0" y1="72" x2="620" y2="72" stroke="#000" strokeWidth="1" />
              <text x="310" y="81" fontSize="8.5" textAnchor="middle" fill="#444">
                Home Terminal Address
              </text>
              <text
                x="20"
                y="68"
                fontFamily="Caveat, cursive"
                fontSize="16"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                {log.header.home_terminal_address}
              </text>
            </g>

            {/* ========================================================
                2. 24-HOUR GRAPH GRID (FMCSR § 395.8)
            ======================================================== */}
            {/* Top Hour Bar Banner */}
            <rect x={GRID_X_START} y="160" width={GRID_WIDTH} height="18" fill="#111827" />
            <rect x="880" y="160" width="80" height="18" fill="#111827" />
            <text x="920" y="172" fontSize="9" fontWeight="bold" fill="#ffffff" textAnchor="middle">
              Total Hours
            </text>

            {/* Hour Labels */}
            {Array.from({ length: 25 }).map((_, i) => {
              const x = GRID_X_START + (i * GRID_WIDTH) / 24;
              let label = `${i % 12 || 12}`;
              if (i === 0 || i === 24) label = "Mid-night";
              else if (i === 12) label = "Noon";

              return (
                <text
                  key={`hr-lbl-${i}`}
                  x={x}
                  y="172"
                  fontSize={i === 0 || i === 12 || i === 24 ? "8" : "9"}
                  fontWeight={i === 0 || i === 12 || i === 24 ? "bold" : "normal"}
                  fill="#ffffff"
                  textAnchor="middle"
                >
                  {label}
                </text>
              );
            })}

            {/* Row Labels (Left Column) */}
            <text x="18" y="196" fontSize="10.5" fontWeight="bold" fill="#000">
              1. Off Duty
            </text>
            <text x="18" y="231" fontSize="10.5" fontWeight="bold" fill="#000">
              2. Sleeper Berth
            </text>
            <text x="18" y="266" fontSize="10.5" fontWeight="bold" fill="#000">
              3. Driving
            </text>
            <text x="18" y="301" fontSize="10.5" fontWeight="bold" fill="#000">
              4. On Duty (not driving)
            </text>

            {/* Grid Box Borders */}
            <rect
              x={GRID_X_START}
              y="178"
              width={GRID_WIDTH}
              height={ROW_HEIGHT * 4}
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
            />

            {/* Horizontal Row Divider Lines */}
            {[1, 2, 3].map((rowIdx) => {
              const y = 178 + rowIdx * ROW_HEIGHT;
              return (
                <line
                  key={`row-line-${rowIdx}`}
                  x1={GRID_X_START}
                  y1={y}
                  x2={GRID_X_START + GRID_WIDTH}
                  y2={y}
                  stroke="#000000"
                  strokeWidth="1"
                />
              );
            })}

            {/* 15-Minute Resolution Tick Marks */}
            {Array.from({ length: 97 }).map((_, i) => {
              const x = GRID_X_START + (i * GRID_WIDTH) / 96;
              const isHour = i % 4 === 0;
              const isHalf = i % 2 === 0 && !isHour;
              const isQuarter = !isHour && !isHalf;

              return [0, 1, 2, 3].map((rowIdx) => {
                const rowTop = 178 + rowIdx * ROW_HEIGHT;
                const rowBottom = rowTop + ROW_HEIGHT;

                let y1 = rowTop;
                let y2 = rowBottom;

                if (isQuarter) {
                  y1 = rowTop + 13;
                  y2 = rowTop + 22;
                } else if (isHalf) {
                  y1 = rowTop + 8;
                  y2 = rowTop + 27;
                }

                return (
                  <line
                    key={`tick-${i}-row-${rowIdx}`}
                    x1={x}
                    y1={y1}
                    x2={x}
                    y2={y2}
                    stroke={isHour ? "#000000" : isHalf ? "#555555" : "#888888"}
                    strokeWidth={isHour ? 1 : 0.6}
                  />
                );
              });
            })}

            {/* Right Column: Total Hours Lines and Values */}
            <rect
              x="880"
              y="178"
              width="80"
              height={ROW_HEIGHT * 4}
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
            />
            {[1, 2, 3].map((rowIdx) => (
              <line
                key={`tot-div-${rowIdx}`}
                x1="880"
                y1={178 + rowIdx * ROW_HEIGHT}
                x2="960"
                y2={178 + rowIdx * ROW_HEIGHT}
                stroke="#000000"
                strokeWidth="1"
              />
            ))}

            {/* Hours per row (Rounded via Largest Remainder to sum to 24.00) */}
            <text
              x="920"
              y="200"
              fontFamily="Caveat, cursive"
              fontSize="18"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.hours.off.toFixed(2)}
            </text>
            <text
              x="920"
              y="235"
              fontFamily="Caveat, cursive"
              fontSize="18"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.hours.sb.toFixed(2)}
            </text>
            <text
              x="920"
              y="270"
              fontFamily="Caveat, cursive"
              fontSize="18"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.hours.driving.toFixed(2)}
            </text>
            <text
              x="920"
              y="305"
              fontFamily="Caveat, cursive"
              fontSize="18"
              fontWeight="bold"
              fill="#1d4ed8"
              textAnchor="middle"
            >
              {log.hours.on_duty.toFixed(2)}
            </text>

            {/* Sum = 24.00 Line */}
            <line x1="880" y1="324" x2="960" y2="324" stroke="#000" strokeWidth="1.5" />
            <line x1="880" y1="327" x2="960" y2="327" stroke="#000" strokeWidth="1" />
            <text
              x="920"
              y="342"
              fontFamily="JetBrains Mono, monospace"
              fontSize="12"
              fontWeight="bold"
              fill="#000"
              textAnchor="middle"
            >
              = 24.00
            </text>

            {/* ========================================================
                3. THE BLUE INK DUTY LINE (#1d4ed8, 3px, round joins)
            ======================================================== */}
            {dutyLinePath && (
              <path
                d={dutyLinePath}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* ========================================================
                4. REMARKS & ROTATED CITY/STATE LABELS
            ======================================================== */}
            <text x="20" y="340" fontSize="14" fontWeight="bold" fill="#000">
              Remarks
            </text>

            {/* Ticks and -60 degree angled labels for each change */}
            {log.remarks &&
              log.remarks.map((rem, idx) => {
                const [hh, mm] = rem.time.split(":").map(Number);
                const minutes = hh * 60 + mm;
                const x = GRID_X_START + (minutes / 1440.0) * GRID_WIDTH;

                // Alternate label heights slightly to avoid text overlap
                const yOffset = idx % 2 === 0 ? 340 : 355;

                return (
                  <g key={`rem-${idx}`} transform={`translate(${x}, 320)`}>
                    {/* Small vertical tick under grid */}
                    <line x1="0" y1="-2" x2="0" y2="10" stroke="#1d4ed8" strokeWidth="1.5" />
                    {/* Angled city/state remark text */}
                    <text
                      x="0"
                      y={yOffset - 320}
                      transform={`rotate(-58, 0, ${yOffset - 320})`}
                      fontFamily="Caveat, cursive"
                      fontSize="14"
                      fontWeight="bold"
                      fill="#1d4ed8"
                      textAnchor="end"
                    >
                      {rem.location}
                    </text>
                  </g>
                );
              })}

            {/* Shipping Documents Box */}
            <g transform="translate(20, 430)">
              <rect x="0" y="0" width="940" height="90" fill="none" stroke="#000" strokeWidth="1.2" />
              <text x="12" y="20" fontSize="11" fontWeight="bold" fill="#000">
                Shipping Documents:
              </text>

              <text x="12" y="42" fontSize="9.5" fill="#333">
                DVL or Manifest No. or:
              </text>
              <line x1="130" y1="44" x2="450" y2="44" stroke="#000" strokeWidth="1" />
              <text
                x="140"
                y="40"
                fontFamily="Caveat, cursive"
                fontSize="16"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                {log.header.shipping_doc_no}
              </text>

              <text x="12" y="70" fontSize="9.5" fill="#333">
                Shipper &amp; Commodity:
              </text>
              <line x1="130" y1="72" x2="880" y2="72" stroke="#000" strokeWidth="1" />
              <text
                x="140"
                y="68"
                fontFamily="Caveat, cursive"
                fontSize="16"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                {log.header.shipper_commodity}
              </text>

              <text x="480" y="24" fontSize="8.5" fill="#555" fontStyle="italic">
                Enter name of place you reported and where released from work and when and where each change of duty occurred. Use time standard of home terminal.
              </text>
            </g>

            {/* ========================================================
                5. RECAP BLOCK (70 Hour / 8 Day Drivers)
            ======================================================== */}
            <g transform="translate(20, 535)">
              <rect x="0" y="0" width="940" height="150" fill="none" stroke="#000" strokeWidth="1.5" />

              <text x="12" y="20" fontSize="11" fontWeight="bold" fill="#000">
                Recap: Complete at end of day
              </text>

              {/* 70 Hour / 8 Day Section */}
              <text x="150" y="20" fontSize="11" fontWeight="bold" fill="#000">
                70 Hour / 8 Day Drivers
              </text>

              {/* Today's on-duty */}
              <text x="20" y="50" fontSize="9.5" fill="#333">
                On duty hours today,
              </text>
              <text x="20" y="64" fontSize="9.5" fill="#333">
                Total lines 3 &amp; 4:
              </text>
              <rect x="135" y="44" width="70" height="24" fill="none" stroke="#000" strokeWidth="1" />
              <text
                x="170"
                y="61"
                fontFamily="JetBrains Mono, monospace"
                fontSize="13"
                fontWeight="bold"
                fill="#1d4ed8"
                textAnchor="middle"
              >
                {log.recap.on_duty_today.toFixed(2)}
              </text>

              {/* Line A */}
              <g transform="translate(225, 35)">
                <text x="0" y="12" fontSize="10" fontWeight="bold" fill="#000">
                  A.
                </text>
                <line x1="20" y1="12" x2="160" y2="12" stroke="#000" strokeWidth="1" />
                <text
                  x="80"
                  y="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="13"
                  fontWeight="bold"
                  fill="#1d4ed8"
                  textAnchor="middle"
                >
                  {log.recap.line_a.toFixed(2)}
                </text>
                <text x="0" y="26" fontSize="8.5" fill="#444">
                  A. Total hours on duty last
                </text>
                <text x="0" y="38" fontSize="8.5" fill="#444">
                  7 days including today.
                </text>
              </g>

              {/* Line B */}
              <g transform="translate(410, 35)">
                <text x="0" y="12" fontSize="10" fontWeight="bold" fill="#000">
                  B.
                </text>
                <line x1="20" y1="12" x2="160" y2="12" stroke="#000" strokeWidth="1" />
                <text
                  x="80"
                  y="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="13"
                  fontWeight="bold"
                  fill="#1d4ed8"
                  textAnchor="middle"
                >
                  {log.recap.line_b.toFixed(2)}
                </text>
                <text x="0" y="26" fontSize="8.5" fill="#444">
                  B. Total hours available
                </text>
                <text x="0" y="38" fontSize="8.5" fill="#444">
                  tomorrow 70 hr. minus A*
                </text>
              </g>

              {/* Line C */}
              <g transform="translate(595, 35)">
                <text x="0" y="12" fontSize="10" fontWeight="bold" fill="#000">
                  C.
                </text>
                <line x1="20" y1="12" x2="160" y2="12" stroke="#000" strokeWidth="1" />
                <text
                  x="80"
                  y="9"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="13"
                  fontWeight="bold"
                  fill="#1d4ed8"
                  textAnchor="middle"
                >
                  {log.recap.line_c.toFixed(2)}
                </text>
                <text x="0" y="26" fontSize="8.5" fill="#444">
                  C. Total hours on duty last
                </text>
                <text x="0" y="38" fontSize="8.5" fill="#444">
                  5 days including today.
                </text>
              </g>

              {/* 34-hour restart note */}
              <text x="775" y="42" fontSize="8" fill="#555">
                *If you took 34 consecutive
              </text>
              <text x="775" y="54" fontSize="8" fill="#555">
                hours off duty you have
              </text>
              <text x="775" y="66" fontSize="8" fill="#555">
                70 hours available.
              </text>

              {/* Driver Certification Signature Line */}
              <line x1="20" y1="100" x2="920" y2="100" stroke="#ccc" strokeWidth="1" />
              <text x="20" y="125" fontSize="10" fontWeight="bold" fill="#000">
                I certify that these entries are true and correct:
              </text>
              <line x1="300" y1="130" x2="650" y2="130" stroke="#000" strokeWidth="1" />
              <text
                x="320"
                y="124"
                fontFamily="Caveat, cursive"
                fontSize="19"
                fontWeight="bold"
                fill="#1d4ed8"
              >
                {log.header.driver_name}
              </text>
              <text x="475" y="142" fontSize="8.5" textAnchor="middle" fill="#555">
                (Driver&apos;s Signature in Full)
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
