import Image from "next/image";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import { CompanyPageProps } from "@/app/lib/type/company";
import { useDateSettings } from "@/app/hooks/useDateSettings";
import { formatDisplayDate } from "@/app/lib/utils/date";

interface CompanyInfoCardProps {
  props: CompanyPageProps;
}

export default function CompanyInfoCard({ props }: CompanyInfoCardProps) {
  const dict = useDictionary();
  const dateSettings = useDateSettings();
  const { state } = props;
  const profile = state.data?.profile ?? null;
  const formattedDate = profile?.createdAt
    ? formatDisplayDate(profile.createdAt, dateSettings)
    : null;

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={3} alignItems="center">
          {profile === null ? (
            <Skeleton variant="circular" width={72} height={72} />
          ) : (
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: "primary.main",
                fontSize: 28,
              }}
            >
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.name || "Company Logo"}
                  width={72}
                  height={72}
                  style={{ objectFit: "cover" }}
                  priority
                  unoptimized
                />
              ) : (
                <BusinessIcon sx={{ fontSize: 36 }} />
              )}
            </Avatar>
          )}

          <Stack spacing={0.5} flex={1}>
            {profile === null ? (
              <>
                <Skeleton width={180} height={28} />
                <Skeleton width={140} height={18} />
              </>
            ) : (
              <>
                <Typography fontWeight={700} fontSize={20}>
                  {profile.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarTodayIcon
                    sx={{ fontSize: 14, color: "text.secondary" }}
                  />
                  <Typography fontSize={13} color="text.secondary">
                    {dict.company.info.created.replace(
                      "{date}",
                      formattedDate ?? ""
                    )}
                  </Typography>
                </Stack>
              </>
            )}
          </Stack>

          {profile !== null && (
            <Box>
              <Chip
                label={dict.company.info.active}
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
