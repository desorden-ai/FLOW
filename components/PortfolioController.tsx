"use client";

import { useRef, type ReactNode } from "react";
import { usePortfolioMenu } from "./usePortfolioMenu";
import { usePortfolioModal } from "./usePortfolioModal";
import { usePortfolioNavigation } from "./usePortfolioNavigation";

export function PortfolioController({ children, sceneCount }: { children: ReactNode; sceneCount: number }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { closeMenu } = usePortfolioMenu(rootRef);
  usePortfolioModal(rootRef);
  usePortfolioNavigation(rootRef, sceneCount, closeMenu);

  return <main ref={rootRef} className="site-shell">{children}</main>;
}
