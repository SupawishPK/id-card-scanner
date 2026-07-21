import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "jelly-theme": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { mode?: string }, HTMLElement>;
      "jelly-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { variant?: string; onClick?: () => void }, HTMLElement>;
    }
  }
}
