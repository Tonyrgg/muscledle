"use client";

import Lottie from "lottie-react";
import fireAnimation from "../../../public/icons/fire.json";

type StreakFireIconProps = {
  active: boolean;
};

export function StreakFireIcon({ active }: StreakFireIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`shared-brand-header__tool-icon shared-brand-header__tool-icon--streak ${
        active ? "shared-brand-header__tool-icon--streak-active" : "shared-brand-header__tool-icon--streak-idle"
      }`.trim()}
    >
      {active ? (
        <Lottie
          animationData={fireAnimation}
          loop
          autoplay
          rendererSettings={{
            preserveAspectRatio: "xMidYMid meet",
          }}
          className="shared-brand-header__tool-icon-lottie"
        />
      ) : (
        <span className="shared-brand-header__tool-icon-fallback" />
      )}
    </span>
  );
}
