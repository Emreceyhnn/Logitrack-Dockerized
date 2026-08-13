"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Divider,
  Tabs,
  Tab,
  useTheme,

  CircularProgress,
} from "@mui/material";
import { Person as PersonIcon, Lock as LockIcon } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";

import { useProfile, useProfileMutations } from "@/app/hooks/useProfile";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import {
  ProfilePageState,
  ProfilePageActions,
} from "@/app/lib/type/profile";

// Extracted Components
import ProfileHeader from "./components/ProfileHeader";
import ProfileTab from "./components/ProfileTab";
import SecurityTab from "./components/SecurityTab";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProfileDialog({ open, onClose }: Props) {
  const theme = useTheme();
  const dict = useDictionary();

  const { data: profile, isLoading, refetch } = useProfile(open);
  const { updateProfile, changePassword } = useProfileMutations();

  const [activeTab, setActiveTabState] = useState(0);
  const [profileForm, setProfileForm] = useState({
    name: "",
    surname: "",
    email: "",
    avatarUrl: null as string | null,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // The query is the source of truth; mirror it into local form state whenever
  // it changes (initial load, optimistic patch, or post-save refetch) so the
  // fields reflect in-flight optimistic values too.
  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      name: profile.name,
      surname: profile.surname,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    });
  }, [profile]);

  const state: ProfilePageState = {
    user: profile ?? null,
    activeTab,
    isLoading,
    isSaving: updateProfile.isPending || changePassword.isPending,
    error: null,
    profileForm,
    passwordForm,
  };

  const actions: ProfilePageActions = {
    setActiveTab: useCallback((tab) => setActiveTabState(tab), []),
    updateProfileForm: useCallback(
      (data) => setProfileForm((s) => ({ ...s, ...data })),
      []
    ),
    updatePasswordForm: useCallback(
      (data) => setPasswordForm((s) => ({ ...s, ...data })),
      []
    ),
    saveProfile: useCallback(async () => {
      try {
        await updateProfile.mutateAsync({
          name: profileForm.name,
          surname: profileForm.surname,
          avatarUrl: profileForm.avatarUrl,
        });
        toast.success(dict.profile.messages.saveSuccess);
        window.dispatchEvent(new Event("profile-updated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : dict.profile.messages.networkError);
      }
    }, [profileForm, updateProfile, dict.profile.messages.saveSuccess, dict.profile.messages.networkError]),
    changePassword: useCallback(async () => {
      try {
        await changePassword.mutateAsync({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        toast.success(dict.profile.messages.passwordSuccess);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : dict.profile.messages.verificationError);
      }
    }, [passwordForm, changePassword, dict.profile.messages.passwordSuccess, dict.profile.messages.verificationError]),
    refresh: useCallback(async () => {
      await refetch();
    }, [refetch]),
  };

  const tabs = [
    { label: dict.profile.tabs.account, icon: <PersonIcon sx={{ fontSize: 16 }} /> },
    { label: dict.profile.tabs.security, icon: <LockIcon sx={{ fontSize: 16 }} /> },
  ];

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            overflow: "hidden",
          },
        }}
      >
        <ProfileHeader onClose={onClose} />

        <Box sx={{ px: 3, mt: 2 }}>
          <Tabs
            value={state.activeTab}
            onChange={(_, v) => actions.setActiveTab(v)}
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                minHeight: 44,
                color: "text.secondary",
                gap: 1,
                transition: "all 0.2s",
                "&.Mui-selected": { color: "text.primary" },
                "&:hover": { color: "text.primary" },
              },
              "& .MuiTabs-indicator": {
                bgcolor: theme.palette.primary.main,
                borderRadius: "3px 3px 0 0",
                height: 3,
                boxShadow: `0 0 12px ${theme.palette.primary._alpha.main_50}`,
              },
            }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>
          <Divider sx={{ borderColor: theme.palette.divider_alpha.main_08 }} />
        </Box>

        <DialogContent sx={{ px: 3, pt: 3.5, pb: 4, minHeight: 420 }}>
          {state.isLoading ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              py={10}
              gap={2}
            >
              <CircularProgress
                size={40}
                thickness={4.5}
                sx={{ color: theme.palette.primary.main }}
              />
              <Box
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  letterSpacing: 1,
                }}
              >
                {dict.profile.status.synchronizing}
              </Box>
            </Box>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={state.activeTab}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                }}
              >
                {state.activeTab === 0 && (
                  <ProfileTab state={state} actions={actions} />
                )}
                {state.activeTab === 1 && (
                  <SecurityTab state={state} actions={actions} />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
