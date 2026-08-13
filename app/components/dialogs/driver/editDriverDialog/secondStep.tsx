"use client";

import { DriverWithRelations } from "@/app/lib/type/driver";
import DriverFormSecondStep from "../shared/DriverFormSecondStep";

interface SecondEditDriverDialogStepProps {
  setStep: (step: number) => void;
  driver: DriverWithRelations;
}

const SecondEditDriverDialogStep = ({
  setStep,
  driver,
}: SecondEditDriverDialogStepProps) => {
  const userSummary = {
    name: driver.user.name,
    surname: driver.user.surname,
    email: driver.user.email,
  };

  return <DriverFormSecondStep setStep={setStep} userSummary={userSummary} />;
};

export default SecondEditDriverDialogStep;
