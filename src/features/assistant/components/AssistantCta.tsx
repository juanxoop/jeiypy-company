"use client";

import type { ComponentProps } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { openAssistant } from "../open";

type AssistantCtaProps = Omit<ComponentProps<typeof ButtonLink>, "href" | "onClick"> & {
  /** Mensaje con el que se abre la conversación. */
  message: string;
};

/**
 * CTA que abre Jeipy AI con un mensaje inicial. Sin JavaScript, lleva a la sección de contacto.
 */
export function AssistantCta({ message, ...props }: AssistantCtaProps) {
  return (
    <ButtonLink
      href="#contacto"
      onClick={(event) => {
        event.preventDefault();
        openAssistant(message);
      }}
      {...props}
    />
  );
}
