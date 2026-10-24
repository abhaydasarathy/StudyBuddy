import React, { useState, useEffect } from "react";
import { 
  Database, 
  Table, 
  RefreshCw, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  ArrowRight,
  ShieldAlert,
  HardDrive,
  Hash,
  Key
} from "lucide-react";
import { fetchDatabaseOverview, fetchTableData } from "../services/api";

export default function DatabaseInspectorView() {
  const [overview, setOverview] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDatabaseOverview();
      setOverview(data);
      if (!selectedTable && data.tables?.length > 0) {
        setSelectedTable(data.tables[0].tableName);
      }
    } catch (err) {
      setError("Failed to query SQLite overview: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTableDetails = async (tableName, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTableData(tableName, page, 20);
      setTableData(data);
      setCurrentPage(page);
    } catch (err) {
      setError(`Failed to read records from table ${tableName}: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      loadTableDetails(selectedTable, 1);
    }
  }, [selectedTable]);

  // Client-side filtering across current page records for easy searching
  const filteredRows = tableData?.rows?.filter((row) => {
    if (!searchTerm.trim()) return true;
    return Object.values(row).some((val) => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  const currentTableMeta = overview?.tables?.find((t) => t.tableName === selectedTable);

  return (
    <div style={{ maxWidth: "1250px", margin: "1.5rem auto", padding: "0 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={24} color="#2563eb" />
            <h1 style={{ fontSize: "1.75rem", color: "#0f172a", margin: 0 }}>
              SQLite Database Inspector
            </h1>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              DEVELOPER MODE
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "4px" }}>
            Direct read-only inspection of persistent records from <code>{overview?.databasePath || "server/studybuddy.sqlite"}</code>
          </p>
        </div>

        <button
          onClick={() => {
            loadOverview();
            if (selectedTable) loadTableDetails(selectedTable, currentPage);
          }}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            color: "#334155",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          <span>Reload SQLite</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#991b1b", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid #fee2e2", marginBottom: "1.25rem", fontSize: "0.88rem" }}>
          {error}
        </div>
      )}

      {/* Main Grid: Left tables directory, Right table record browser */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Tables Roster */}
        <div className="card-elevated" style={{ padding: "1rem", borderRadius: "0.75rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
            Database Tables ({overview?.tablesCount || 0})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {overview?.tables?.map((table) => {
              const isSelected = selectedTable === table.tableName;
              return (
                <button
                  key={table.tableName}
                  onClick={() => setSelectedTable(table.tableName)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.75rem",
                    borderRadius: "6px",
                    border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                    background: isSelected ? "#eff6ff" : "transparent",
                    color: isSelected ? "#2563eb" : "#334155",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.85rem",
                    fontWeight: isSelected ? 600 : 500,
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Table size={16} color={isSelected ? "#2563eb" : "#94a3b8"} />
                    <span>{table.tableName}</span>
                  </div>
                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: "9999px",
                    background: isSelected ? "#2563eb" : "#f1f5f9",
                    color: isSelected ? "#ffffff" : "#64748b"
                  }}>
                    {table.rowCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Table Content */}
        <div className="card-elevated" style={{ padding: "1.5rem", borderRadius: "0.75rem", overflowX: "auto" }}>
          
          {/* Table Header & Search bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.3rem", color: "#0f172a", margin: 0 }}>
                  {selectedTable}
                </h2>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  ({tableData?.totalRows || 0} total records)
                </span>
              </div>
              
              {/* Foreign keys list if any */}
              {currentTableMeta?.foreignKeys?.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "4px", fontSize: "0.72rem", color: "#64748b" }}>
                  <Key size={13} color="#2563eb" />
                  <span>Foreign Keys: </span>
                  {currentTableMeta.foreignKeys.map((fk, idx) => (
                    <span key={idx} style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>
                      {fk.from} → {fk.table}({fk.to})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <Search size={15} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search table rows..."
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem 0.45rem 2rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Table Schema Columns overview chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "1rem", padding: "0.6rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginRight: "4px", alignSelf: "center" }}>
              Columns:
            </span>
            {currentTableMeta?.columns?.map((c) => (
              <span key={c.name} style={{ fontSize: "0.72rem", padding: "2px 6px", borderRadius: "4px", background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155" }}>
                <strong>{c.name}</strong> <span style={{ color: "#64748b" }}>({c.type})</span>
                {c.pk ? <span style={{ color: "#2563eb", fontWeight: 700, marginLeft: "3px" }}>[PK]</span> : ""}
              </span>
            ))}
          </div>

          {/* Records Data Table */}
          {filteredRows.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No records found in table <strong>{selectedTable}</strong> {searchTerm ? "matching search query" : ""}.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
                    {tableData?.columns?.map((col) => (
                      <th key={col} style={{ padding: "0.6rem 0.75rem", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: "1px solid #e2e8f0", 
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fbfcfe" 
                      }}
                    >
                      {tableData?.columns?.map((col) => {
                        const val = row[col];
                        const isJson = typeof val === "string" && (val.startsWith("[") || val.startsWith("{"));
                        return (
                          <td 
                            key={col} 
                            style={{ 
                              padding: "0.6rem 0.75rem", 
                              color: val === null ? "#94a3b8" : "#334155",
                              maxWidth: "280px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis"
                            }}
                            title={String(val)}
                          >
                            {val === null ? <em>NULL</em> : isJson ? <code>{val}</code> : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {tableData && tableData.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Showing page {tableData.page} of {tableData.totalPages}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  disabled={tableData.page <= 1}
                  onClick={() => loadTableDetails(selectedTable, tableData.page - 1)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    background: tableData.page <= 1 ? "#f1f5f9" : "#ffffff",
                    cursor: tableData.page <= 1 ? "not-allowed" : "pointer",
                    fontSize: "0.78rem"
                  }}
                >
                  <ArrowLeft size={13} />
                  <span>Previous</span>
                </button>

                <button
                  disabled={tableData.page >= tableData.totalPages}
                  onClick={() => loadTableDetails(selectedTable, tableData.page + 1)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    background: tableData.page >= tableData.totalPages ? "#f1f5f9" : "#ffffff",
                    cursor: tableData.page >= tableData.totalPages ? "not-allowed" : "pointer",
                    fontSize: "0.78rem"
                  }}
                >
                  <span>Next</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
