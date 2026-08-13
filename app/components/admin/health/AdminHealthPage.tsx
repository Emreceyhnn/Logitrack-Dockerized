"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { RefreshCw } from "lucide-react";
import StatusBadge from "@/app/components/admin/shell/StatusBadge";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { ServiceHealth } from "@/app/lib/type/admin/shell";

interface AdminHealthPageProps {
  title: string;
  subtitle: string;
}

/**
 * tr-Sağlık kontrol matrisi sayfası.
 * en-Health Check Matrix. Probes every platform dependency and reports each
 *    one's status and latency. All values come from live probes — nothing here
 *    is mocked.
 * input (AdminHealthPageProps)
 * output (JSX.Element)
 */
export default function AdminHealthPage({
  title,
  subtitle,
}: AdminHealthPageProps) {
  const theme = useTheme();
  const dict = useDictionary();

  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { services?: ServiceHealth[] };
      setServices(data.services ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : dict.admin.common.error);
    } finally {
      setLoading(false);
    }
  }, [dict.admin.common.error]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography
            sx={{ color: theme.palette.text.secondary, fontSize: 14 }}
          >
            {subtitle}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshCw size={14} />}
          onClick={() => void load()}
          disabled={loading}
        >
          {dict.admin.common.refresh}
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => void load()}>
              {dict.admin.common.retry}
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
        }}
      >
        {loading && services.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card
                key={i}
                variant="outlined"
                sx={{ borderRadius: 2, borderColor: theme.palette.divider }}
              >
                <CardContent>
                  <Skeleton width="55%" height={22} />
                  <Skeleton width="35%" height={18} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            ))
          : services.map((service) => (
              <Card
                key={service.key}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: theme.palette.divider,
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: "blur(8px)",
                  transition: theme.transitions.create("border-color"),
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.35),
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      mb: 1.25,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                      {service.label}
                    </Typography>
                    <StatusBadge status={service.status} />
                  </Box>

                  <Typography
                    sx={{ fontSize: 12.5, color: theme.palette.text.secondary }}
                  >
                    {dict.admin.common.latency}:{" "}
                    {service.latencyMs === null ? "—" : `${service.latencyMs} ms`}
                  </Typography>

                  {service.detail && (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: theme.palette.text.secondary,
                        mt: 0.5,
                        opacity: 0.8,
                      }}
                    >
                      {service.detail}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
      </Box>
    </Box>
  );
}
