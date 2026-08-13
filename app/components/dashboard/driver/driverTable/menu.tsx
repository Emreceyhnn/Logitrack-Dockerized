"use client";

import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useState } from "react";

interface DetailsMenuParams {
  handleOpenDetails: (id: string) => void;
  handleEdit: () => void;
  handleDelete: () => void;
  id: string;
}

const RowActions = (params: DetailsMenuParams) => {
  /* -------------------------------- variables ------------------------------- */
  const dict = useDictionary();
  /* --------------------------------- states --------------------------------- */
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>

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
          <ListItemText>{dict.drivers.actions.details}</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            params.handleEdit();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{dict.drivers.actions.edit}</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            params.handleDelete();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "error.main" }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{dict.drivers.actions.delete}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default RowActions;
