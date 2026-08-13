"use client";

import { useFormikContext } from "formik";
import { DriverFormValues, EligibleUser } from "@/app/lib/type/driver";
import DriverFormSecondStep from "../shared/DriverFormSecondStep";

interface SecondDriverDialogStepProps {
  setStep: (step: number) => void;
  eligibleUsers: EligibleUser[];
}

const SecondDriverDialogStep = ({
  setStep,
  eligibleUsers,
}: SecondDriverDialogStepProps) => {
  const { values } = useFormikContext<DriverFormValues>();

  const selectedUser = eligibleUsers.find((u) => u.id === values.userId);
  const userSummary = selectedUser
    ? {
        name: selectedUser.name,
        surname: selectedUser.surname,
        email: selectedUser.email,
      }
    : null;

  return <DriverFormSecondStep setStep={setStep} userSummary={userSummary} />;
};

export default SecondDriverDialogStep;
