import { Avatar, Box, Typography } from "@mui/material";
import CustomRating from "./rating";

interface Props {
  avatarUrl: string;
  name: string;
  surname: string;
  rating: number;
  size?: "small" | "medium" | "large";
}

const sizeConfig = {
  small: {
    avatar: { width: 32, height: 32 },
    gap: 0.75,
    typography: "caption" as const,
    ratingSize: "small" as const,
  },
  medium: {
    avatar: { width: 40, height: 40 },
    gap: 1,
    typography: "body2" as const,
    ratingSize: "medium" as const,
  },
  large: {
    avatar: { width: 56, height: 56 },
    gap: 1.5,
    typography: "body1" as const,
    ratingSize: "large" as const,
  },
};

export default function DriverAvatar({
  avatarUrl,
  name,
  surname,
  rating,
  size = "medium",
}: Props) {
  const config = sizeConfig[size];

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: config.gap }}>
      <Avatar src={avatarUrl} sx={config.avatar} />
      <Box>
        <Typography variant={config.typography}>
          {name} {surname}
        </Typography>
        <CustomRating value={rating} size={config.ratingSize} />
      </Box>
    </Box>
  );
}
