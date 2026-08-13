"use client";

import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  CircularProgress,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useState } from "react";
import { useRouteMutations } from "@/app/hooks/useRoutes";
import { RouteStatus } from "@/app/lib/type/enums";
import { useDictionary } from "@/app/lib/language/DictionaryContext";

interface RouteRowActionsProps {
  id: string;
  status: string;
  handleOpenDetails: (id: string) => void;
  handleEdit?: (id: string) => void;
  handleDelete?: (id: string) => void;
}

const RouteRowActions = ({
  id,
  status,
  handleOpenDetails,
  handleEdit,
  handleDelete,
}: RouteRowActionsProps) => {
  const dict = useDictionary();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { updateRouteStatus } = useRouteMutations();
  const open = Boolean(anchorEl);

  const handleStatusChange = (newStatus: RouteStatus) => {
    setAnchorEl(null);
    updateRouteStatus.mutate({ id, status: newStatus });
  };

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={updateRouteStatus.isPending}
      >
        {updateRouteStatus.isPending ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <MoreVertIcon fontSize="small" />
        )}
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
            backgroundImage: "none",
            borderRadius: "12px",
            minWidth: 180,
            border: `1px solid ${theme.palette.divider_alpha.main_10}`,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
            mt: 0.5,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            handleOpenDetails(id);
          }}
          sx={{ py: 1.5 }}
        >
          <ListItemIcon>
            <ContentPasteIcon
              fontSize="small"
              sx={{ color: "text.secondary" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
          >
            {dict.common.details}
          </ListItemText>
        </MenuItem>

        {status === "PLANNED" && (
          <MenuItem
            onClick={() => handleStatusChange("ACTIVE")}
            sx={{
              py: 1.5,
              color: theme.palette.success.main,
              "&:hover": { bgcolor: theme.palette.success._alpha.main_10 },
            }}
          >
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" sx={{ color: "inherit" }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
            >
              {dict.routes.table.actions.activate}
            </ListItemText>
          </MenuItem>
        )}

        {status === "ACTIVE" && (
          <MenuItem
            onClick={() => handleStatusChange("COMPLETED")}
            sx={{
              py: 1.5,
              color: theme.palette.primary.main,
              "&:hover": { bgcolor: theme.palette.primary._alpha.main_10 },
            }}
          >
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" sx={{ color: "inherit" }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
            >
              {dict.routes.table.actions.complete}
            </ListItemText>
          </MenuItem>
        )}

        {handleEdit && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleEdit(id);
            }}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
            >
              {dict.common.edit}
            </ListItemText>
          </MenuItem>
        )}

        {handleDelete && (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              handleDelete(id);
            }}
            sx={{
              py: 1.5,
              color: theme.palette.error.main,
              "&:hover": { bgcolor: theme.palette.error._alpha.main_10 },
            }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: "inherit" }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
            >
              {dict.common.delete}
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default RouteRowActions;
