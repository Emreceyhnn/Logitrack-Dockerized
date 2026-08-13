"use client";

import { Card, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow, IconButton, useTheme } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { StatusChip } from "../../../../chips/statusChips";
import { formatDisplayDate, DateSettings } from "@/app/lib/utils/date";

import { Dictionary } from "@/app/lib/language/language";

interface DocumentType {
  id: string;
  name: string;
  type: string;
  status: string;
  expiryDate?: string | Date | null;
  url: string;
}

interface ExtendedPalette {
  error?: {
    _alpha?: Record<string, string>;
  };
}

interface DocumentTableProps {
  dict: Dictionary;
  dateSettings: DateSettings;
  documents: DocumentType[];
  onViewDoc: (url: string, name: string) => void;
  onDownloadDoc: (url: string) => void;
  onDeleteClick: (id: string, name: string) => void;
}

export default function DocumentTable({ dict, dateSettings, documents, onViewDoc, onDownloadDoc, onDeleteClick }: DocumentTableProps) {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  return (
    <Stack sx={{ flexGrow: 2 }}>
      <Card sx={{ p: 2, borderRadius: "8px", gap: 2, bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", backgroundImage: "none", boxShadow: "none", border: `1px solid ${theme.palette.divider}` }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "text.secondary", borderBottomColor: "divider" }}>{dict.common.docType}</TableCell>
              <TableCell sx={{ color: "text.secondary", borderBottomColor: "divider" }}>{dict.common.status}</TableCell>
              <TableCell sx={{ color: "text.secondary", borderBottomColor: "divider" }}>{dict.common.expiryDate}</TableCell>
              <TableCell align="center" sx={{ color: "text.secondary", borderBottomColor: "divider" }}>{dict.common.actions}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ borderBottom: "none" }}>
                  <Typography variant="body2" color="text.secondary">{dict.common.noDocuments}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((v, index) => (
                <TableRow key={index} hover sx={{ cursor: "pointer", "&:hover": { bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" } }} onClick={() => onViewDoc(v.url, v.name)}>
                  <TableCell sx={{ borderBottom: index === documents.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}>
                    <Stack>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                        {dict.vehicles.docTypes[v.type as keyof typeof dict.vehicles.docTypes] || v.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 150 }}>{v.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ borderBottom: index === documents.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}>
                    <StatusChip status={v.status} />
                  </TableCell>
                  <TableCell sx={{ color: "text.primary", fontWeight: 600, borderBottom: index === documents.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}>
                    {v.expiryDate ? formatDisplayDate(v.expiryDate, dateSettings) : dict.common.na}
                  </TableCell>
                  <TableCell align="center" sx={{ borderBottom: index === documents.length - 1 ? "none" : `1px solid ${theme.palette.divider}` }}>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); onViewDoc(v.url, v.name); }}>
                        <VisibilityIcon sx={{ width: 20, height: 20 }} />
                      </IconButton>
                      <IconButton size="small" color="secondary" onClick={(e) => { e.stopPropagation(); onDownloadDoc(v.url); }} disabled={!v.url}>
                        <DownloadIcon sx={{ width: 20, height: 20 }} />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteClick(v.id, v.name); }} sx={{ color: paletteTheme.error?._alpha?.main_70, "&:hover": { color: theme.palette.error.main, bgcolor: paletteTheme.error?._alpha?.main_10 } }}>
                        <DeleteIcon sx={{ width: 20, height: 20 }} />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}
