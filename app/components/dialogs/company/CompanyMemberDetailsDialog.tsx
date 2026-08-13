import {
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
  Box,
  Avatar,
  Chip,
  Grid,
  Button,
  useTheme,
} from "@mui/material";
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import { CompanyMember } from "@/app/lib/type/company";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";

interface CompanyMemberDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  member: CompanyMember | null;
}

export default function CompanyMemberDetailsDialog({
  open,
  onClose,
  member,
}: CompanyMemberDetailsDialogProps) {
  const dict = useDictionary();
  const theme = useTheme();
  const dateSettings = useDateSettings();

  if (!member) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundImage: "none",
          border: `1px solid ${theme.palette.divider_alpha.main_10}`,
          overflow: "hidden",
        },
      }}
    >
      <Box sx={{ p: 3, pb: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar
              src={member.avatarUrl || undefined}
              sx={{
                width: 80,
                height: 80,
                fontSize: "2rem",
                fontWeight: 700,
                bgcolor: "theme.palette.primary._alpha.main_10",
                color: "primary.main",
                borderRadius: 3,
              }}
            >
              {!member.avatarUrl && `${member.name[0]}${member.surname[0]}`}
            </Avatar>
            <Stack spacing={0.5}>
              <Typography variant="h5" fontWeight={800} color="white">
                {member.name} {member.surname}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={member.roleName || dict.company.memberDetails.noRole}
                  size="small"
                  sx={{
                    bgcolor: "theme.palette.secondary._alpha.main_10",
                    color: "secondary.light",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    border: `1px solid theme.palette.secondary._alpha.main_20`,
                  }}
                />
                <Chip
                  label={
                    (
                      dict.company.editMember.statuses as Record<string, string>
                    )[member.status] || member.status
                  }
                  size="small"
                  color={member.status === "ACTIVE" ? "success" : "warning"}
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                />
              </Stack>
            </Stack>
          </Stack>
          <IconButton onClick={onClose} sx={{ color: "text.secondary" }} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      <DialogContent sx={{ mt: 4, p: 4, pt: 0 }}>
        <Grid container spacing={4}>
          <Grid size={12}>
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "theme.palette.background.paper_alpha.main_03",
                border: `1px solid theme.palette.divider_alpha.main_05`,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={800}
                color="text.secondary"
                sx={{
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  mb: 2,
                  display: "block",
                }}
              >
                {dict.company.memberDetails.contactInfo}
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "theme.palette.info._alpha.main_10",
                      color: "info.main",
                    }}
                  >
                    <EmailIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {dict.company.memberDetails.emailAddress}
                    </Typography>
                    <Typography variant="body2" color="white" fontWeight={500}>
                      {member.email}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "theme.palette.success._alpha.main_10",
                      color: "success.main",
                    }}
                  >
                    <EventIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {dict.company.memberDetails.joinedSince}
                    </Typography>
                    <Typography variant="body2" color="white" fontWeight={500}>
                      {formatDisplayDate(member.createdAt, dateSettings)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
          </Grid>

          <Grid size={12}>
            <Box
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: "theme.palette.warning._alpha.main_03",
                border: `1px solid theme.palette.warning._alpha.main_05`,
              }}
            >
              <Typography
                variant="caption"
                fontWeight={800}
                color="warning.light"
                sx={{
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  mb: 1.5,
                  display: "block",
                }}
              >
                {dict.company.memberDetails.adminData}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.85rem", lineHeight: 1.6 }}
              >
                {dict.company.memberDetails.adminDataDesc.split("{role}")[0]}
                <strong>{dict.company?.roles?.[member.roleName as keyof typeof dict.company.roles] || member.roleName || dict.company?.roles?.["read-only"] || "read-only"}</strong>
                {dict.company.memberDetails.adminDataDesc.split("{role}")[1]}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: `1px solid theme.palette.divider_alpha.main_10`,
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{
              borderRadius: 2,
              py: 1.2,
              fontWeight: 700,
              textTransform: "none",
              color: "text.secondary",
              borderColor: "theme.palette.divider_alpha.main_20",
              "&:hover": {
                borderColor: "text.primary",
                color: "text.primary",
                bgcolor: "theme.palette.common.white_alpha.main_02",
              },
            }}
          >
            {dict.company.memberDetails.closeView}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
