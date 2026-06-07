import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../shared/Navbar";
import "../styles/export.css";
import "../styles/reports.css";

import { API_BASE_URL } from "../config/api";

const DATASETS = [
  { key: "detections", label: "Detections",  roles: ["Administrator", "Manager"] },
  { key: "users",      label: "Users",        roles: ["Administrator"] },
  { key: "reports",    label: "Reports",      roles: ["Administrator", "Manager"] },
  { key: "audit-logs", label: "Audit Logs",   roles: ["Administrator"] },
  { key: "feedbacks",  label: "Feedbacks",    roles: ["Administrator", "Manager"] },
];

const FORMATS = ["csv", "json", "excel"];

const IMPORT_COLUMNS = ["name", "email", "password", "role"];

function parseCsvRow(line) {
  const values = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let val = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { val += line[i++]; }
      }
      values.push(val);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      if (end === -1) { values.push(line.slice(i)); break; }
      values.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return values;
}

function parseCsvText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] ?? "").trim(); });
    return obj;
  });
}

function downloadFile(fileName, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  const header = IMPORT_COLUMNS.join(",");
  const example = '"John Doe","john@example.com","password123","User"';
  downloadFile("users-import-template.csv", `${header}\n${example}`, "text/csv");
}

function PreviewTable({ columns, rows }) {
  const preview = rows.slice(0, 5);
  return (
    <div className="export-table-wrapper" style={{ marginTop: 16 }}>
      <div className="export-table-title">
        <span>Preview — first {Math.min(rows.length, 5)} of {rows.length} records</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="export-table">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => <td key={c}>{String(row[c.toLowerCase()] ?? row[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExportData({ currentUser, onLogout, onNavigate }) {
  const [mode, setMode] = useState("export");
  const [dataset, setDataset] = useState("detections");
  const [format, setFormat] = useState("csv");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // import state
  const [importFormat, setImportFormat] = useState("csv");
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  const role = currentUser?.role || "";
  const availableDatasets = DATASETS.filter((d) => d.roles.includes(role));
  const isAdmin = role === "Administrator";

  useEffect(() => {
    if (!currentUser) return;
    if (!availableDatasets.find((d) => d.key === dataset)) {
      setDataset(availableDatasets[0]?.key || "detections");
    }
  }, [role]);

  useEffect(() => {
    if (!currentUser || mode !== "export") return;
    setLoading(true);
    setRows([]);

    const emailParam = `adminEmail=${encodeURIComponent(currentUser.email)}`;

    fetch(`${API_BASE_URL}/admin/export?dataset=${dataset}&format=json&${emailParam}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data.records || data.logs || data.reports || data.feedbacks || data.users || []);
        setRows(arr);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [dataset, mode, currentUser]);

  function handleExport() {
    const emailParam = `adminEmail=${encodeURIComponent(currentUser.email)}`;
    const url = `${API_BASE_URL}/admin/export?dataset=${dataset}&format=${format}&${emailParam}`;

    if (format === "json") {
      const content = JSON.stringify(rows, null, 2);
      downloadFile(`${dataset}-export.json`, content, "application/json");
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset}-export.${format === "excel" ? "xlsx" : format}`;
    link.click();
  }

  function parseFile(file) {
    setImportResult(null);
    setImportRows([]);
    setImportFileName(file.name);

    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      try {
        if (ext === "json") {
          const data = JSON.parse(text);
          setImportRows(Array.isArray(data) ? data : []);
          setImportFormat("json");
        } else {
          setImportRows(parseCsvText(text));
          setImportFormat("csv");
        }
      } catch {
        setImportResult({ ok: false, message: "Could not parse file. Ensure it is valid CSV or JSON." });
      }
    };
    reader.readAsText(file);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) parseFile(file);
  }

  async function handleImport() {
    if (!importRows.length) return;
    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/import?adminEmail=${encodeURIComponent(currentUser.email)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataset: "users", records: importRows }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setImportResult({ ok: true, results: data.results });
      } else {
        setImportResult({ ok: false, message: data.message });
      }
    } catch {
      setImportResult({ ok: false, message: "Could not connect to server." });
    } finally {
      setImporting(false);
    }
  }

  const currentDatasetMeta = DATASETS.find((d) => d.key === dataset);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [rows, search]);
  const columns = filteredRows.length > 0 ? Object.keys(filteredRows[0]) : (rows[0] ? Object.keys(rows[0]) : []);

  function resetSearch() {
    setSearch("");
  }

  if (!currentUser || (!isAdmin && role !== "Manager")) {
    return (
      <div className="home">
        <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />
        <main className="page-shell">
          <p style={{ color: "#b91c1c" }}>Access denied. Manager or Administrator role required.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="home">
      <Navbar currentUser={currentUser} onLogout={onLogout} onNavigate={onNavigate} />

      <main className="page-shell">
        <div className="export-header">
          <span className="eyebrow">{isAdmin ? "Administrator module" : "Manager module"}</span>
          <h1>Export &amp; Import Data</h1>
          <p>Export platform data in CSV, JSON, or Excel format. Administrators can also import users in bulk.</p>
        </div>

        <div className="export-mode-tabs">
          <button
            className={`export-mode-tab ${mode === "export" ? "active" : ""}`}
            onClick={() => setMode("export")}
          >
            Export Data
          </button>
          {isAdmin && (
            <button
              className={`export-mode-tab ${mode === "import" ? "active" : ""}`}
              onClick={() => setMode("import")}
            >
              Import Users
            </button>
          )}
        </div>

        {/* ── EXPORT TAB ── */}
        {mode === "export" && (
          <>
            <div className="export-dataset-pills">
              {availableDatasets.map((d) => (
                <button
                  key={d.key}
                  className={`export-dataset-pill ${dataset === d.key ? "active" : ""}`}
                  onClick={() => setDataset(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <section className="reports-filter-panel export-filter-panel">
              <input
                placeholder="Filter records by user, email, status, or text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="secondary-btn" type="button" onClick={resetSearch}>
                Reset
              </button>
            </section>

            <div className="export-layout">
              {/* Table */}
              <div>
                <div className="export-table-wrapper">
                  <div className="export-table-title">
                    <span>{currentDatasetMeta?.label}</span>
                    <span className="export-table-count">{loading ? "…" : `${filteredRows.length} records`}</span>
                  </div>
                  {loading ? (
                    <p className="export-empty">Loading…</p>
                  ) : filteredRows.length === 0 ? (
                    <p className="export-empty">No records found.</p>
                  ) : (
                    <div className="export-table-scroll">
                      <table className="export-table">
                        <thead>
                          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
                        </thead>
                        <tbody>
                          {filteredRows.slice(0, 10).map((row, i) => (
                            <tr key={i}>
                              {columns.map((c) => (
                                <td key={c} title={String(row[c] ?? "")}>
                                  {String(row[c] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredRows.length > 10 && (
                        <p style={{ color: "#94a3b8", fontSize: 12, padding: "10px 16px", margin: 0 }}>
                          Showing 10 of {filteredRows.length} filtered records.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="export-sidebar-card">
                <h3>Download</h3>

                <div className="export-format-group">
                  <span className="export-format-label">Format</span>
                  <div className="export-format-options">
                    {FORMATS.map((f) => (
                      <button
                        key={f}
                        className={`export-format-btn ${format === f ? "active" : ""}`}
                        onClick={() => setFormat(f)}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-stats">
                  <div className="export-stat-row">
                    <span>Dataset</span>
                    <strong>{currentDatasetMeta?.label}</strong>
                  </div>
                  <div className="export-stat-row">
                    <span>Records</span>
                    <strong>{filteredRows.length}</strong>
                  </div>
                  <div className="export-stat-row">
                    <span>Format</span>
                    <strong>{format.toUpperCase()}</strong>
                  </div>
                </div>

                <button
                  className="export-btn"
                  onClick={handleExport}
                  disabled={rows.length === 0 || loading}
                >
                  {loading ? "Loading…" : `Export ${format.toUpperCase()}`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── IMPORT TAB ── */}
        {mode === "import" && isAdmin && (
          <div className="import-section">
            <div>
              <div
                className={`import-drop-zone ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4-4-4 4M12 8v8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>
                  <strong>Click to upload</strong> or drag &amp; drop<br/>
                  CSV or JSON file
                </p>
                {importFileName && (
                  <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>{importFileName}</span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  className="import-file-input"
                  onChange={handleFileSelect}
                />
              </div>

              {importRows.length > 0 && (
                <PreviewTable columns={IMPORT_COLUMNS} rows={importRows} />
              )}

              {importResult && (
                <div className={`import-result ${importResult.ok ? "import-result--success" : "import-result--error"}`} style={{ marginTop: 16 }}>
                  {importResult.ok ? (
                    <>
                      <strong>Import complete</strong><br />
                      Created: {importResult.results.created} &nbsp;|&nbsp;
                      Skipped: {importResult.results.skipped}
                      {importResult.results.errors.length > 0 && (
                        <ul className="import-errors-list">
                          {importResult.results.errors.map((e, i) => (
                            <li key={i}>{e.email}: {e.reason}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <><strong>Import failed</strong><br />{importResult.message}</>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="export-sidebar-card">
              <h3>Import Users</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                Upload a CSV or JSON file to bulk-create user accounts. Required columns:
              </p>
              <div style={{ background: "#f1f5f9", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#475569", fontFamily: "monospace" }}>
                name, email, password, role
              </div>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                <strong>role</strong> is optional — defaults based on email pattern.
                Maximum 500 records per import.
              </p>

              <button className="import-template-btn" onClick={downloadTemplate}>
                Download CSV Template
              </button>

              <button
                className="import-btn"
                onClick={handleImport}
                disabled={importRows.length === 0 || importing}
              >
                {importing ? "Importing…" : `Import ${importRows.length} User${importRows.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
