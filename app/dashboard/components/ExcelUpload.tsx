'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface TemplateColumn {
  header: string;
  example: string | number;
}

interface ImportResult {
  created: number;
  errors: string[];
}

interface ExcelUploadProps {
  templateColumns: TemplateColumn[];
  templateName: string;
  onImport: (rows: any[]) => Promise<ImportResult> | ImportResult;
  onComplete?: () => void;
}

export default function ExcelUpload({
  templateColumns,
  templateName,
  onImport,
  onComplete,
}: ExcelUploadProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    created: number;
    errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /* ---- Download template ---- */
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = templateColumns.map((c) => c.header);
    const example = templateColumns.map((c) => c.example ?? '');
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // Auto-size columns
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));

    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, templateName);
  };

  /* ---- Upload & parse ---- */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        setResult({
          total: 0,
          created: 0,
          errors: ['No data rows found in the file.'],
        });
        setImporting(false);
        return;
      }

      const { created, errors } = await onImport(rows);
      setResult({ total: rows.length, created, errors });
      if (onComplete) onComplete();
    } catch (err: any) {
      setResult({
        total: 0,
        created: 0,
        errors: [`Failed to read file: ${err.message}`],
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-secondary btn-small"
          onClick={downloadTemplate}
          title="Download Excel template"
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span
              className="material-symbols-rounded"
              style={{ fontSize: '1.2em', marginRight: 4 }}
            >
              download
            </span>{' '}
            Template
          </span>
        </button>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          title="Upload filled Excel file"
        >
          {importing ? (
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span
                className="material-symbols-rounded"
                style={{ fontSize: '1.2em', marginRight: 4 }}
              >
                hourglass_empty
              </span>{' '}
              Importing…
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span
                className="material-symbols-rounded"
                style={{ fontSize: '1.2em', marginRight: 4 }}
              >
                upload
              </span>{' '}
              Upload
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      {/* Result modal */}
      {result && (
        <div className="modal-overlay" onClick={() => setResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-rounded" style={{ marginRight: 6 }}>
                {result.created > 0 ? 'check_circle' : 'warning_amber'}
              </span>{' '}
              {result.created > 0 ? 'Import Complete' : 'Import Result'}
            </h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div className="stat-card" style={{ flex: 1, padding: '12px 16px' }}>
                <div className="stat-label">Rows Found</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                  {result.total}
                </div>
              </div>
              <div className="stat-card stat-green" style={{ flex: 1, padding: '12px 16px' }}>
                <div className="stat-label">Created</div>
                <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                  {result.created}
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="stat-card stat-red" style={{ flex: 1, padding: '12px 16px' }}>
                  <div className="stat-label">Errors</div>
                  <div className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {result.errors.length}
                  </div>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div
                style={{
                  maxHeight: 160,
                  overflowY: 'auto',
                  fontSize: '0.78rem',
                  background: 'var(--bg-highlight)',
                  borderRadius: 8,
                  padding: 12,
                  color: 'var(--rose)',
                  marginBottom: 12,
                }}
              >
                {result.errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setResult(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
