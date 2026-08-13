"use client";

import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type { DataTableRowAction } from "@/app/lib/type/dataTable";

interface RowMenuProps<TRow> {
  row: TRow;
  actions: DataTableRowAction<TRow>[];
}

export default function RowMenu<TRow>({ row, actions }: RowMenuProps<TRow>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const dict = useDictionary();
  const theme = useTheme();

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title={dict.common.tooltips?.actions || "Actions"} arrow>
        <IconButton
          size="medium"
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
          }}
          sx={{
            width: 38,
            height: 38,
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: "primary._alpha.main_10",
              color: "primary.main",
              transform: "rotate(90deg)",
            },
          }}
        >
          <MoreVertIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              minWidth: 180,
              mt: 1,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "background.paper"
                  : "common.white",
              border: `1px solid ${theme.palette.divider_alpha.main_10}`,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 8px 32px rgba(0,0,0,0.5)"
                  : "0 8px 32px rgba(0,0,0,0.08)",
              "& .MuiMenuItem-root": {
                px: 2,
                py: 1.2,
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 1.5,
                mx: 0.8,
                my: 0.4,
                transition: "all 0.2s ease",
                "&:hover": {
                  bgcolor: "primary._alpha.main_08",
                  color: "primary.main",
                },
              },
            },
          },
        }}
      >
        {actions
          .filter(
            (action: DataTableRowAction<TRow>) =>
              !action.hidden || !action.hidden(row)
          )
          .map((action: DataTableRowAction<TRow>, idx: number) => (
            <MenuItem
              key={idx}
              onClick={() => {
                handleClose();
                action.onClick(row);
              }}
              sx={{
                color:
                  action.color === "error"
                    ? "error.main"
                    : action.color === "warning"
                      ? "warning.main"
                      : "text.primary",
                fontSize: 14,
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    action.color === "error"
                      ? "error.main"
                      : action.color === "warning"
                        ? "warning.main"
                        : "text.secondary",
                  minWidth: 32,
                }}
              >
                {action.icon}
              </ListItemIcon>
              <ListItemText>{action.label}</ListItemText>
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}
