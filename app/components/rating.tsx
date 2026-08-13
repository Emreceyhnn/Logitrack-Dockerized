import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Stack } from "@mui/material";

interface CustomRatingProps {
  value: number;
  max?: number;
  size?: "small" | "medium" | "large";
}

const sizeMap = {
  small: { fontSize: 14, spacing: 0.25 },
  medium: { fontSize: 18, spacing: 0.5 },
  large: { fontSize: 24, spacing: 0.75 },
};

const CustomRating = ({
  value,
  max = 5,
  size = "medium",
}: CustomRatingProps) => {
  const stars = [];
  const { fontSize, spacing } = sizeMap[size];

  for (let i = 1; i <= max; i++) {
    if (value >= i) {
      stars.push(<StarIcon key={i} sx={{ color: "orange", fontSize }} />);
    } else if (value >= i - 0.5) {
      stars.push(<StarHalfIcon key={i} sx={{ color: "orange", fontSize }} />);
    } else {
      stars.push(<StarBorderIcon key={i} sx={{ color: "orange", fontSize }} />);
    }
  }

  return (
    <Stack direction="row" spacing={spacing}>
      {stars}
    </Stack>
  );
};

export default CustomRating;
