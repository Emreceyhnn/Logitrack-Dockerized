"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  Divider,
  List,
  ListItem,
  Stack,
  Button,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Notifications as NotifIcon,
  NotificationsActive as NotifActiveIcon,
  Delete as DeleteIcon,
  CheckCircle as ReadIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { useUser } from "@/app/hooks/useUser";
import { AuthenticatedUser } from "@/app/lib/auth-middleware";
import { getStatusColor, resolveStatusAlpha } from "@/app/lib/priorityColor";
import { formatSmartTimestamp } from "@/app/lib/utils/date";
import { useNotifications } from "@/app/hooks/useNotifications";
import { getLocalizedNotification } from "@/app/lib/language/notificationTranslator";
import { useLanguage } from "@/app/lib/language/DictionaryContext";

export default function NotificationBell({}: {
  user: AuthenticatedUser | null;
}) {
  const theme = useTheme();
  const dict = useDictionary();
  const { lang } = useLanguage();
  const dateSettings = useDateSettings();
  const { user: contextUser } = useUser();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();

  const open = Boolean(anchorEl);

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(contextUser || undefined);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // tr-Bildirime tıklandığında ilgili kaydın detayına gidilir. Linkler dil ön eki olmadan
  //    saklanır (`/shipments?id=...`), çünkü hangi dilde okunacağı yazıldığı anda belli
  //    değil; ön eki burada, kullanıcının o anki diline göre ekliyoruz.
  // en-Clicking a notification navigates to the record it refers to. Links are stored without
  //    a locale prefix (`/shipments?id=...`) since the reading locale isn't known at write
  //    time; we prepend it here from the user's current language.
  const handleNotificationClick = (notif: (typeof notifications)[number]) => {
    if (!notif.isRead) markAsRead(notif);
    if (!notif.link) return;
    handleClose();
    router.push(`/${lang}${notif.link}`);
  };

  return (
    <>
      <Tooltip title={dict.notifications.title}>
        <IconButton
          onClick={handleOpen}
          sx={{
            color:
              unreadCount > 0
                ? theme.palette.primary.main
                : theme.palette.text.secondary,
            bgcolor:
              unreadCount > 0
                ? theme.palette.primary._alpha.main_05
                : theme.palette.action.hover,
            border: `1px solid ${
              unreadCount > 0
                ? theme.palette.primary._alpha.main_10
                : theme.palette.divider
            }`,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              bgcolor: theme.palette.primary._alpha.main_10,
              borderColor: theme.palette.primary._alpha.main_30,
              transform: "translateY(-1px)",
            },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            overlap="circular"
            sx={{
              "& .MuiBadge-badge": {
                fontWeight: 900,
                fontSize: "0.6rem",
                minWidth: 16,
                height: 16,
                padding: "0 4px",
                boxShadow: "0 0 10px rgba(244, 63, 94, 0.5)",
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotifActiveIcon sx={{ fontSize: 22 }} />
            ) : (
              <NotifIcon sx={{ fontSize: 22 }} />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 2,
            width: 380,
            maxHeight: 520,
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: theme.palette.background.paper,
            backdropFilter: "blur(20px)",
            border: `1px solid ${theme.palette.divider}`,
            boxShadow:
              theme.palette.mode === "dark"
                ? "0 25px 50px -12px rgba(0, 0, 0, 0.6)"
                : "0 25px 50px -12px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={800}
            color="text.primary"
            sx={{ letterSpacing: "-0.02em" }}
          >
            {dict.notifications.title}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon />}
              onClick={markAllAsRead}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                color: theme.palette.primary.main,
                fontSize: "0.75rem",
                "&:hover": { bgcolor: theme.palette.primary._alpha.main_10 },
              }}
            >
              {dict.notifications.catchUp}
            </Button>
          )}
        </Box>

        <Divider sx={{ borderColor: theme.palette.divider }} />

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 1.5,
            py: 1,
            /* Custom Scrollbar */
            "&::-webkit-scrollbar": {
              width: "5px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              background: theme.palette.divider,
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: theme.palette.text.secondary,
            },
            /* Scroll indicator fade */
            maskImage:
              notifications.length > 4
                ? "linear-gradient(to bottom, black 90%, transparent 100%)"
                : "none",
            WebkitMaskImage:
              notifications.length > 4
                ? "linear-gradient(to bottom, black 90%, transparent 100%)"
                : "none",
          }}
        >
          {loading ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {dict.notifications.initializing}
              </Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", opacity: 0.3 }}>
              <NotifIcon sx={{ fontSize: 40, mb: 1, color: "text.primary" }} />
              <Typography variant="body2" color="text.primary">
                {dict.notifications.systemClear}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notif) => {
                const { title, message } = getLocalizedNotification(
                  notif.title,
                  notif.message,
                  lang
                );

                return (
                  <ListItem
                    key={notif.id}
                    disablePadding
                    onClick={
                      notif.link
                        ? () => handleNotificationClick(notif)
                        : undefined
                    }
                    sx={{
                      mb: 1,
                      borderRadius: 3,
                      transition: "all 0.2s",
                      position: "relative",
                      cursor: notif.link ? "pointer" : "default",
                      bgcolor: notif.isRead
                        ? "transparent"
                        : theme.palette.action.hover,
                      border: "1px solid",
                      borderColor: notif.isRead
                        ? "transparent"
                        : theme.palette.divider,
                      "&:hover": {
                        bgcolor: theme.palette.action.hover,
                        borderColor: resolveStatusAlpha(notif.type),
                      },
                    }}
                  >
                  <Box
                    sx={{
                      width: 4,
                      height: "60%",
                      borderRadius: 1,
                      position: "absolute",
                      left: 6,
                      bgcolor: getStatusColor(notif.type),
                      opacity: notif.isRead ? 0.3 : 1,
                    }}
                  />
                  <Stack sx={{ p: 2, pl: 3, width: "100%" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: notif.isRead ? 600 : 800,
                          color: "text.primary",
                          fontSize: "0.85rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {title}
                      </Typography>
                      <Stack direction="row">
                        {!notif.isRead && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              // tr-Satırın yönlendirmesini tetiklemesin
                              // en-Don't trigger the row's navigation
                              e.stopPropagation();
                              markAsRead(notif);
                            }}
                            sx={{ color: theme.palette.primary.main, p: 0.5 }}
                          >
                            <ReadIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif);
                          }}
                          sx={{
                            color: theme.palette.text.secondary,
                            opacity: 0.3,
                            p: 0.5,
                            "&:hover": {
                              color: theme.palette.error.main,
                              opacity: 1,
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        mb: 1,
                        fontSize: "0.8rem",
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        opacity: notif.isRead ? 0.7 : 1,
                      }}
                    >
                      {message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        opacity: 0.5,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                      }}
                    >
                      {formatSmartTimestamp(notif.createdAt, dateSettings)}
                    </Typography>
                  </Stack>
                </ListItem>
              );
            })}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
