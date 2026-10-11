import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import {
  Database,
  Table,
  Play,
  Download,
  Key,
  ShieldCheck,
  CheckCircle,
  FileCode,
  HardDrive
} from 'lucide-react';

export function DatabasePage() {
  const { showToast } = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  // Table browser state
  const [selectedTable, setSelectedTable] = useState('vehicles');
  const [tableData, setTableData] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage] = useState(1);

  // SQL Console state
  const [sqlQuery, setSqlQuery] = useState(
    'SELECT v.reg_number, v.make, v.model, v.daily_rate, v.status, vc.name as category, l.name as location\nFROM vehicles v\nJOIN vehicle_categories vc ON v.category_id = vc.id\nJOIN locations l ON v.location_id = l.id\nORDER BY v.daily_rate DESC;'
  );
  const [queryResults, setQueryResults] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState('');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getDbOverview();
      setOverview(res.database);
      if (res.database.tables?.length > 0 && !selectedTable) {
        setSelectedTable(res.database.tables[0].name);
      }
    } catch (err) {
      showToast('Failed to load database overview: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchTableRows = async (table, p = 1) => {
    try {
      setTableLoading(true);
      const res = await api.getTableData(table, p, 15);
      setTableData(res);
      setPage(p);
    } catch (err) {
      showToast(`Failed to load rows for ${table}: ` + err.message, 'error');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableRows(selectedTable, 1);
    }
  }, [selectedTable]);

  const handleRunSql = async () => {
    if (!sqlQuery.trim()) return;
    setQueryLoading(true);
    setQueryError('');
    try {
      const res = await api.runSql(sqlQuery);
      setQueryResults(res);
      showToast('Query executed successfully', 'success');
      // If DML executed, refresh overview & table data
      if (res.type === 'EXECUTE') {
        fetchOverview();
        if (selectedTable) fetchTableRows(selectedTable, page);
      }
    } catch (err) {
      setQueryError(err.message);
      showToast('SQL Execution Error', 'error');
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        Inspecting SQLite database schema and constraints...
      </div>
    );
  }

  const currentTableMeta = overview?.tables?.find((t) => t.name === selectedTable);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* DBMS Engine Status Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-paid">Relational Core Active</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
              {overview?.engine}
            </span>
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Database Management System (DBMS)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Direct inspection of normalized tables, foreign keys, indexes, live SQL console, and JSON export.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', border: '1px solid var(--border-subtle)' }}>
            Foreign Keys: <strong style={{ color: 'var(--success)' }}>ON (Strict)</strong>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', border: '1px solid var(--border-subtle)' }}>
            Journal Mode: <strong style={{ color: 'var(--info)' }}>WAL</strong>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', border: '1px solid var(--border-subtle)' }}>
            File Size: <strong>{(overview?.fileSizeBytes / 1024).toFixed(1)} KB</strong>
          </div>
          <a href={api.downloadBackupUrl} download className="btn btn-primary btn-sm">
            <Download size={14} /> Full DB Dump (.JSON)
          </a>
        </div>
      </div>

      {/* SQL Query Console */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCode size={18} color="var(--primary)" /> Interactive SQL Console
          </h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Standard SQL-92 / SQLite dialect
          </span>
        </div>

        <textarea
          rows={4}
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.88rem',
            background: 'var(--bg-primary)',
            lineHeight: 1.4,
            padding: '0.85rem'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
          {/* Quick Query Presets */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() =>
                setSqlQuery(
                  'SELECT b.booking_ref, u.full_name as customer, v.make || " " || v.model as vehicle, b.estimated_total, b.status\nFROM bookings b\nJOIN customers c ON b.customer_id = c.id\nJOIN users u ON c.user_id = u.id\nJOIN vehicles v ON b.vehicle_id = v.id;'
                )
              }
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Bookings & Customers
            </button>
            <button
              onClick={() =>
                setSqlQuery(
                  'SELECT m.maintenance_type, v.reg_number, v.make, v.model, m.cost, m.status, m.service_provider\nFROM maintenance m\nJOIN vehicles v ON m.vehicle_id = v.id;'
                )
              }
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Maintenance & Fleet
            </button>
            <button
              onClick={() =>
                setSqlQuery(
                  'SELECT p.payment_ref, p.amount, p.payment_method, p.payment_date, u.full_name as payer\nFROM payments p\nJOIN customers c ON p.customer_id = c.id\nJOIN users u ON c.user_id = u.id;'
                )
              }
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Financial Payments
            </button>
          </div>

          <button
            onClick={handleRunSql}
            disabled={queryLoading}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={14} /> {queryLoading ? 'Executing...' : 'Run SQL'}
          </button>
        </div>

        {queryError && (
          <div style={{ marginTop: '1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            {queryError}
          </div>
        )}

        {/* Live SQL Results Table */}
        {queryResults && queryResults.type === 'QUERY' && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Returned <strong>{queryResults.count}</strong> row(s):
            </div>
            {queryResults.results?.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: 300 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(queryResults.results[0]).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.results.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{ fontFamily: typeof val === 'number' ? 'var(--font-mono)' : 'inherit' }}>
                            {val !== null && val !== undefined ? String(val) : <em style={{ color: 'var(--text-dim)' }}>NULL</em>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: 'var(--text-dim)', textAlign: 'center' }}>Query returned 0 rows.</div>
            )}
          </div>
        )}

        {queryResults && queryResults.type === 'EXECUTE' && (
          <div style={{ marginTop: '1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--success)' }}>
            Statement executed successfully. Affected rows: <strong>{queryResults.changes}</strong>. Last Insert ID: {queryResults.lastInsertRowid}.
          </div>
        )}
      </div>

      {/* Relational Table Browser */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Table Selector Sidebar */}
        <div className="glass-card" style={{ padding: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            Relational Entities ({overview?.tables?.length || 0})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {overview?.tables?.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  fontWeight: selectedTable === t.name ? 700 : 500,
                  background: selectedTable === t.name ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: selectedTable === t.name ? 'var(--primary)' : 'var(--text-main)',
                  border: selectedTable === t.name ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                  <Table size={14} /> {t.name}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 4, color: 'var(--text-dim)' }}>
                  {t.rowCount}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Table Data & Columns Explorer */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                Table: {selectedTable}
              </h4>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                Total Records: <strong>{tableData?.totalRows || 0}</strong> • Columns: <strong>{tableData?.columns?.length || 0}</strong>
              </div>
            </div>

            {/* Pagination */}
            {tableData && tableData.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => fetchTableRows(selectedTable, page - 1)}
                  className="btn btn-secondary btn-sm"
                >
                  Prev
                </button>
                <span>
                  Page {page} of {tableData.totalPages}
                </span>
                <button
                  disabled={page >= tableData.totalPages}
                  onClick={() => fetchTableRows(selectedTable, page + 1)}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Foreign Keys pill if any */}
          {currentTableMeta?.foreignKeys?.length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {currentTableMeta.foreignKeys.map((fk, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: '#a5b4fc',
                    padding: '2px 8px',
                    borderRadius: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Key size={11} /> FK: {fk.from} ➔ {fk.table}({fk.to})
                </span>
              ))}
            </div>
          )}

          {/* Table Data Rows */}
          {tableLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading rows...
            </div>
          ) : tableData?.rows?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Table is currently empty.
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 420 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {tableData?.columns?.map((col) => (
                      <th key={col.cid}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {col.pk && <Key size={12} color="#f59e0b" />}
                          <span>{col.name}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 400 }}>({col.type})</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData?.rows?.map((row, i) => (
                    <tr key={i}>
                      {tableData.columns.map((col) => (
                        <td key={col.cid} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {row[col.name] !== null && row[col.name] !== undefined ? (
                            String(row[col.name])
                          ) : (
                            <em style={{ color: 'var(--text-dim)' }}>NULL</em>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
