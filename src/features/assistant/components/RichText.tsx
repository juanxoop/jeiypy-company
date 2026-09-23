import { Fragment } from "react";

/** Texto con párrafos (línea en blanco) y **negritas**. Sin HTML inyectado. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, p) => (
        <p key={p} className="[&+&]:mt-2.5">
          {paragraph.split("\n").map((line, l) => (
            <Fragment key={l}>
              {l > 0 && <br />}
              <InlineBold text={line} />
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

export function InlineBold({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-snow">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
