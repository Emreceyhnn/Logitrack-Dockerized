"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Stack,
  Avatar,
  CircularProgress,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import { toast } from "sonner";
import { findCompaniesByDomain, createJoinRequest } from "@/app/lib/controllers/joinRequests";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface CompanyMatch {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface JoinCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: { id: string; companyName: string }) => void;
}

export default function JoinCompanyDialog({ open, onClose, onSuccess }: JoinCompanyDialogProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedId(null);
    findCompaniesByDomain()
      .then((results) => {
        setMatches(results);
        if (results.length > 0) setSelectedId(results[0]?.id ?? null);
      })
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedId) return;
    onClose();
    await toast.promise(
      createJoinRequest(selectedId).then((result) => {
        onSuccess?.(result);
      }),
      {
        loading: dict.toasts?.loading || "Sending request...",
        success: dict.toasts.successJoinRequestSent,
        error: (err: unknown) => (err instanceof Error ? err.message : dict.toasts.errorGeneric),
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {dict.onboarding.joinDialogTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dict.onboarding.joinDialogSubtitle}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : matches.length === 0 ? (
          <Stack alignItems="center" textAlign="center" spacing={1.5} py={3}>
            <BusinessIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            <Typography variant="subtitle1" fontWeight={700}>
              {dict.onboarding.joinNoMatchTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dict.onboarding.joinNoMatchDescription}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              {dict.onboarding.joinMatchesFound}
            </Typography>
            {matches.map((company) => {
              const selected = selectedId === company.id;
              return (
                <Stack
                  key={company.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  onClick={() => setSelectedId(company.id)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
                    bgcolor: selected ? `${theme.palette.primary.main}0f` : "transparent",
                  }}
                >
                  <Avatar src={company.avatarUrl || undefined} sx={{ width: 36, height: 36 }}>
                    <BusinessIcon fontSize="small" />
                  </Avatar>
                  <Typography fontWeight={600}>{company.name}</Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} sx={{ color: "text.secondary" }}>
          {dict.common.cancel}
        </Button>
        {matches.length > 0 && (
          <Button variant="contained" onClick={handleSubmit} disabled={!selectedId}>
            {dict.onboarding.joinSubmit}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
