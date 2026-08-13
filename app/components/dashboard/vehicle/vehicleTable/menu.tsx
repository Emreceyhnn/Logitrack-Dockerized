"use client";

import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import { useState } from "react";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface DetailsMenuParams {
  handleOpenDetails: (id: string) => void;
  handleEdit?: (id: string) => void;
  handleDelete?: (id: string) => void;
  id: string;
}

const RowActions = (params: DetailsMenuParams) => {
  const dict = useDictionary();
  /* --------------------------------- states --------------------------------- */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={dict.common.tooltips?.actions || "Actions"}>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            width: 38,
            height: 38,
            "&:hover": {
              bgcolor: "primary._alpha.main_10",
              color: "primary.main",
            },
            transition: "all 0.2s ease",
          }}
        >
          <MoreVertIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        sx={{
          "& .MuiPaper-paper": {
            backgroundColor: "background.paper",
            borderRadius: 1,
            minWidth: 140,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            params.handleOpenDetails(params.id);
          }}
        >
          <ListItemIcon>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{dict.common.details}</ListItemText>
        </MenuItem>

        {params.handleEdit && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              params.handleEdit?.(params.id);
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{dict.common.edit}</ListItemText>
          </MenuItem>
        )}

        {params.handleDelete && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              params.handleDelete?.(params.id);
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>{dict.common.delete}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default RowActions;
