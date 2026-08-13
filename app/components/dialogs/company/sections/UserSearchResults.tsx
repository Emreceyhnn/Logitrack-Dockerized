"use client";

import { Box, Stack, Typography, Avatar, useTheme } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface SearchedUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

import { Dictionary } from "@/app/lib/language/language";

interface ExtendedPalette {
  primary?: {
    _alpha?: Record<string, string>;
  };
  divider_alpha?: Record<string, string>;
  text?: {
    primary_alpha?: Record<string, string>;
  };
  error?: {
    _alpha?: Record<string, string>;
  };
}

interface UserSearchResultsProps {
  results: SearchedUser[];
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
  error: string | null;
  dict: Dictionary;
}

export default function UserSearchResults({ results, selectedUserId, setSelectedUserId, error, dict }: UserSearchResultsProps) {
  const theme = useTheme();
  const paletteTheme = theme.palette as unknown as ExtendedPalette;

  return (
    <Box>
      {error && (
        <Typography variant="caption" sx={{ color: "error.main", bgcolor: paletteTheme.error?._alpha?.main_05, p: 1.5, borderRadius: 2, mb: 2, display: "block", border: `1px solid ${paletteTheme.error?._alpha?.main_10}` }}>
          {error}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", mt: 4, mb: 1, display: "block" }}>
        {dict.company.dialogs.searchResults}
      </Typography>
      <Stack spacing={1}>
        {results.map((user, index) => {
          const isSelected = selectedUserId === user.id;
          return (
            <Box
              key={`${user.id}-${index}`}
              onClick={() => setSelectedUserId(isSelected ? null : user.id)}
              sx={{
                p: 1.5, borderRadius: 2.5, display: "flex", alignItems: "center", gap: 2, cursor: "pointer",
                border: `1px solid ${isSelected ? theme.palette.primary.main : paletteTheme.divider_alpha?.main_05}`,
                bgcolor: isSelected ? paletteTheme.primary?._alpha?.main_05 : "transparent",
                transition: "all 0.2s ease",
                "&:hover": { bgcolor: isSelected ? paletteTheme.primary?._alpha?.main_08 : paletteTheme.text?.primary_alpha?.main_02 },
              }}
            >
              <Box sx={{ position: "relative" }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: "grey.800" }}>{user.name.charAt(0)}</Avatar>
                {isSelected && (
                  <CheckCircleIcon sx={{ position: "absolute", bottom: -2, right: -2, fontSize: 18, color: "primary.main", bgcolor: "background.paper", borderRadius: "50%" }} />
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{user.name}</Typography>
                <Typography variant="caption" color="text.secondary">{user.email}</Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
